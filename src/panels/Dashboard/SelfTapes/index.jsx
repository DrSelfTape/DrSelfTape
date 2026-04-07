import { useEffect, useState, useRef } from 'react';
import { Play, Upload, Send, X, Film, Calendar, Clock } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

function UploadModal({ onClose, onUploaded }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      setError('Please select a video and enter a title.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title.trim());
      if (projectName.trim()) formData.append('project_name', projectName.trim());
      if (roleName.trim()) formData.append('role_name', roleName.trim());

      await axios.post(`${baseURL}/v1/growth/self-tapes/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded();
      onClose();
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
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
          {/* File Input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Video File *
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
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
              {file ? file.name : 'Choose a video file...'}
            </button>
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
            disabled={uploading}
            className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
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
              className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TapeCard({ tape, onPlay, onSubmitCasting }) {
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
          <Film className="w-10 h-10 text-[#C855F0]/40" />
        )}
        <button
          onClick={() => onPlay(tape)}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-[#C855F0]/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </button>
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
            className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
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

  const fetchTapes = () => {
    setLoading(true);
    axios
      .get(`${baseURL}/v1/growth/self-tapes/`)
      .then((res) => setTapes(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTapes();
  }, []);

  const handlePlay = (tape) => {
    if (tape.video_url) {
      window.open(tape.video_url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          My Self-Tapes
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#C855F0] hover:bg-[#A040C8] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
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
      ) : tapes.length === 0 ? (
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
            className="mt-4 bg-[#C855F0] hover:bg-[#A040C8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Upload Self-Tape
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tapes.map((tape) => (
            <TapeCard
              key={tape.id}
              tape={tape}
              onPlay={handlePlay}
              onSubmitCasting={setSubmitTape}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={fetchTapes} />
      )}

      {/* Submit Modal */}
      {submitTape && (
        <SubmitModal tape={submitTape} onClose={() => setSubmitTape(null)} />
      )}
    </div>
  );
}
