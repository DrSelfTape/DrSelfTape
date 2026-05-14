import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
  fetchScriptsThunk,
  createScriptThunk,
  deleteScriptThunk,
} from '../../../redux/features/scripts/scriptsSlice';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
    // Auto-fill title from filename if empty
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="bg-[#F4F4EE] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">Add Script</h2>

        {/* Title */}
        <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Breaking Bad — Pilot"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F] mb-4"
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[{ key: 'upload', label: '📄 Upload File' }, { key: 'paste', label: '✏️ Paste Text' }].map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${tab === t.key ? 'bg-[#D4A85F] text-[#0A0A0A]' : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.62)] hover:bg-[#3A3A3A]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
              dragActive ? 'border-[#D4A85F] bg-[#D4A85F]/10' : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F]'
            }`}
          >
            {pdfLoading ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-[#7A5A18] animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <p className="text-sm text-[rgba(10,10,10,0.62)]">Parsing PDF...</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl">{fileName.endsWith('.pdf') ? '📄' : '📝'}</span>
                <p className="text-sm font-semibold text-[#0A0A0A]">{fileName}</p>
                <p className="text-xs text-green-600">✓ File loaded — {content.length.toLocaleString()} characters</p>
                <p className="text-xs text-[rgba(10,10,10,0.4)]">Click to replace</p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm font-medium text-[rgba(10,10,10,0.62)]">Drag & drop or click to upload</p>
                <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1">Supports <strong>.pdf</strong> and .txt files</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder={'CHARACTER: Dialogue line...\nOTHER CHARACTER: Response...'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D4A85F] mb-4 resize-none"
          />
        )}

        {fileError && <p className="text-red-500 text-xs mb-3">{fileError}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[rgba(10,10,10,0.62)] hover:text-[#0A0A0A]">Cancel</button>
          <button
            type="submit"
            disabled={!title.trim() || !content.trim() || loading || pdfLoading}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#D4A85F] text-[#0A0A0A] hover:bg-[#C09850] disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Save Script'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Script Card ─────────────────────────────────────────────────
function ScriptCard({ script, onDelete, onPractice, onCDSim }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const chars = parseCharacterCount(script.content);
  const lines = countLines(script.content);

  return (
    <div className="bg-[#F4F4EE] rounded-xl shadow-sm border border-[rgba(10,10,10,0.08)] p-4 flex flex-col gap-3">
      <h3 className="font-bold text-[#0A0A0A] text-base truncate">
        {script.title}
      </h3>

      <div className="flex flex-wrap gap-3 text-xs text-[rgba(10,10,10,0.62)]">
        <span>{chars} character{chars !== 1 ? 's' : ''}</span>
        <span>{lines} line{lines !== 1 ? 's' : ''}</span>
        <span>{formatDate(script.created_at)}</span>
      </div>

      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={onPractice}
          className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-[#D4A85F] text-[#0A0A0A] hover:bg-[#C09850] transition"
        >
          Practice
        </button>
        <button
          onClick={onCDSim}
          className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg border-2 border-[#D4A85F] text-[#7A5A18] hover:bg-[#D4A85F]/10 transition"
        >
          Coach
        </button>
        {confirmDelete ? (
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm rounded-lg bg-red-500 text-[#0A0A0A] hover:bg-red-600 transition"
          >
            Confirm
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 text-sm rounded-lg text-[rgba(10,10,10,0.4)] hover:text-red-500 hover:bg-red-50 transition"
            title="Delete"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-[#D4A85F]/10 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 text-[#7A5A18]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#0A0A0A] mb-1">No scripts yet</h3>
      <p className="text-sm text-[rgba(10,10,10,0.62)] mb-6">
        Save your scripts here and launch them into practice mode with one click.
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4A85F] text-[#0A0A0A] hover:bg-[#C09850] transition"
      >
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">My Scripts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4A85F] text-[#0A0A0A] hover:bg-[#C09850] transition"
        >
          + Add Script
        </button>
      </div>

      {/* Search */}
      {scripts.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scripts..."
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-[#F4F4EE] rounded-xl h-48"
            />
          ))}
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[rgba(10,10,10,0.62)] py-12 text-center">
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

      {/* Modal */}
      {showModal && (
        <AddScriptModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          loading={createLoading}
        />
      )}
    </div>
  );
}
