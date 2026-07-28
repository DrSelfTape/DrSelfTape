import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Upload, Send, X, Film, Calendar, Clock, Check,
  Loader2, AlertCircle, HardDriveDownload, Pencil, Trash2,
} from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { isIOSNative, saveLocalTape, deleteLocalTape, makeLocalTapeId, listLocalTapes } from '../../../utils/selfTapeStore';
import { openExternal } from '../../../utils/openExternal';
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

  // Portal to body so the modal escapes the panel's `.aurora-orbs` stacking
  // context — otherwise the top bar + bottom tab bar (both fixed at z=50)
  // paint over the modal's X / Cancel buttons.
  //
  // Top-align (items-start) + dvh-bounded max-height + internal scroll so the
  // iOS keyboard can cover the bottom of the screen without hiding fields.
  // 100dvh tracks the visual viewport (shrinks when keyboard is up).
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center"
      style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px', background: 'rgba(48,41,31,0.32)' }}
    >
      <div
        className="aurora-card p-6 w-full max-w-md overflow-y-auto"
        style={{
          background: 'var(--aurora-glass-strong)',
          borderColor: 'var(--aurora-glass-border)',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 32px)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>
            Upload Self-Tape
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--aurora-dim)' }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* iOS-only: opt-in cached-first toggle. Hidden on web so the
              existing flow is the only path available there. */}
          {iosNative && (
            <label
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
              style={{ background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)' }}
            >
              <input
                type="checkbox"
                checked={saveLocallyFirst}
                onChange={(e) => setSaveLocallyFirst(e.target.checked)}
                className="w-4 h-4 accent-[var(--aurora-heritage-gold)]"
              />
              <span className="text-sm" style={{ color: 'var(--aurora-text)' }}>
                Save locally first (faster)
              </span>
              <span className="text-[11px] ml-auto" style={{ color: 'var(--aurora-dim)' }}>
                Uploads in the background
              </span>
            </label>
          )}

          {/* File Input — label-based so the file picker is triggered by the
              native click on the input itself. iOS WKWebView blocks programmatic
              .click() on display:none inputs, so we keep the input in layout
              but visually hidden via opacity. */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--aurora-sub)' }}>
              Video File *
            </label>
            <label
              className="block w-full rounded-xl px-4 py-3 text-sm text-left transition-colors cursor-pointer"
              style={{
                background: 'var(--aurora-glass)',
                color: file ? 'var(--aurora-text)' : 'var(--aurora-dim)',
                border: '1px solid var(--aurora-glass-border)',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              />
              {file ? `${file.name} (${fileMb} MB)` : 'Choose a video file...'}
            </label>
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--aurora-dim)' }}>
              Max {maxMb} MB per tape
              {quota?.tape_count_cap != null && (
                <> · {quota.tape_count}/{quota.tape_count_cap} tapes used on the {quota.plan} plan</>
              )}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--aurora-sub)' }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Callback Take 2"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--aurora-glass)',
                color: 'var(--aurora-text)',
                border: '1px solid var(--aurora-glass-border)',
              }}
            />
          </div>

          {/* Project Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--aurora-sub)' }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. The Morning Show"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--aurora-glass)',
                color: 'var(--aurora-text)',
                border: '1px solid var(--aurora-glass-border)',
              }}
            />
          </div>

          {/* Role Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--aurora-sub)' }}>
              Role Name
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--aurora-glass)',
                color: 'var(--aurora-text)',
                border: '1px solid var(--aurora-glass-border)',
              }}
            />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--aurora-rose)' }}>{error}</p>}

          {uploading && !saveLocallyFirst && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--aurora-sub)' }}>
                <span>Uploading…</span>
                <span className="aurora-mono">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--aurora-glass)' }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress}%`, background: 'var(--aurora-heritage-gold)' }}
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
              background: 'var(--aurora-glass)',
              color: 'var(--aurora-sub)',
              border: '1px solid var(--aurora-glass-border)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || fileTooBig || !file || !title.trim()}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)' }}
          >
            {uploading
              ? (saveLocallyFirst ? 'Saving…' : `Uploading… ${progress}%`)
              : (iosNative && saveLocallyFirst ? 'Save & Upload' : 'Upload')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center"
      style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px', background: 'rgba(48,41,31,0.32)' }}
    >
      <div
        className="aurora-card p-6 w-full max-w-md overflow-y-auto"
        style={{
          background: 'var(--aurora-glass-strong)',
          borderColor: 'var(--aurora-glass-border)',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 32px)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>
            Submit to Casting
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--aurora-dim)' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--aurora-sub)' }}>
          Where are you submitting "{tape.title}"?
        </p>

        <input
          type="text"
          value={submittedTo}
          onChange={(e) => setSubmittedTo(e.target.value)}
          placeholder="e.g. Sarah Jones Casting, Actors Access"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
          style={{
            background: 'var(--aurora-glass)',
            color: 'var(--aurora-text)',
            border: '1px solid var(--aurora-glass-border)',
          }}
        />

        {done ? (
          <p className="text-center text-sm text-[var(--aurora-mint)] font-semibold py-3">
            Submitted!
          </p>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
              style={{
                background: 'var(--aurora-glass)',
                color: 'var(--aurora-sub)',
                border: '1px solid var(--aurora-glass-border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !submittedTo.trim()}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)' }}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Render the small status chip on a tape card. `syncState` is one of
// 'synced' (default), 'uploading', 'pending', 'failed'.
function SyncChip({ syncState, progress, onRetry }) {
  if (!syncState || syncState === 'synced') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(167,236,218,0.15)', color: 'var(--aurora-mint)' }}
      >
        <Check className="w-3 h-3" /> Synced
      </span>
    );
  }
  if (syncState === 'uploading') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(212,168,95,0.18)', color: 'var(--aurora-heritage-gold)' }}
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
        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--aurora-dim)' }}
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
        style={{ background: 'rgba(255,130,128,0.15)', color: 'var(--aurora-rose)' }}
      >
        <AlertCircle className="w-3 h-3" /> Failed. Retry
      </button>
    );
  }
  return null;
}

// iOS WKWebView tap belt — onTouchEnd + preventDefault + touch-action so
// these small icon buttons don't depend on the flaky global click rescue.
const _iconBtn = {
  background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
};

function TapeCard({
  tape, onPlay, onSubmitCasting, syncState, syncProgress, onRetry, onFreeUpSpace,
  onDelete, onRename,
}) {
  const isLocalOnly = !tape.id && !!tape.localId;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(tape.title || '');
  const saveRename = () => {
    const t = draftTitle.trim();
    setEditing(false);
    if (t && t !== tape.title) onRename?.(tape, t);
    else setDraftTitle(tape.title || '');
  };
  return (
    <div
      className="aurora-card overflow-hidden"
      style={{ background: 'var(--aurora-glass-strong)', borderColor: 'var(--aurora-glass-border)' }}
    >
      {/* Video thumbnail / placeholder */}
      <div
        className="relative h-40 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, rgba(167,236,218,0.20), rgba(240,208,151,0.24))' }}
      >
        {tape.thumbnail ? (
          <img src={tape.thumbnail} alt={tape.title} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-10 h-10" style={{ color: 'rgba(122,90,24,0.40)' }} />
        )}
        <button
          onClick={() => onPlay(tape)}
          className="absolute inset-0 flex items-center justify-center transition-colors group"
          style={{ background: 'rgba(48,41,31,0.18)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ background: 'color-mix(in srgb, var(--aurora-heritage-gold) 90%, transparent)' }}
          >
            <Play className="w-5 h-5 ml-0.5" style={{ color: 'var(--aurora-text)' }} fill="currentColor" />
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
            className="absolute top-2 left-2 p-1.5 rounded-full transition-colors"
            style={{ background: 'var(--aurora-glass-strong)' }}
            title="Free up space: keep cloud copy, delete local cache"
          >
            <HardDriveDownload className="w-3.5 h-3.5" style={{ color: 'var(--aurora-text)' }} />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { setEditing(false); setDraftTitle(tape.title || ''); } }}
              className="flex-1 text-sm font-semibold px-2 py-1 rounded-md outline-none"
              style={{ background: 'var(--aurora-glass)', color: 'var(--aurora-text)', border: '1px solid var(--aurora-glass-border)' }}
            />
            <button type="button" title="Save" onClick={saveRename} onTouchEnd={(e) => { e.preventDefault(); saveRename(); }} style={_iconBtn}>
              <Check className="w-4 h-4" style={{ color: 'var(--aurora-accent-deep)' }} />
            </button>
            <button type="button" title="Cancel" onClick={() => { setEditing(false); setDraftTitle(tape.title || ''); }} onTouchEnd={(e) => { e.preventDefault(); setEditing(false); setDraftTitle(tape.title || ''); }} style={_iconBtn}>
              <X className="w-4 h-4" style={{ color: 'var(--aurora-dim)' }} />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate flex-1" style={{ color: 'var(--aurora-text)' }}>
              {tape.title}
            </h3>
            {!isLocalOnly && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" title="Rename" onClick={() => setEditing(true)} onTouchEnd={(e) => { e.preventDefault(); setEditing(true); }} style={_iconBtn}>
                  <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--aurora-dim)' }} />
                </button>
                <button type="button" title="Delete" onClick={() => setConfirmDelete(true)} onTouchEnd={(e) => { e.preventDefault(); setConfirmDelete(true); }} style={_iconBtn}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--aurora-dim)' }} />
                </button>
              </div>
            )}
          </div>
        )}
        {confirmDelete && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: 'var(--aurora-sub)' }}>Delete this tape?</span>
            <button type="button" onClick={() => { setConfirmDelete(false); onDelete?.(tape); }} onTouchEnd={(e) => { e.preventDefault(); setConfirmDelete(false); onDelete?.(tape); }}
              className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: 'var(--aurora-rose)', color: 'var(--aurora-bg)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', border: 'none' }}>
              Delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} onTouchEnd={(e) => { e.preventDefault(); setConfirmDelete(false); }}
              className="text-xs px-2 py-1" style={{ color: 'var(--aurora-dim)', background: 'transparent', border: 'none', touchAction: 'manipulation' }}>
              Cancel
            </button>
          </div>
        )}

        {tape.project_name && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--aurora-sub)' }}>
            {tape.project_name}
            {tape.role_name ? ` - ${tape.role_name}` : ''}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {tape.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" style={{ color: 'var(--aurora-dim)' }} />
                <span className="aurora-mono text-[11px]" style={{ color: 'var(--aurora-dim)' }}>
                {tape.duration}
              </span>
            </div>
          )}
          {tape.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" style={{ color: 'var(--aurora-dim)' }} />
              <span className="aurora-mono text-[11px]" style={{ color: 'var(--aurora-dim)' }}>
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
              background: 'var(--aurora-glass)',
              color: 'var(--aurora-text)',
              border: '1px solid var(--aurora-glass-border)',
            }}
          >
            <Play className="w-3.5 h-3.5" />
            Play
          </button>
          <button
            onClick={() => onSubmitCasting(tape)}
            disabled={isLocalOnly}
            className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)' }}
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
    // Reconcile the local-copy map against the on-device cache. The cache is
    // keyed by localTapeId, which equals a synced tape's idempotency_key, so
    // this lets the "free up space" affordance reflect reality after a reload
    // (the queue-subscription only marks copies for the current session).
    listLocalTapes()
      .then((metas) => {
        if (!Array.isArray(metas) || metas.length === 0) return;
        setHasLocalCopy((prev) => {
          const next = { ...prev };
          for (const m of metas) {
            const id = m?.localId;
            if (id) next[id] = true;
          }
          return next;
        });
      })
      .catch(() => {});
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
      openExternal(tape.video_url);
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

  const handleDeleteTape = async (tape) => {
    if (!tape.id) return; // local-only rows are handled by free-up-space
    const prev = tapes;
    setTapes((cur) => cur.filter((t) => t.id !== tape.id)); // optimistic
    try {
      const res = await axios.delete(`${baseURL}/v1/growth/self-tapes/${tape.id}/`);
      if (res?.data?.data?.quota) setQuota(res.data.data.quota);
    } catch {
      setTapes(prev); // restore on failure
      fetchTapes();
    }
  };

  const handleRenameTape = async (tape, newTitle) => {
    const title = (newTitle || '').trim();
    if (!tape.id || !title || title === tape.title) return;
    setTapes((cur) => cur.map((t) => (t.id === tape.id ? { ...t, title } : t))); // optimistic
    try {
      await axios.patch(`${baseURL}/v1/growth/self-tapes/${tape.id}/`, { title });
    } catch {
      fetchTapes(); // reconcile on failure
    }
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
          <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)' }}>
            My Self-Tapes
          </h1>
          {quota && (
            <p className="aurora-mono text-xs mt-1" style={{ color: 'var(--aurora-dim)' }}>
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
          className="text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)' }}
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
              className="aurora-card animate-pulse h-64"
              style={{ background: 'var(--aurora-glass-strong)' }}
            />
          ))}
        </div>
      ) : mergedTapes.length === 0 ? (
        <div
          className="aurora-card p-12 text-center"
          style={{ background: 'var(--aurora-glass-strong)', borderColor: 'var(--aurora-glass-border)' }}
        >
          <Film className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--aurora-dim)' }} />
          <p className="text-sm" style={{ color: 'var(--aurora-dim)' }}>
            No self-tapes yet. Upload your first recording!
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)' }}
          >
            Upload Self-Tape
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mergedTapes.map((tape) => {
            // A local-pending row carries `localId`; a synced server row does
            // not — but its `idempotency_key` IS the local cache key (same id
            // the upload was keyed by). Resolve both so the local-copy lookup
            // below actually hits for synced cloud tapes.
            const localId = tape.localId || tape.idempotency_key || null;
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
                onDelete={handleDeleteTape}
                onRename={handleRenameTape}
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
