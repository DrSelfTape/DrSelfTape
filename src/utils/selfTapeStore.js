// Local cache for self-tape video files. iOS-only — on web (and Android,
// for now) every operation is a no-op so callers can use the same module
// without platform branching at the call site.
//
// We mirror the dynamic-import pattern used by purchases.js so the web
// bundle never pulls in @capacitor/filesystem. On iOS we store files in
// the app's Documents directory under `self-tapes/<localId>.<ext>` so
// recordings survive app reinstalls (Documents is backed up; Cache is
// purgeable). Each cached entry has a sidecar `.meta.json` with the
// filename, mime type, size, and original tape title — enough to render
// the card and re-enqueue an upload after a cold boot.
//
// Local IDs use the `local_<nano>` pattern so they never collide with
// backend integer PKs.

import { Capacitor } from '@capacitor/core';
import { nanoid } from 'nanoid';

const ROOT_DIR = 'self-tapes';

export function isIOSNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

// Delete every locally-cached self-tape video. Called on logout AND account
// deletion so a device never retains a prior user's on-camera PII (Apple
// 5.1.1 permanent-deletion). No-op on web/Android where nothing is cached.
export async function wipeAllLocalTapes() {
  if (!isIOSNative()) return;
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.rmdir({ path: ROOT_DIR, directory: Directory.Documents, recursive: true });
  } catch { /* dir absent or FS unavailable — nothing to wipe */ }
}

export function makeLocalTapeId() {
  return `local_${nanoid(12)}`;
}

let fsPromise = null;
function loadFS() {
  if (!isIOSNative()) return null;
  if (!fsPromise) {
    fsPromise = import('@capacitor/filesystem').then((m) => m);
  }
  return fsPromise;
}

// Capacitor Filesystem uses base64 strings on iOS. We pick the smallest
// chunk size we can get away with — 5 MB — to keep memory usage bounded
// for long recordings. (Native plugin chunking would be nicer; we're
// trading a bit of CPU here for not pulling in a streaming polyfill.)
const CHUNK_BYTES = 5 * 1024 * 1024;

