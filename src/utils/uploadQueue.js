// Background upload queue for self-tapes (and anything else that wants
// background-uploaded multipart forms in future).
//
// Persistence: we deliberately do NOT use redux-persist here because we
// can't store a File/Blob in the redux state tree (it'd JSON.stringify
// to {}). Instead we persist *metadata only* under the existing
// per-user `userStorage` namespace at `upload_queue`. The actual Blob
// for each pending task lives in the local cache via selfTapeStore —
// when we resume after a cold boot we look the blob back up by
// localTapeId.
//
// Concurrency: one upload at a time. Self-tapes are big and most users
// are on cellular while uploading; saturating the pipe makes the
// progress UI useless.
//
// Retry: 3 attempts with 0s/2s/8s backoff. Only retry on network errors
// (no response, ERR_NETWORK, ECONNABORTED). 4xx is user-fixable (413
// too big, 402 over quota, 401 auth) — surfacing those instantly is
// the right call. 5xx we retry once then give up; the user can press
// "retry" on the card.

import axios from '../redux/http';
import { baseURL } from '../redux/constant';
import { getUserJSON, setUserJSON, getCurrentUserId } from './userStorage';
import { getLocalTapeBlob } from './selfTapeStore';

const QUEUE_KEY = 'upload_queue';
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 2000, 8000];

const subscribers = new Set();

// In-memory state.  Each task:
//   { localTapeId, fields: { title, project_name, role_name, ... },
//     status: 'pending' | 'uploading' | 'done' | 'failed',
//     progress: 0..100, attempts: 0, error: '' | null,
//     queuedAt: ISOString }
//
// `fields` is everything we need to rebuild the FormData later. The
// video blob is fetched from selfTapeStore by localTapeId at upload time
// so we never serialize binary data.
let tasks = [];
let activeId = null;
let processing = false;
// Per-task in-memory callbacks. NOT persisted — re-attached when the
// UI re-subscribes after a boot.
const liveCallbacks = new Map();

function loadFromDisk() {
  const userId = getCurrentUserId();
  const stored = getUserJSON(userId, QUEUE_KEY, null);
  if (Array.isArray(stored)) {
    // Reset any task that was mid-upload when the tab closed back to
    // pending; we'll redrive it on next tick.
    tasks = stored.map((t) => ({
      ...t,
      status: t.status === 'uploading' ? 'pending' : t.status,
      progress: t.status === 'uploading' ? 0 : (t.progress || 0),
    }));
  }
}

function saveToDisk() {
  const userId = getCurrentUserId();
  // Strip in-memory-only fields before persisting.
  const slim = tasks.map(({ localTapeId, fields, status, progress, attempts, error, queuedAt }) => (
    { localTapeId, fields, status, progress, attempts, error, queuedAt }
  ));
  setUserJSON(userId, QUEUE_KEY, slim);
}

function notify() {
  for (const fn of subscribers) {
    try { fn(getQueueSnapshot()); } catch { /* ignore */ }
  }
}

export function subscribe(fn) {
  subscribers.add(fn);
  // Fire immediately so the new subscriber sees current state.
  try { fn(getQueueSnapshot()); } catch { /* ignore */ }
  return () => subscribers.delete(fn);
}

export function getQueueSnapshot() {
  return tasks.map((t) => ({ ...t }));
}

export function getTask(localTapeId) {
  return tasks.find((t) => t.localTapeId === localTapeId) || null;
}

/**
 * Enqueue an upload. `fields` is everything except the video blob —
 * { title, project_name, role_name, ... }. The blob is fetched at
 * upload time from selfTapeStore by localTapeId so the queue stays
 * JSON-serializable.
 */
export function enqueueUpload({ localTapeId, fields, onProgress, onSuccess, onFailure }) {
  if (!localTapeId) throw new Error('enqueueUpload requires localTapeId');
  let task = getTask(localTapeId);
  if (!task) {
    task = {
      localTapeId,
      fields: fields || {},
      status: 'pending',
      progress: 0,
      attempts: 0,
      error: null,
      queuedAt: new Date().toISOString(),
    };
    tasks.push(task);
  } else {
    // Re-enqueue (user pressed "retry")
    task.status = 'pending';
    task.progress = 0;
    task.attempts = 0;
    task.error = null;
    if (fields) task.fields = { ...task.fields, ...fields };
  }
  liveCallbacks.set(localTapeId, { onProgress, onSuccess, onFailure });
  saveToDisk();
  notify();
  drain();
  return task;
}

