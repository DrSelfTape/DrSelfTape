import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { Plus, Search, FileText, Trash2, Mic, Sparkles } from 'lucide-react';
import {
  fetchScriptsThunk,
  createScriptThunk,
  deleteScriptThunk,
} from '../../../redux/features/scripts/scriptsSlice';

import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return pages.join('\n');
}

function parseCharacterCount(content) {
  if (!content) return 0;
  const names = new Set();
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Z][A-Z\s.''-]{0,40}):\s*/);
    if (m) names.add(m[1].trim());
  }
  return names.size;
}

function countLines(content) {
  if (!content) return 0;
  return content.split('\n').filter((l) => l.trim()).length;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const SCRIPT_PHOTOS = [
  '/photos/audition-hall-hamlet.png',
  '/photos/audition-wait-32.png',
  '/photos/class-table.png',
  '/photos/night-study.png',
  '/photos/partners-table.png',
  '/photos/street-script.png',
];

function pickScriptPhoto(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return SCRIPT_PHOTOS[Math.abs(h) % SCRIPT_PHOTOS.length];
}

const inputStyle = {
  background: 'var(--aurora-surface-solid)',
  color: 'var(--aurora-text)',
  border: '1px solid var(--aurora-line)',
  borderRadius: 10,
};

const goldGradient = {
  background: 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
  color: '#FFF',
  boxShadow: '0 8px 20px rgba(212,168,95,0.25)',
};

// ─── Add Script Modal ────────────────────────────────────────────
function AddScriptModal({ onClose, onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [tab, setTab] = useState('upload');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.pdf')) {
      setFileError('Please upload a .pdf or .txt file.');
      return;
    }
    setFileError('');
    setFileName(file.name);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.(pdf|txt)$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }

    if (name.endsWith('.pdf')) {
      setPdfLoading(true);
      try {
        const text = await extractPdfText(file);
        setContent(text);
      } catch {
        setFileError('Could not parse PDF — try a different file or paste your script.');
        setFileName('');
      } finally {
        setPdfLoading(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim() });
  };

  const dropzoneStyle = {
    border: dragActive ? '2px dashed var(--aurora-heritage-gold)' : '2px dashed var(--aurora-line)',
    background: dragActive ? 'rgba(212,168,95,0.06)' : 'transparent',
    borderRadius: 14,
  };

  const modal = (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-8 overflow-y-auto"
      style={{ background: 'rgba(10,10,10,0.45)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg max-h-[calc(100dvh-64px)] overflow-y-auto p-5 sm:p-6"
        style={{
          background: 'var(--aurora-surface-solid)',
          borderRadius: 20,
          border: '1px solid var(--aurora-line)',
          boxShadow: 'var(--aurora-shadow-modal, 0 24px 60px rgba(10,10,10,0.18))',
          animation: 'aurora-scale-in 0.2s cubic-bezier(.2,.7,.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)', marginBottom: 4 }}>NEW SCRIPT</span>
        <h2 className="aurora-display text-xl mb-4" style={{ color: 'var(--aurora-text)' }}>Save a scene</h2>

        <label className="aurora-eyebrow block mb-1" style={{ color: 'var(--aurora-dim)' }}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Breaking Bad — Pilot"
          className="w-full px-3 py-2 text-sm outline-none focus:border-[color:var(--aurora-heritage-gold)] mb-4"
          style={inputStyle}
        />

        <div className="flex gap-1 mb-4">
          {[
            { key: 'upload', label: 'Upload File' },
            { key: 'paste', label: 'Paste Text' },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 text-xs rounded-full font-semibold transition"
                style={active
                  ? { background: 'var(--aurora-heritage-gold)', color: '#FFF' }
                  : { background: 'rgba(10,10,10,0.04)', color: 'var(--aurora-sub)' }
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'upload' ? (
          <label
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className="block p-8 text-center cursor-pointer transition-colors mb-4 relative"
            style={dropzoneStyle}
          >
            {pdfLoading ? (
              <div className="flex flex-col items-center gap-2">
                <span
                  className="w-8 h-8 rounded-full animate-spin"
                  style={{ border: '3px solid var(--aurora-line)', borderTopColor: 'var(--aurora-heritage-gold)' }}
                />
                <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>Parsing PDF...</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={28} style={{ color: 'var(--aurora-heritage-gold-deep)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--aurora-text)' }}>{fileName}</p>
                <p className="text-xs" style={{ color: '#1A6A38' }}>✓ Loaded — {content.length.toLocaleString()} characters</p>
                <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>Tap to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileText size={32} style={{ color: 'var(--aurora-heritage-gold)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--aurora-text)' }}>Drag, drop, or tap to upload</p>
                <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>
                  Supports <strong>.pdf</strong> and .txt files
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder={'CHARACTER: Dialogue line...\nOTHER CHARACTER: Response...'}
            className="w-full px-3 py-2 text-sm font-mono outline-none focus:border-[color:var(--aurora-heritage-gold)] mb-4 resize-none"
            style={inputStyle}
          />
        )}

        {fileError && (
          <p className="text-xs mb-3" style={{ color: 'var(--aurora-coral-deep, #C05957)' }}>{fileError}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition"
            style={{ color: 'var(--aurora-sub)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !content.trim() || loading || pdfLoading}
            className="px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 transition"
            style={goldGradient}
          >
            {loading ? 'Saving...' : 'Save Script'}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(modal, document.body);
}

// ─── Script Card ─────────────────────────────────────────────────
function ScriptCard({ script, onDelete, onPractice, onCDSim }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const chars = parseCharacterCount(script.content);
  const lines = countLines(script.content);
  const thumb = pickScriptPhoto(script.id);

  return (
    <div className="aurora-card flex flex-col overflow-hidden" style={{ minHeight: 220, padding: 0 }}>
      {/* Photo thumbnail */}
      <div
        style={{
          height: 90,
          background: `#0E0D0A url(${thumb}) center 35%/cover`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(14,13,10,0.55) 100%)',
          }}
        />
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="font-semibold text-base truncate" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.2px' }}>
          {script.title}
        </h3>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--aurora-sub)' }}>
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aurora-heritage-gold)' }} />
            {chars} character{chars !== 1 ? 's' : ''}
          </span>
          <span>{lines} line{lines !== 1 ? 's' : ''}</span>
          <span>{formatDate(script.created_at)}</span>
        </div>

      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={onPractice}
          className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition"
          style={goldGradient}
        >
          Practice
        </button>
        <button
          onClick={onCDSim}
          className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition inline-flex items-center justify-center gap-1.5"
          style={{
            background: 'transparent',
            border: '1.5px solid var(--aurora-heritage-gold)',
            color: 'var(--aurora-heritage-gold-deep)',
          }}
        >
          <Mic size={14} />
          Coach
        </button>
        {confirmDelete ? (
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm font-semibold rounded-lg transition"
            style={{ background: 'var(--aurora-coral, #FF8280)', color: '#FFF' }}
          >
            Confirm
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 text-sm rounded-lg transition"
            style={{ color: 'var(--aurora-dim)' }}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-24 h-24 mb-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(212,168,95,0.12)' }}
      >
        <FileText size={36} style={{ color: 'var(--aurora-heritage-gold-deep)' }} />
      </div>
      <h3 className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)' }}>No scripts yet</h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--aurora-sub)' }}>
        Save your scripts here and launch them into practice mode with one tap.
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition"
        style={goldGradient}
      >
        <Sparkles size={16} />
        Add your first script
      </button>
    </div>
  );
}

// ─── Main Scripts Page ───────────────────────────────────────────
export default function Scripts() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { scripts, loading, createLoading } = useSelector((s) => s.scripts);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchScriptsThunk());
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scripts;
    const q = search.toLowerCase();
    return scripts.filter((s) => s.title?.toLowerCase().includes(q));
  }, [scripts, search]);

  const handleCreate = async (payload) => {
    const result = await dispatch(createScriptThunk(payload));
    if (!result.error) setShowModal(false);
  };

  const handleDelete = (id) => dispatch(deleteScriptThunk(id));

  const launchScript = (script, mode) => {
    sessionStorage.setItem(
      'preloadedScript',
      JSON.stringify({ scriptContent: script.content, scriptTitle: script.title })
    );
    navigate(mode === 'practice' ? '/dashboard/scene-study' : '/dashboard/cd-sim');
  };

  return (
    <div className="max-w-7xl mx-auto aurora-page-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <span className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)', marginBottom: 4 }}>YOUR LIBRARY</span>
          <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
            My Scripts
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition"
          style={goldGradient}
        >
          <Plus size={16} />
          Add Script
        </button>
      </div>

      {scripts.length > 0 && (
        <div className="mb-6 relative max-w-md">
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-dim)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scripts..."
            className="w-full pl-9 pr-4 py-2 text-sm outline-none focus:border-[color:var(--aurora-heritage-gold)]"
            style={inputStyle}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl h-40"
              style={{ background: 'rgba(10,10,10,0.04)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-sm py-12 text-center" style={{ color: 'var(--aurora-sub)' }}>
          No scripts match "{search}"
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onDelete={() => handleDelete(script.id)}
              onPractice={() => launchScript(script, 'practice')}
              onCDSim={() => launchScript(script, 'cdsim')}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddScriptModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          loading={createLoading}
        />
      )}

      <style>{`
        @keyframes aurora-scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