function blobToBase64Chunks(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.onload = () => {
      // Result looks like "data:video/mp4;base64,AAAA..." — strip the prefix.
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

async function ensureRootDir(Filesystem, Directory) {
  try {
    await Filesystem.mkdir({
      path: ROOT_DIR,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (e) {
    // mkdir throws if the dir already exists — that's fine.
    if (!/exist/i.test(e?.message || '')) {
      // Re-throw on anything that doesn't look like "already exists".
      throw e;
    }
  }
}

function extensionFromMime(mime, fallback = 'mp4') {
  if (!mime) return fallback;
  const m = String(mime).toLowerCase();
  if (m.includes('quicktime')) return 'mov';
  if (m.includes('webm')) return 'webm';
  if (m.includes('matroska')) return 'mkv';
  if (m.includes('ogg')) return 'ogv';
  return 'mp4';
}

/**
 * Save a video blob to the local cache. Returns the localTapeId and the
 * on-disk metadata so the caller can render the tape immediately.
 * No-ops (returns null) off iOS native.
 */
export async function saveLocalTape(blob, meta = {}) {
  if (!isIOSNative()) return null;
  const mod = await loadFS();
  if (!mod) return null;
  const { Filesystem, Directory } = mod;

  await ensureRootDir(Filesystem, Directory);

  const localId = meta.localId || makeLocalTapeId();
  const ext = extensionFromMime(blob.type || meta.mimeType);
  const path = `${ROOT_DIR}/${localId}.${ext}`;

  // Stream the blob to disk in chunks. First chunk does a `writeFile`
  // (which truncates), subsequent chunks `appendFile`.
  let offset = 0;
  let first = true;
  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK_BYTES, blob.size);
    const slice = blob.slice(offset, end, blob.type);
    // Sequential awaits in this loop are intentional — we're writing
    // chunks to disk in order and don't want to overlap fs writes.
    const b64 = await blobToBase64Chunks(slice);
    if (first) {
      await Filesystem.writeFile({
        path, directory: Directory.Documents, data: b64, recursive: true,
      });
      first = false;
    } else {
      await Filesystem.appendFile({
        path, directory: Directory.Documents, data: b64,
      });
    }
    offset = end;
  }

  const metaPath = `${ROOT_DIR}/${localId}.meta.json`;
  const sidecar = {
    localId,
    path,
    mimeType: blob.type || meta.mimeType || 'video/mp4',
    size: blob.size,
    title: meta.title || '',
    projectName: meta.projectName || '',
    roleName: meta.roleName || '',
    createdAt: new Date().toISOString(),
  };
  await Filesystem.writeFile({
    path: metaPath,
    directory: Directory.Documents,
    data: btoa(JSON.stringify(sidecar)),
    recursive: true,
  });

  return sidecar;
}

/**
 * Get a blob URL for a cached tape (suitable for a <video> src). Caller
 * is responsible for revoking the URL when done. Returns null off iOS or
 * if the file no longer exists.
 */
export async function getLocalTapeBlobUrl(localId) {
  if (!isIOSNative() || !localId) return null;
  const mod = await loadFS();
  if (!mod) return null;
  const { Filesystem, Directory } = mod;
  try {
    const meta = await readMeta(Filesystem, Directory, localId);
    if (!meta) return null;
    const res = await Filesystem.readFile({
      path: meta.path,
      directory: Directory.Documents,
    });
    // res.data is base64 on iOS. Do NOT atob() it into a JS string — for a
    // 500 MB tape that materializes a ~500 MB byte-string + a Uint8Array and
    // OOM-crashes WKWebView on cold-boot resume. Instead hand the base64 to
    // the browser as a data: URL and let fetch() decode it straight into a
    // Blob with no giant intermediate JS string.
    const blob = await base64ToBlob(res.data, meta.mimeType);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Decode a base64 payload to a Blob WITHOUT materializing the whole thing as
 * a JS string via atob(). The browser decodes the data: URL natively, so a
 * 500 MB tape never becomes a 500 MB JS string — this is the cold-boot
 * OOM-crash fix.
 */
async function base64ToBlob(b64, mimeType) {
  const type = mimeType || 'application/octet-stream';
  const dataUrl = `data:${type};base64,${b64}`;
  const resp = await fetch(dataUrl);
  return resp.blob();
}

/**
 * Get the cached blob (not a URL) — handy for re-enqueueing an upload
 * after a cold boot. Returns null if the file's been deleted.
 */
export async function getLocalTapeBlob(localId) {
  if (!isIOSNative() || !localId) return null;
  const mod = await loadFS();
  if (!mod) return null;
  const { Filesystem, Directory } = mod;
  try {
    const meta = await readMeta(Filesystem, Directory, localId);
    if (!meta) return null;
    const res = await Filesystem.readFile({
      path: meta.path,
      directory: Directory.Documents,
    });
    // See base64ToBlob: never atob() the whole tape — a 500 MB recording
    // OOM-crashes WKWebView. Decode via a data: URL + fetch instead.
    const blob = await base64ToBlob(res.data, meta.mimeType);
    return { blob, meta };
  } catch {
    return null;
  }
}

async function readMeta(Filesystem, Directory, localId) {
  try {
    const res = await Filesystem.readFile({
      path: `${ROOT_DIR}/${localId}.meta.json`,
      directory: Directory.Documents,
    });
    const json = atob(res.data);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * List every locally cached tape (id + meta only). Empty array off iOS.
 */
export async function listLocalTapes() {
  if (!isIOSNative()) return [];
  const mod = await loadFS();
  if (!mod) return [];
  const { Filesystem, Directory } = mod;
  try {
    const res = await Filesystem.readdir({
      path: ROOT_DIR,
      directory: Directory.Documents,
    });
    const files = res?.files || [];
    const ids = new Set();
    for (const f of files) {
      const name = f?.name || (typeof f === 'string' ? f : '');
      const m = /^(local_[a-zA-Z0-9_-]+)\.meta\.json$/.exec(name);
      if (m) ids.add(m[1]);
    }
    const out = [];
    for (const id of ids) {
      const meta = await readMeta(Filesystem, Directory, id);
      if (meta) out.push(meta);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Delete a cached tape's video AND sidecar. Safe to call on a missing
 * id — it just no-ops. Returns true on success.
 */
export async function deleteLocalTape(localId) {
  if (!isIOSNative() || !localId) return false;
  const mod = await loadFS();
  if (!mod) return false;
  const { Filesystem, Directory } = mod;
  const meta = await readMeta(Filesystem, Directory, localId);
  const targets = [];
  if (meta?.path) targets.push(meta.path);
  targets.push(`${ROOT_DIR}/${localId}.meta.json`);
  for (const path of targets) {
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Documents });
    } catch {
      /* file might already be gone — ignore */
    }
  }
  return true;
}