/**
 * Re-attach UI callbacks to an existing task (e.g. after a remount).
 */
export function attachCallbacks(localTapeId, callbacks) {
  liveCallbacks.set(localTapeId, callbacks || {});
}

/**
 * Remove a task from the queue. If it's currently uploading, the
 * in-flight request will still finish but its results will be ignored.
 */
export function removeTask(localTapeId) {
  tasks = tasks.filter((t) => t.localTapeId !== localTapeId);
  liveCallbacks.delete(localTapeId);
  if (activeId === localTapeId) activeId = null;
  saveToDisk();
  notify();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runOne(task) {
  const cb = liveCallbacks.get(task.localTapeId) || {};
  task.attempts += 1;
  task.status = 'uploading';
  task.progress = 0;
  task.error = null;
  saveToDisk();
  notify();

  // Re-hydrate the blob from local cache. If it's gone (user freed
  // space), we can't recover — surface a clear failure.
  const cached = await getLocalTapeBlob(task.localTapeId);
  if (!cached?.blob) {
    task.status = 'failed';
    task.error = 'Local cache missing — cannot resume upload.';
    saveToDisk();
    notify();
    try { cb.onFailure?.(new Error(task.error)); } catch { /* */ }
    return;
  }

  const form = new FormData();
  // Match the filename the iOS recorder would have produced so the
  // backend keeps a recognizable basename in R2.
  const filename = cached.meta?.title
    ? `${cached.meta.title}.${(cached.meta.mimeType || 'video/mp4').split('/').pop()}`
    : `tape.${(cached.meta?.mimeType || 'video/mp4').split('/').pop()}`;
  form.append('video', cached.blob, filename);
  for (const [k, v] of Object.entries(task.fields || {})) {
    if (v != null && v !== '') form.append(k, v);
  }

  try {
    const res = await axios.post(
      `${baseURL}/v1/growth/self-tapes/upload/`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded * 100) / evt.total);
          task.progress = pct;
          // Persist sparingly — every 10% — so we don't thrash
          // localStorage on a 500 MB upload.
          if (pct % 10 === 0) saveToDisk();
          notify();
          try { cb.onProgress?.(pct); } catch { /* */ }
        },
      },
    );
    task.status = 'done';
    task.progress = 100;
    saveToDisk();
    notify();
    try { cb.onSuccess?.(res?.data); } catch { /* */ }
    // Successful tasks are kept in the queue briefly so the UI can
    // observe the 'done' state, then pruned.
    setTimeout(() => removeTask(task.localTapeId), 5000);
  } catch (err) {
    const httpStatus = err?.response?.status;
    const networkLike = !err?.response
      || err?.code === 'ERR_NETWORK'
      || err?.code === 'ECONNABORTED';

    const retriable = networkLike || (httpStatus >= 500 && httpStatus < 600);
    const moreAttempts = task.attempts < MAX_ATTEMPTS;

    if (retriable && moreAttempts) {
      const wait = BACKOFF_MS[Math.min(task.attempts, BACKOFF_MS.length - 1)];
      task.status = 'pending';
      saveToDisk();
      notify();
      await sleep(wait);
      // Loop back into the drain by leaving status='pending'.
      return runOne(task);
    }

    task.status = 'failed';
    task.error = err?.response?.data?.message
      || (networkLike ? 'Network dropped during upload.' : 'Upload failed.');
    saveToDisk();
    notify();
    try { cb.onFailure?.(err); } catch { /* */ }
  }
}

async function drain() {
  if (processing) return;
  processing = true;
  try {
    while (true) {
      const next = tasks.find((t) => t.status === 'pending');
      if (!next) break;
      activeId = next.localTapeId;
      // Sequential awaits in this loop are intentional — we upload one
      // tape at a time. See the "Concurrency" note at the top.
      await runOne(next);
      activeId = null;
    }
  } finally {
    processing = false;
  }
}

/**
 * Read persisted state from localStorage and kick the queue if there's
 * pending work. Call this on app boot from App.jsx.
 */
export function resumeQueue() {
  loadFromDisk();
  notify();
  // Kick the pump on the next tick so anything subscribing during the
  // current render flush sees the loaded state first.
  setTimeout(drain, 0);
}

/**
 * Clear the queue entirely (e.g. on logout). Does NOT delete cached
 * blobs — that's the caller's call.
 */
export function clearQueue() {
  tasks = [];
  liveCallbacks.clear();
  activeId = null;
  saveToDisk();
  notify();
}
