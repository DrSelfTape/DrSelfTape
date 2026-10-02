/**
 * Auditions Kanban — Studio reskin (warm paper, ink, restrained brass).
 * Drag/drop, type filters, detail side panel, new audition modal (manual/paste/PDF/screenshot).
 * Visual layer only; logic preserved.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  X, Trash2, Edit3, Save,
  GripVertical, CheckCircle2, XCircle, Calendar, Clock,
  Film, Mic, Theater, Megaphone, Building2, Clapperboard,
  Plus, Sparkles,
} from 'lucide-react';
import {
  fetchTrackerThunk,
  fetchAuditionStatsThunk,
  updateAuditionThunk,
  deleteAuditionThunk,
  createAuditionThunk,
} from '../../../redux/features/auditions/auditionsSlice';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import { markStep } from '../../../components/Dashboard/tutorialProgress';
import { aiIdempotencyHeaders } from '../../../utils/aiIdempotency';
import useAuditionNotification from '../../../hooks/useAuditionNotification';
import { clearAuditionNotification, findNotifiedAudition } from '../../../utils/auditionNotification';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { NoDataFound } from '../../../components/Shared/NoDataFound';
import '../studioScreens.css';

/* ─── constants ─────────────────────────────────────────────────── */

/* Studio runs one accent. The column marker is an ink ramp, with brass
   reserved for the two columns that mean something good happened. */
const COLUMNS = [
  { id: 'submitted',  label: 'Submitted',  color: 'var(--sx-faint)' },
  { id: 'in_review',  label: 'In Review',  color: 'var(--sx-muted)' },
  { id: 'audition',   label: 'Audition',   color: 'var(--sx-ink)' },
  { id: 'callback',   label: 'Callback',   color: 'var(--sx-gold)' },
  { id: 'booked',     label: 'Booked',     color: 'var(--sx-ok)' },
  { id: 'passed',     label: 'Passed',     color: 'var(--sx-line)' },
];

const STATUS_ORDER = ['submitted', 'in_review', 'audition', 'callback', 'booked'];

const STATUS_TO_API = {
  submitted: 'submitted',
  in_review: 'reviewed',
  audition: 'audition',
  callback: 'callback',
  booked: 'booked',
  passed: 'passed',
};

const TYPE_FILTERS = [
  { key: 'all',        label: 'All' },
  { key: 'film',       label: 'Film/TV',      icon: Film },
  { key: 'commercial', label: 'Commercial',   icon: Megaphone },
  { key: 'theatrical', label: 'Theatrical',   icon: Clapperboard },
  { key: 'voiceover',  label: 'Voice Over',   icon: Mic },
  { key: 'theater',    label: 'Theater',      icon: Theater },
  { key: 'industrial', label: 'Industrial',   icon: Building2 },
];

/* Project type is a label, not a status — it reads as a quiet ink chip so
   the brass stays meaningful. */
const TYPE_LABELS = {
  film: 'Film/TV',
  commercial: 'Commercial',
  theatrical: 'Theatrical',
  industrial: 'Industrial',
  theater: 'Theater',
  voiceover: 'Voice Over',
};

/* ─── helpers ───────────────────────────────────────────────────── */

function callbackLabel(dateStr) {
  if (!dateStr) return null;
  const cb = new Date(dateStr);
  if (isNaN(cb.getTime())) return null;
  const now = new Date();
  const diffMs = cb.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / 86400000);
  // Garbage guard: a null/epoch/typo'd date used to render "13697d ago"
  // (~37 years) — an actor reading trust signals sees a broken product.
  // Anything implausibly far past renders no label at all.
  if (days < -365) return null;
  if (days < 0) return { text: `${Math.abs(days)}d ago`, urgent: false };
  if (days === 0) return { text: 'Today!', urgent: true };
  if (days === 1) return { text: 'Tomorrow', urgent: true };
  if (days <= 7) return { text: `in ${days} days`, urgent: false };
  return { text: cb.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
}

function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

/* ─── sortable card ─────────────────────────────────────────────── */

