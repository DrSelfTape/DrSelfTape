import { useEffect, useState, useRef } from 'react';
import {
  Play, Upload, Send, X, Film, Calendar, Clock, Check,
  Loader2, AlertCircle, HardDriveDownload,
} from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { isIOSNative, saveLocalTape, deleteLocalTape, makeLocalTapeId } from '../../../utils/selfTapeStore';
import {
  enqueueUpload, subscribe as subscribeQueue, getQueueSnapshot,
} from '../../../utils/uploadQueue';

// Mirrors apps.growth.views.MAX_SELF_TAPE_SIZE_MB. Kept in sync via
// the /quota/ endpoint at runtime so this constant is just a sensible
// fallback before that loads.
const DEFAULT_MAX_MB = 500;

function UploadModal({ onClose, onUploaded, onLocalEnqueued, quota }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  // Opt-in for the new cached-first path. Off by default so existing
  // behavior is preserved. Only meaningful on iOS — hidden on web.
  const [saveLocallyFirst, setSaveLocallyFirst] = useState(false);
  const iosNative = isIOSNative();

  const maxMb = quota?.per_tape_max_mb ?? DEFAULT_MAX_MB;
  const fileMb = file ? (file.size / (1024 * 1024)).toFixed(1) : null;
  const fileTooBig = file && file.size > maxMb * 1024 * 1024;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && f.size > maxMb * 1024 * 1024) {
      const mb = (f.size / (1024 * 1024)).toFixed(1);
      setError(`This file is ${mb} MB. The max per tape is ${maxMb} MB. Try compressing it first or recording at 1080p instead of 4K.`);
    } else {
      setError('');
    }
  };

  const handleSubmitDirect = async () => {
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title.trim());
      if (projectName.trim()) formData.append('project_name', projectName.trim());
      if (roleName.trim()) formData.append('role_name', roleName.trim());

      await axios.post(`${baseURL}/v1/growth/self-tapes/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });
      onUploaded();
      onClose();
    } catch (err) {
      // Surface the backend's actual reason instead of "Upload failed."
      // Common cases: 413 (too big), 402 (over plan quota), 502 (R2).
      const msg = err?.response?.data?.message
        || (err?.code === 'ERR_NETWORK'
          ? 'Network dropped during upload. Check your connection and try again.'
          : 'Upload failed. Please try again.');
      setError(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSubmitCachedFirst = async () => {
    // Cached-first: write the blob to local cache, render the tape
    // immediately, then hand the upload off to the background queue.
    // We close the modal as soon as the local save is done — the queue
    // handles the network half independent of the modal lifecycle.
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      const localId = makeLocalTapeId();
      const meta = await saveLocalTape(file, {
        localId,
        title: title.trim(),
        projectName: projectName.trim(),
        roleName: roleName.trim(),
      });
      if (!meta) {
        // Shouldn't happen — we checked isIOSNative before — but bail
        // safely if the filesystem write returned nothing.
        throw new Error('Could not save locally. Falling back to direct upload.');
      }
      enqueueUpload({
        localTapeId: localId,
        fields: {
          title: title.trim(),
          project_name: projectName.trim(),
          role_name: roleName.trim(),
        },
      });
      onLocalEnqueued?.({
        localId,
        title: title.trim(),
        projectName: projectName.trim(),
        roleName: roleName.trim(),
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not stage the upload locally.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      setError('Please select a video and enter a title.');
      return;
    }
    if (fileTooBig) return; // Already showed the size error.
    if (iosNative && saveLocallyFirst) {
      await handleSubmitCachedFirst();
    } else {
      await handleSubmitDirect();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="rounded-2xl p-6 w-full max-w-md border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Upload Self-Tape
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* iOS-only: opt-in cached-first toggle. Hidden on web so the
              existing flow is the only path available there. */}
          {iosNative && (
            <label
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <input
                type="checkbox"
                checked={saveLocallyFirst}
                onChange={(e) => setSaveLocallyFirst(e.target.checked)}
                className="w-4 h-4 accent-[#D4A85F]"
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Save locally first (faster)
              </span>
              <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                Uploads in the background
              </span>
            </label>
          )}

          {/* File Input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Video File *
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl px-4 py-3 text-sm text-left transition-colors"
              style={{
                background: 'var(--bg-surface)',
                color: file ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              {file ? `${file.name} (${fileMb} MB)` : 'Choose a video file...'}
            </button>
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Max {maxMb} MB per tape
              {quota?.tape_count_cap != null && (
                <> · {quota.tape_count}/{quota.tape_count_cap} tapes used on the {quota.plan} plan</>
              )}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Callback Take 2"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>

          {/* Project Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. The Morning Show"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>

          {/* Role Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Role Name
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {uploading && !saveLocallyFirst && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-surface)' }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress}%`, background: '#D4A85F' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || fileTooBig || !file || !title.trim()}
            className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {uploading
              ? (saveLocallyFirst ? 'Saving…' : `Uploading… ${progress}%`)
              : (iosNative && saveLocallyFirst ? 'Save & Upload' : 'Upload')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitModal({ tape, onClose }) {
  const [submittedTo, setSubmittedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!submittedTo.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${baseURL}/v1/growth/self-tapes/${tape.id}/submit/`, {
        submitted_to: submittedTo.trim(),
      });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      /* handle error */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="rounded-2xl p-6 w-full max-w-md border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Submit to Casting
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Where are you submitting "{tape.title}"?
        </p>

        <input
          type="text"
          value={submittedTo}
          onChange={(e) => setSubmittedTo(e.target.value)}
          placeholder="e.g. Sarah Jones Casting, Actors Access"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
        />

        {done ? (
          <p className="text-center text-sm text-[#A7ECDA] font-semibold py-3">
            Submitted!
          </p>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !submittedTo.trim()}
              className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Render the small status chip on a tape card. `syncState` is one of
// 'synced' (default), 'uploading', 'pending', 'failed'.
function SyncChip({ syncState, progress, onRetry }) {
  if (!syncState || syncState === 'synced') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(167,236,218,0.15)', color: '#A7ECDA' }}
      >
        <Check className="w-3 h-3" /> Synced
      </span>
    );
  }
  if (syncState === 'uploading') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(212,168,95,0.18)', color: '#D4A85F' }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Uploading… {Number.isFinite(progress) ? `${progress}%` : ''}
      </span>
    );
  }
  if (syncState === 'pending') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
      >
        Pending sync
      </span>
    );
  }
  if (syncState === 'failed') {
    return (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
      >
        <AlertCircle className="w-3 h-3" /> Failed — retry
      </button>
    );
  }
  return null;
}

function TapeCard({
  tape, onPlay, onSubmitCasting, syncState, syncProgress, onRetry, onFreeUpSpace,
}) {
  const isLocalOnly = !tape.id && !!tape.localId;
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      {/* Video thumbnail / placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f23] flex items-center justify-center">
        {tape.thumbnail ? (
          <img src={tape.thumbnail} alt={tape.title} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-10 h-10 text-[#7A5A18]/40" />
        )}
        <button
          onClick={() => onPlay(tape)}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-[#D4A85F]/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-[#0A0A0A] ml-0.5" fill="white" />
          </div>
        </button>
        {/* Sync chip overlays the thumbnail top-right */}
        <div className="absolute top-2 right-2">
          <SyncChip syncState={syncState} progress={syncProgress} onRetry={onRetry} />
        </div>
        {/* Free up space affordance — only shown for synced tapes that
            ALSO have a local cache copy. */}
        {syncState === 'synced' && tape.hasLocalCopy && (
          <button
            onClick={(e) => { e.stopPropagation(); onFreeUpSpace?.(tape); }}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            title="Free up space — keep cloud copy, delete local cache"
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-white/80" />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {tape.title}
        </h3>

        {tape.project_name && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {tape.project_name}
            {tape.role_name ? ` - ${tape.role_name}` : ''}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {tape.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {tape.duration}
              </span>
            </div>
          )}
          {tape.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {new Date(tape.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onPlay(tape)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Play className="w-3.5 h-3.5" />
            Play
          </button>
          <button
            onClick={() => onSubmitCasting(tape)}
            disabled={isLocalOnly}
            className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelfTapes() {
  const [tapes, setTapes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [submitTape, setSubmitTape] = useState(null);
  const [quota, setQuota] = useState(null);
  // Local pending/uploading tapes that don't yet exist on the server.
  // Keyed by localId. Merged into the rendered list above server tapes.
  const [localPending, setLocalPending] = useState([]);
  // Snapshot of the upload queue for chip rendering.
  const [queueByLocalId, setQueueByLocalId] = useState({});
  // Which server-side tapes also have a local cache copy (only set on
  // iOS — built from the queue's "done" task list as we observe them).
  const [hasLocalCopy, setHasLocalCopy] = useState({});

  const fetchTapes = () => {
    setLoading(true);
    axios
      .get(`${baseURL}/v1/growth/self-tapes/`)
      .then((res) => {
        const arr = res.data?.data ?? res.data?.results ?? res.data;
        setTapes(Array.isArray(arr) ? arr : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchQuota = () => {
    axios
      .get(`${baseURL}/v1/growth/self-tapes/quota/`)
      .then((res) => setQuota(res.data?.data ?? null))
      .catch(() => {});
  };

  useEffect(() => {
    fetchTapes();
    fetchQuota();
  }, []);

  // Subscribe to the upload queue. When a task moves to 'done' we
  // refetch the server list to pick up the newly-created tape row, and
  // we mark the row as having a local cache copy so the "free up space"
  // affordance shows.
  useEffect(() => {
    const unsub = subscribeQueue((snap) => {
      const byId = {};
      for (const t of snap) byId[t.localTapeId] = t;
      setQueueByLocalId(byId);

      // Has any task transitioned to 'done' since we last looked?
      const doneIds = snap.filter((t) => t.status === 'done').map((t) => t.localTapeId);
      if (doneIds.length) {
        // Refetch the server list — the upload created a new row.
        fetchTapes();
        fetchQuota();
        // Remember these local IDs have a cached copy on disk.
        setHasLocalCopy((prev) => {
          const next = { ...prev };
          for (const id of doneIds) next[id] = true;
          return next;
        });
        // The local-pending row should drop now that the server one is
        // canonical.
        setLocalPending((prev) => prev.filter((p) => !doneIds.includes(p.localId)));
      }
    });
    return unsub;
  }, []);

  // Pick up any pending tasks that were resumed at app boot (page
  // reload mid-upload). We treat each one as a local-pending row.
  useEffect(() => {
    const snap = getQueueSnapshot();
    if (!snap.length) return;
    setLocalPending((prev) => {
      const known = new Set(prev.map((p) => p.localId));
      const additions = snap
        .filter((t) => t.status !== 'done')
        .filter((t) => !known.has(t.localTapeId))
        .map((t) => ({
          localId: t.localTapeId,
          title: t.fields?.title || 'Resuming upload…',
          project_name: t.fields?.project_name || '',
          role_name: t.fields?.role_name || '',
          created_at: t.queuedAt,
        }));
      return [...additions, ...prev];
    });
  }, []);

  const handlePlay = (tape) => {
    if (tape.video_url) {
      window.open(tape.video_url, '_blank');
    }
  };

  const handleLocalEnqueued = ({ localId, title, projectName, roleName }) => {
    setLocalPending((prev) => [
      {
        localId,
        title,
        project_name: projectName,
        role_name: roleName,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleRetry = (localId) => {
    // Re-enqueue with the same fields. enqueueUpload handles the
    // "already in queue" case by resetting status + attempts.
    const task = queueByLocalId[localId];
    if (!task) return;
    enqueueUpload({ localTapeId: localId, fields: task.fields });
  };

  const handleFreeUpSpace = async (tape) => {
    // Only meaningful when there's a local copy AND a cloud URL — we
    // delete the local file, leaving the cloud as the play source.
    const localId = tape.__localId;
    if (!localId) return;
    await deleteLocalTape(localId);
    setHasLocalCopy((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  // Merge local-pending tapes (not yet on the server) above the server
  // tapes for rendering. Local rows have a synthetic shape mirroring
  // what the server returns, with `localId` flagging them as such.
  const mergedTapes = [
    ...localPending.map((p) => ({
      ...p,
      id: null,
      localId: p.localId,
      video_url: null,
      thumbnail: null,
    })),
    ...tapes,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            My Self-Tapes
          </h1>
          {quota && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {quota.tape_count}
              {quota.tape_count_cap != null && ` / ${quota.tape_count_cap}`}
              {' tapes · '}
              {quota.used_mb} MB
              {quota.storage_cap_mb != null && ` / ${quota.storage_cap_mb} MB`}
              {' used'}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl h-64"
              style={{ background: 'var(--bg-card)' }}
            />
          ))}
        </div>
      ) : mergedTapes.length === 0 ? (
        <div
          className="rounded-2xl p-12 border text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <Film className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No self-tapes yet. Upload your first recording!
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Upload Self-Tape
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mergedTapes.map((tape) => {
            const localId = tape.localId;
            const task = localId ? queueByLocalId[localId] : null;
            // Sync state precedence: an in-flight queue task wins. A
            // server-side tape with no task is 'synced'.
            let syncState = 'synced';
            let syncProgress;
            if (task) {
              if (task.status === 'uploading') {
                syncState = 'uploading';
                syncProgress = task.progress;
              } else if (task.status === 'failed') {
                syncState = 'failed';
              } else if (task.status === 'pending') {
                syncState = 'pending';
              }
            }
            const cardKey = tape.id ? `s${tape.id}` : `l${localId}`;
            return (
              <TapeCard
                key={cardKey}
                tape={{
                  ...tape,
                  hasLocalCopy: localId ? !!hasLocalCopy[localId] : false,
                  __localId: localId,
                }}
                syncState={syncState}
                syncProgress={syncProgress}
                onPlay={handlePlay}
                onSubmitCasting={setSubmitTape}
                onRetry={() => handleRetry(localId)}
                onFreeUpSpace={handleFreeUpSpace}
              />
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          quota={quota}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { fetchTapes(); fetchQuota(); }}
          onLocalEnqueued={handleLocalEnqueued}
        />
      )}

      {/* Submit Modal */}
      {submitTape && (
        <SubmitModal tape={submitTape} onClose={() => setSubmitTape(null)} />
      )}
    </div>
  );
}