function SortableCard({ audition, onClick, onAdvance, onPass }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(audition.id) });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cb = callbackLabel(audition.callback_date);
  const canAdvance = nextStatus(audition._column) !== null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...dragStyle,
        cursor: 'pointer',
        position: 'relative',
        padding: 0,
        transform: isDragging ? 'rotate(1deg) scale(1.03)' : dragStyle.transform,
        opacity: isDragging ? 0.92 : 1,
      }}
      className={`group sx-card${cb?.urgent ? ' sx-card--flagged' : ''}`}
      onClick={() => onClick(audition)}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-1.5 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--sx-faint)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      <div className="pl-6 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-sm font-semibold leading-tight line-clamp-1"
            title={audition.project_title}
            style={{ color: 'var(--sx-ink)' }}
          >
            {audition.project_title}
          </h4>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            {canAdvance && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdvance(audition); }}
                className="p-1 rounded-lg"
                style={{ color: 'var(--sx-ok)' }}
                title="Advance status"
                aria-label="Advance status"
              >
                <CheckCircle2 size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPass(audition); }}
              className="p-1 rounded-lg"
              style={{ color: 'var(--sx-alert)' }}
              title="Move to passed"
              aria-label="Move to passed"
            >
              <XCircle size={15} />
            </button>
          </div>
        </div>

        {audition.character && (
          <p className="sx-meta mt-1 line-clamp-1" title={audition.character}>
            as <span className="font-medium" style={{ color: 'var(--sx-ink)' }}>{
              String(audition.character).length > 40
                ? String(audition.character).split(/[:;,]/)[0].trim()
                : audition.character
            }</span>
          </p>
        )}
        {audition.casting_director && (
          <p className="sx-meta sx-meta--faint mt-0.5 line-clamp-1">
            CD: {audition.casting_director}
          </p>
        )}

        <div className="flex items-center justify-between mt-2.5 gap-2">
          <span className="sx-badge" data-tone="quiet">
            {TYPE_LABELS[audition.project_type] || audition.project_type}
          </span>
          {cb && (
            <span className="sx-badge" data-tone={cb.urgent ? 'brass' : 'quiet'}>
              <Clock size={10} aria-hidden="true" />
              {cb.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── static card (drag overlay) ────────────────────────────────── */

function StaticCard({ audition }) {
  return (
    <div
      className="sx sx-card"
      style={{
        width: 256,
        padding: 0,
        transform: 'rotate(1deg) scale(1.03)',
        opacity: 0.94,
      }}
    >
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--sx-ink)' }}>{audition.project_title}</h4>
        {audition.character && (
          <p className="sx-meta mt-1">as {
            String(audition.character).length > 40
              ? String(audition.character).split(/[:;,]/)[0].trim()
              : audition.character
          }</p>
        )}
        <span className="sx-badge mt-2" data-tone="quiet">
          {TYPE_LABELS[audition.project_type] || audition.project_type}
        </span>
      </div>
    </div>
  );
}

/* ─── droppable column ──────────────────────────────────────────── */

function KanbanColumn({ column, items, onCardClick, onAdvance, onPass }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const ids = useMemo(() => items.map((a) => String(a.id)), [items]);

  return (
    <div className="sx-col">
      <div className="sx-col-head">
        <span className="sx-dot" style={{ background: column.color }} />
        <h3 className="sx-eyebrow">{column.label}</h3>
        <span className="sx-badge ml-auto" data-tone="quiet">{items.length}</span>
      </div>

      <div ref={setNodeRef} className="sx-col-well" data-over={isOver ? 'true' : 'false'}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((audition) => (
            <SortableCard
              key={audition.id}
              audition={audition}
              onClick={onCardClick}
              onAdvance={onAdvance}
              onPass={onPass}
            />
          ))}
        </SortableContext>

        {items.length === 0 && <div className="sx-col-hint">Drop here</div>}
      </div>
    </div>
  );
}

/* ─── detail side panel (portaled) ──────────────────────────────── */

function DetailPanel({ audition, onClose, onSave, onDelete, onStatusChange }) {
  useHideMobileHeader(Boolean(audition));
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (audition) {
      setForm({ ...audition });
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [audition]);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (audition) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [audition, onClose]);

  if (!audition) return null;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, field, type = 'text', options }) => (
    <div>
      <span className="sx-label">{label}</span>
      {editing ? (
        type === 'select' ? (
          <select
            aria-label={label}
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="sx-input"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            aria-label={label}
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            rows={3}
            className="sx-input"
          />
        ) : (
          <input
            aria-label={label}
            type={type}
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="sx-input"
          />
        )
      ) : (
        <p className="text-sm" style={{ color: 'var(--sx-ink)' }}>{form[field] || '—'}</p>
      )}
    </div>
  );

  const cb = callbackLabel(audition.callback_date);

  const panel = (
    <>
      <div className="sx sx-backdrop" />
      <div
        ref={panelRef}
        className="sx fixed top-0 right-0 h-full w-full max-w-sm z-[120] overflow-y-auto"
        style={{
          background: 'var(--sx-paper)',
          borderLeft: '1px solid var(--sx-line)',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          animation: 'aurora-slide-in 0.25s cubic-bezier(.2,.7,.3,1)',
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4"
          style={{
            background: 'var(--sx-paper)',
            borderBottom: '1px solid var(--sx-line)',
            paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="min-w-0">
            <span className="sx-eyebrow">AUDITION</span>
            <h2 className="sx-title sx-title--sm line-clamp-2">{audition.project_title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-label="Save changes"
                className="sx-icon-btn"
                style={{ color: 'var(--sx-gold-ink)' }}
              >
                {saving ? <span className="sx-skel block w-4 h-4 rounded-full" /> : <Save size={17} />}
              </button>
            ) : (
              <button type="button" onClick={() => setEditing(true)} aria-label="Edit audition" className="sx-icon-btn">
                <Edit3 size={17} />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="sx-icon-btn">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {cb && (
            <div className="sx-badge w-full justify-start" data-tone={cb.urgent ? 'brass' : 'quiet'} style={{ padding: '9px 12px' }}>
              <Calendar size={13} aria-hidden="true" />
              Callback {cb.text}
            </div>
          )}

          <div>
            <label className="sx-label" htmlFor="aud-status">Status</label>
            <select
              id="aud-status"
              value={audition._column}
              onChange={(e) => onStatusChange(audition.id, e.target.value)}
              className="sx-input"
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
          </div>

          <Field label="Project" field="project_title" />
          <Field label="Character" field="character" />
          <Field label="Casting Director" field="casting_director" />
          <Field label="Agency" field="agency" />
          <Field
            label="Project Type"
            field="project_type"
            type="select"
            options={[
              { value: 'film', label: 'Film/TV' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'theatrical', label: 'Theatrical' },
              { value: 'industrial', label: 'Industrial' },
              { value: 'theater', label: 'Theater' },
              { value: 'voiceover', label: 'Voice Over' },
            ]}
          />
          <Field label="Callback Date" field="callback_date" type="datetime-local" />
          <Field label="Notes" field="notes" type="textarea" />

          <div className="sx-divider">
            {confirmDelete ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm" style={{ color: 'var(--sx-alert)' }}>
                  Delete this audition?
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(audition.id)}
                  className="sx-btn sx-btn--sm"
                  style={{ background: 'var(--sx-alert)', borderColor: 'var(--sx-alert)' }}
                >
                  Confirm
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="sx-btn sx-btn--sm sx-btn--quiet">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="sx-textbtn sx-textbtn--alert inline-flex items-center gap-2"
              >
                <Trash2 size={13} aria-hidden="true" />
                Delete audition
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}

/* ─── new audition modal (portaled) ─────────────────────────────── */

function NewAuditionModal({ open, onClose, onSubmit }) {
  const [mode, setMode] = useState('manual');
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef(null);
  const screenshotInputRef = useRef(null);
  const [form, setForm] = useState({
    project_title: '', character: '', casting_director: '', agency: '',
    project_type: 'film', callback_date: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Slide MobileApp's persistent top bar out of the way for the lifetime of
  // this modal — otherwise the bell + avatar overlap the title row and the X
  // close button is hard to reach. Called before the early return so hook
  // order stays stable.
  useHideMobileHeader(open);

  if (!open) return null;

  const inputCls = 'sx-input';

  const resetForm = () => {
    setForm({ project_title: '', character: '', casting_director: '', agency: '', project_type: 'film', callback_date: '', notes: '' });
    setPasteText(''); setMode('manual'); setParseError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_title.trim() || submitting) return;
    // Coerce any partial / invalid callback_date input to null rather than
    // sending a string the BE can't parse. The datetime-local input is the
    // primary defense; this is the belt around it.
    let payload = { ...form };
    if (payload.callback_date) {
      const ts = new Date(payload.callback_date).getTime();
      if (Number.isNaN(ts)) {
        payload.callback_date = null;
      }
    } else {
      payload.callback_date = null;
    }
    setSubmitting(true);
    const result = await onSubmit(payload);
    setSubmitting(false);
    if (result && result.ok === false) return;
    resetForm();
    onClose();
  };

  const parseWithAI = async (text) => {
    if (!text.trim()) return;
    setParsing(true);
    setParseError('');
    try {
      const axiosInstance = (await import('../../../redux/http')).default;
      const endPoints = (await import('../../../redux/constant')).default;
      const body = { text };
      const { data } = await axiosInstance.post(
        endPoints.parseBreakdown, body,
        aiIdempotencyHeaders('parse_breakdown', body),
      );
      const parsed = data?.data || {};
      setForm((prev) => ({
        ...prev,
        project_title: parsed.project || parsed.project_title || prev.project_title,
        character: parsed.role || parsed.character || prev.character,
        casting_director: parsed.casting_director || prev.casting_director,
        agency: parsed.agency || prev.agency,
        project_type: parsed.project_type || prev.project_type,
        notes: parsed.notes || prev.notes,
      }));
      setMode('manual');
    } catch {
      setParseError('Could not parse breakdown. Please fill it in manually.');
    } finally {
      setParsing(false);
    }
  };

  const handlePDFFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      // Shared extractor — reconstructs real line breaks. The old inline
      // `items.map(str).join(' ')` collapsed each page to one line, the
      // same bug that broke Scripts uploads.
      const { extractPdfText } = await import('../../../utils/pdfText');
      const { cleanScriptText } = await import('../../../utils/scriptCleaner');
      const text = cleanScriptText(await extractPdfText(file));
      await parseWithAI(text);
    } catch {
      setParseError('Could not read PDF. Try pasting the text instead.');
      setParsing(false);
    }
  };

  const handleScreenshot = async (file) => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const axiosInstance = (await import('../../../redux/http')).default;
      const endPoints = (await import('../../../redux/constant')).default;
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await axiosInstance.post(
        endPoints.parseBreakdown, fd,
        aiIdempotencyHeaders('parse_breakdown', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      );
      const parsed = data?.data || {};
      setForm((prev) => ({
        ...prev,
        project: parsed.project || prev.project,
        role: parsed.role || prev.role,
        casting_director: parsed.casting_director || prev.casting_director,
        agency: parsed.agency || prev.agency,
        project_type: parsed.project_type || prev.project_type,
        notes: parsed.notes || prev.notes,
      }));
      setMode('manual');
    } catch {
      setParseError('Could not read screenshot. Try pasting the text instead.');
    } finally {
      setParsing(false);
    }
  };

  const dropzoneStyle = {
    border: '1px dashed var(--sx-line)',
    borderRadius: 12,
    background: 'var(--sx-well)',
  };

  const modal = (
    <>
      <div className="sx sx-backdrop" onClick={onClose} />
      <div className="sx sx-modal">
        <div
          className="sx-sheet"
          style={{ animation: 'aurora-scale-in 0.2s cubic-bezier(.2,.7,.3,1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sx-sheet-head">
            <div>
              <span className="sx-eyebrow">NEW AUDITION</span>
              <h2 className="sx-title sx-title--sm">Track an opportunity</h2>
            </div>
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              aria-label="Close"
              className="sx-icon-btn"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-2 px-5 pt-4 pb-1 flex-wrap">
            {[
              { id: 'manual', label: 'Manual' },
              { id: 'screenshot', label: 'Screenshot' },
              { id: 'paste', label: 'Paste' },
              { id: 'pdf', label: 'PDF' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={mode === tab.id}
                onClick={() => { setMode(tab.id); setParseError(''); }}
                className="sx-chip"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-5 pb-6 pt-3">
            {mode === 'paste' && (
              <div className="space-y-3">
                <p className="sx-meta">
                  Paste the full casting breakdown. We&apos;ll pull out the project, role, CD and notes.
                </p>
                <textarea
                  aria-label="Casting breakdown text"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste breakdown here…"
                  rows={10}
                  className="sx-input"
                />
                {parseError && <p className="sx-meta" style={{ color: 'var(--sx-alert)' }}>{parseError}</p>}
                <button
                  type="button"
                  onClick={() => parseWithAI(pasteText)}
                  disabled={parsing || !pasteText.trim()}
                  className="sx-btn w-full"
                >
                  {parsing
                    ? 'Extracting…'
                    : <><Sparkles size={16} aria-hidden="true" /> Extract with AI</>
                  }
                </button>
              </div>
            )}

            {mode === 'screenshot' && (
              <div className="space-y-3">
                <p className="sx-meta">
                  Upload a screenshot of your breakdown and we&apos;ll read it into the fields.
                </p>
                <label className="block p-8 text-center cursor-pointer" style={dropzoneStyle}>
                  {parsing ? (
                    <p className="text-sm" style={{ color: 'var(--sx-ink)' }}>Reading your screenshot…</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium" style={{ color: 'var(--sx-ink)' }}>Tap to upload a screenshot</p>
                      <p className="sx-meta sx-meta--faint mt-1">JPG, PNG, WEBP</p>
                    </>
                  )}
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Upload breakdown screenshot"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                    onChange={(e) => handleScreenshot(e.target.files?.[0])}
                  />
                </label>
                {parseError && <p className="sx-meta" style={{ color: 'var(--sx-alert)' }}>{parseError}</p>}
              </div>
            )}

            {mode === 'pdf' && (
              <div className="space-y-3">
                <p className="sx-meta">Upload the breakdown PDF and we&apos;ll pull out the key details.</p>
                <label className="block p-8 text-center cursor-pointer" style={dropzoneStyle}>
                  {parsing ? (
                    <p className="text-sm" style={{ color: 'var(--sx-ink)' }}>Reading the PDF…</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium" style={{ color: 'var(--sx-ink)' }}>Tap to upload a breakdown PDF</p>
                      <p className="sx-meta sx-meta--faint mt-1">PDF files only</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    aria-label="Upload breakdown PDF"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                    onChange={(e) => handlePDFFile(e.target.files?.[0])}
                  />
                </label>
                {parseError && <p className="sx-meta" style={{ color: 'var(--sx-alert)' }}>{parseError}</p>}
              </div>
            )}

            {mode === 'manual' && (
              <form onSubmit={handleSubmit} className="space-y-3 mt-1">
                {(form.project_title || form.character) && (
                  <p className="sx-badge w-full justify-start" data-tone="ok" style={{ padding: '8px 12px' }}>
                    Filled in from the breakdown — check it over
                  </p>
                )}
                <input aria-label="Project name" placeholder="Project name *" value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} className={inputCls} required />
                <input aria-label="Role or character" placeholder="Role / Character" value={form.character} onChange={(e) => setForm({ ...form, character: e.target.value })} className={inputCls} />
                <input aria-label="Casting director" placeholder="Casting Director" value={form.casting_director} onChange={(e) => setForm({ ...form, casting_director: e.target.value })} className={inputCls} />
                <input aria-label="Agency or production company" placeholder="Agency / Production Company" value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} className={inputCls} />
                <select aria-label="Project type" value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} className={inputCls}>
                  <option value="film">Film/TV</option>
                  <option value="commercial">Commercial</option>
                  <option value="theatrical">Theatrical</option>
                  <option value="industrial">Industrial</option>
                  <option value="theater">Theater</option>
                  <option value="voiceover">Voice Over</option>
                </select>
                <div>
                  <label className="sx-label" htmlFor="new-aud-callback">Callback date</label>
                  <input id="new-aud-callback" type="datetime-local" value={form.callback_date} onChange={(e) => setForm({ ...form, callback_date: e.target.value })} className={inputCls} />
                </div>
                <textarea aria-label="Notes" placeholder="Notes (character description, rate, union status, shoot dates…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} />
                <button type="submit" disabled={submitting} className="sx-btn w-full">
                  {submitting ? 'Adding…' : 'Add audition'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

/* ─── main export ───────────────────────────────────────────────── */

export default function DashboardAuditions() {
  const dispatch = useDispatch();
  const { tracker, loading } = useSelector((state) => state.auditions);

  const [activeFilter, setActiveFilter] = useState('all');
  const [activeDragId, setActiveDragId] = useState(null);
  const [selectedAudition, setSelectedAudition] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const notificationTarget = useAuditionNotification('auditions');

  const allAuditions = useMemo(() => {
    const data = tracker?.data || {};
    const list = [];
    for (const col of COLUMNS) {
      const items = data[col.id] || [];
      items.forEach((item) => list.push({ ...item, _column: col.id }));
    }
    return list;
  }, [tracker]);

  const filteredAuditions = useMemo(() => {
    if (activeFilter === 'all') return allAuditions;
    return allAuditions.filter((a) => a.project_type === activeFilter);
  }, [allAuditions, activeFilter]);

  const columns = useMemo(() => {
    const grouped = {};
    for (const col of COLUMNS) grouped[col.id] = [];
    filteredAuditions.forEach((a) => {
      if (grouped[a._column]) grouped[a._column].push(a);
    });
    return grouped;
  }, [filteredAuditions]);

  const typeCounts = useMemo(() => {
    const counts = { all: allAuditions.length };
    allAuditions.forEach((a) => {
      counts[a.project_type] = (counts[a.project_type] || 0) + 1;
    });
    return counts;
  }, [allAuditions]);

  const activeCard = useMemo(
    () => allAuditions.find((a) => String(a.id) === activeDragId),
    [allAuditions, activeDragId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    dispatch(fetchTrackerThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!notificationTarget) return;
    let cancelled = false;
    setSelectedAudition(null);
    // The panel can already be open when a push arrives. Read fresh scoped
    // data, and never let a slower old notification replace the current one.
    dispatch(fetchTrackerThunk()).unwrap().then(result => {
      if (cancelled) return;
      const audition = findNotifiedAudition(result, notificationTarget.id);
      if (audition) setSelectedAudition(audition);
      clearAuditionNotification(notificationTarget);
    }).catch(() => { /* keep the handoff for retry on the next panel mount */ });
    return () => { cancelled = true; };
  }, [notificationTarget, dispatch]);

  const changeStatus = useCallback(
    async (auditionId, newColumn) => {
      const apiStatus = STATUS_TO_API[newColumn];
      if (!apiStatus) return;
      try {
        await dispatch(updateAuditionThunk({ id: auditionId, data: { status: apiStatus } })).unwrap();
      } catch (err) {
        const msg = err?.message || err?.detail || 'Could not update audition status.';
        dispatch(showSnackbar({ message: msg, variant: 'error' }));
        // Fall through to re-fetch so UI reverts to server truth.
      }
      dispatch(fetchTrackerThunk());
      dispatch(fetchAuditionStatsThunk());
    },
    [dispatch]
  );

  const onDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const onDragEnd = useCallback(
    (event) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;

      const auditionId = Number(active.id);
      let targetColumn = over.id;
      if (!COLUMNS.find((c) => c.id === targetColumn)) {
        const overCard = allAuditions.find((a) => String(a.id) === over.id);
        targetColumn = overCard?._column;
      }

      const sourceCard = allAuditions.find((a) => a.id === auditionId);
      if (!targetColumn || !sourceCard || sourceCard._column === targetColumn) return;

      changeStatus(auditionId, targetColumn);
    },
    [allAuditions, changeStatus]
  );

  const handleAdvance = useCallback(
    (audition) => {
      const next = nextStatus(audition._column);
      if (next) changeStatus(audition.id, next);
    },
    [changeStatus]
  );

  const handlePass = useCallback(
    (audition) => changeStatus(audition.id, 'passed'),
    [changeStatus]
  );

  const handleSave = useCallback(
    async (form) => {
      const payload = {
        project_title: form.project_title || '',
        character: form.character || '',
        casting_director: form.casting_director || '',
        project_type: form.project_type,
        agency: form.agency || '',
        callback_date: form.callback_date || null,
        notes: form.notes || '',
      };
      try {
        await dispatch(updateAuditionThunk({ id: form.id, data: payload })).unwrap();
        dispatch(fetchTrackerThunk());
        dispatch(fetchAuditionStatsThunk());
        setSelectedAudition(null);
      } catch (e) {
        dispatch(showSnackbar({
          message: e?.message || e?.detail || "Couldn't save audition. Please try again.",
          variant: 'error',
        }));
        dispatch(fetchTrackerThunk());
      }
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await dispatch(deleteAuditionThunk(id)).unwrap();
        dispatch(fetchTrackerThunk());
        dispatch(fetchAuditionStatsThunk());
        setSelectedAudition(null);
      } catch (e) {
        dispatch(showSnackbar({
          message: e?.message || e?.detail || "Couldn't delete audition. Please try again.",
          variant: 'error',
        }));
        dispatch(fetchTrackerThunk());
      }
    },
    [dispatch]
  );

  const handleCreate = useCallback(
    async (form) => {
      try {
        await dispatch(createAuditionThunk(form)).unwrap();
        dispatch(fetchTrackerThunk());
        dispatch(fetchAuditionStatsThunk());
        markStep('track_audition');
        return { ok: true };
      } catch (e) {
        dispatch(showSnackbar({
          message: e?.message || e?.detail || "Couldn't add audition. Please try again.",
          variant: 'error',
        }));
        return { ok: false };
      }
    },
    [dispatch]
  );

  // Skeleton board rather than a bare spinner: the columns the tracker is
  // about are on screen before the data lands.
  if (loading && allAuditions.length === 0) {
    return (
      <div className="sx sx-page space-y-4" aria-busy="true">
        <div className="sx-skel h-8 w-52" />
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3].map((i) => <div key={i} className="sx-skel h-9 w-24 rounded-full" />)}
        </div>
        <div className="sx-board sx-scroll-x -mx-2 px-2">
          {COLUMNS.map((col) => (
            <div key={col.id} className="sx-col">
              <div className="sx-col-head"><div className="sx-skel h-3 w-20" /></div>
              <div className="sx-col-well">
                <div className="sx-skel h-20 rounded-xl" />
                <div className="sx-skel h-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sx sx-page space-y-4">
      {/* Page Header */}
      <div className="sx-head">
        <div>
          <span className="sx-eyebrow">YOUR WORK</span>
          <h1 className="sx-title">Audition Tracker</h1>
        </div>
        <button type="button" onClick={() => setShowNewForm(true)} className="sx-btn sx-btn--sm">
          <Plus size={16} aria-hidden="true" />
          New audition
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={activeFilter === f.key}
            onClick={() => setActiveFilter(f.key)}
            className="sx-chip"
          >
            {f.icon && <f.icon size={13} aria-hidden="true" />}
            {f.label}
            <b>{typeCounts[f.key] || 0}</b>
          </button>
        ))}
      </div>

      {/* Kanban Board — empty tracker gets copy that says what fills it */}
      {allAuditions.length === 0 ? (
        <NoDataFound
          title="No auditions tracked yet"
          message="Every audition you're up for lives on this board — submitted, in review, callback, booked. Add the one you're working on and drag it across as it moves."
          action={{ label: 'Add your first audition', onClick: () => setShowNewForm(true) }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="sx-board sx-scroll-x -mx-2 px-2">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                items={columns[col.id]}
                onCardClick={setSelectedAudition}
                onAdvance={handleAdvance}
                onPass={handlePass}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? <StaticCard audition={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <DetailPanel
        audition={selectedAudition}
        onClose={() => setSelectedAudition(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        onStatusChange={(id, newCol) => {
          changeStatus(id, newCol);
          setSelectedAudition(null);
        }}
      />

      <NewAuditionModal
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        onSubmit={handleCreate}
      />

      <style>{`
        @keyframes aurora-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes aurora-scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
