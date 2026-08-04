/**
 * Auditions Kanban — Aurora v1.2 reskin.
 * Drag/drop, type filters, detail side panel, new audition modal (manual/paste/PDF/screenshot).
 * Visual layer rewritten to Aurora tokens; logic preserved.
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
import { markStep } from '../../../components/Dashboard/TutorialChecklist';
import { aiIdempotencyHeaders } from '../../../utils/aiIdempotency';

/* ─── constants ─────────────────────────────────────────────────── */

const COLUMNS = [
  { id: 'submitted',  label: 'Submitted',  color: 'var(--aurora-sub)' },
  { id: 'in_review',  label: 'In Review',  color: 'var(--aurora-sky)' },
  { id: 'audition',   label: 'Audition',   color: 'var(--aurora-coral, #FF8280)' },
  { id: 'callback',   label: 'Callback',   color: 'var(--aurora-heritage-gold)' },
  { id: 'booked',     label: 'Booked',     color: 'var(--aurora-mint)' },
  { id: 'passed',     label: 'Passed',     color: 'var(--aurora-dim)' },
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

const TYPE_BADGES = {
  film:       { dot: 'var(--aurora-peach)',   tint: 'rgba(255,201,163,0.18)', ink: '#8A4A1A' },
  commercial: { dot: 'var(--aurora-sky)',     tint: 'rgba(167,214,255,0.22)', ink: '#1E5A8A' },
  theatrical: { dot: 'var(--aurora-purple)',  tint: 'rgba(216,197,242,0.22)', ink: '#5A3A8A' },
  industrial: { dot: 'var(--aurora-dim)',     tint: 'rgba(10,10,10,0.06)',    ink: 'var(--aurora-sub)' },
  theater:    { dot: 'var(--aurora-mint)',    tint: 'rgba(159,230,180,0.22)', ink: '#1A6A38' },
  voiceover:  { dot: 'var(--aurora-gold)',    tint: 'rgba(252,224,114,0.22)', ink: 'var(--aurora-gold-deep)' },
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
  const badge = TYPE_BADGES[audition.project_type] || TYPE_BADGES.film;
  const canAdvance = nextStatus(audition._column) !== null;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...dragStyle,
        background: 'var(--aurora-surface-solid)',
        borderRadius: 14,
        border: '1px solid var(--aurora-line)',
        boxShadow: isDragging
          ? '0 16px 40px rgba(10,10,10,0.18)'
          : '0 1px 2px rgba(10,10,10,0.04), 0 6px 16px rgba(10,10,10,0.04)',
        cursor: 'pointer',
        position: 'relative',
        transform: isDragging ? 'rotate(1deg) scale(1.03)' : dragStyle.transform,
        opacity: isDragging ? 0.92 : 1,
        outline: cb?.urgent ? '2px solid var(--aurora-coral, #FF8280)' : 'none',
        outlineOffset: cb?.urgent ? -1 : 0,
      }}
      className="group transition-shadow"
      onClick={() => onClick(audition)}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 left-1.5 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--aurora-dim)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      <div className="pl-6 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-sm font-semibold leading-tight line-clamp-1"
            title={audition.project_title}
            style={{ color: 'var(--aurora-text)' }}
          >
            {audition.project_title}
          </h4>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {canAdvance && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdvance(audition); }}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--aurora-mint, #2A9F58)' }}
                title="Advance status"
              >
                <CheckCircle2 size={15} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onPass(audition); }}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--aurora-coral, #FF8280)' }}
              title="Move to passed"
            >
              <XCircle size={15} />
            </button>
          </div>
        </div>

        {audition.character && (
          <p className="text-xs mt-0.5 line-clamp-1" title={audition.character} style={{ color: 'var(--aurora-sub)' }}>
            as <span className="font-medium" style={{ color: 'var(--aurora-text)' }}>{
              String(audition.character).length > 40
                ? String(audition.character).split(/[:;,]/)[0].trim()
                : audition.character
            }</span>
          </p>
        )}
        {audition.casting_director && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--aurora-dim)' }}>
            CD: {audition.casting_director}
          </p>
        )}

        <div className="flex items-center justify-between mt-2.5 gap-2">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: badge.tint, color: badge.ink }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
            {audition.project_type}
          </span>
          {cb && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={cb.urgent
                ? { background: 'rgba(255,130,128,0.14)', color: 'var(--aurora-coral-deep, #C05957)' }
                : { background: 'rgba(10,10,10,0.05)', color: 'var(--aurora-sub)' }
              }
            >
              <Clock size={10} />
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
  const badge = TYPE_BADGES[audition.project_type] || TYPE_BADGES.film;
  return (
    <div
      style={{
        background: 'var(--aurora-surface-solid)',
        borderRadius: 14,
        border: '1px solid var(--aurora-line)',
        boxShadow: '0 16px 40px rgba(10,10,10,0.22)',
        width: 256,
        transform: 'rotate(1deg) scale(1.03)',
        opacity: 0.94,
      }}
    >
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--aurora-text)' }}>{audition.project_title}</h4>
        {audition.character && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--aurora-sub)' }}>as {
            String(audition.character).length > 40
              ? String(audition.character).split(/[:;,]/)[0].trim()
              : audition.character
          }</p>
        )}
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mt-2"
          style={{ background: badge.tint, color: badge.ink }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
          {audition.project_type}
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
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: column.color }} />
        <h3 className="aurora-eyebrow" style={{ color: 'var(--aurora-sub)' }}>{column.label}</h3>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto"
          style={{ background: 'rgba(10,10,10,0.05)', color: 'var(--aurora-sub)' }}
        >
          {items.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 p-2 rounded-2xl min-h-[200px] transition-colors duration-200"
        style={{
          background: isOver
            ? 'linear-gradient(180deg, rgba(212,168,95,0.10), rgba(212,168,95,0.04))'
            : 'rgba(10,10,10,0.025)',
          outline: isOver ? '2px dashed var(--aurora-heritage-gold)' : 'none',
          outlineOffset: -2,
        }}
      >
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

        {items.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs" style={{ color: 'var(--aurora-dim)' }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── detail side panel (portaled) ──────────────────────────────── */

function DetailPanel({ audition, onClose, onSave, onDelete, onStatusChange }) {
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

  // Hide MobileApp's persistent top bar while the audition detail
  // panel is open (same overlap problem as NewAuditionModal).
  useEffect(() => {
    if (!audition) return;
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, [audition]);

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

  const inputStyle = {
    background: 'var(--aurora-surface-solid)',
    color: 'var(--aurora-text)',
    border: '1px solid var(--aurora-line)',
    borderRadius: 10,
  };

  const Field = ({ label, field, type = 'text', options }) => (
    <div className="space-y-1">
      <label className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)' }}>{label}</label>
      {editing ? (
        type === 'select' ? (
          <select
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full text-sm px-3 py-2 outline-none transition-all focus:border-[color:var(--aurora-heritage-gold)]"
            style={inputStyle}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            rows={3}
            className="w-full text-sm px-3 py-2 outline-none transition-all resize-none focus:border-[color:var(--aurora-heritage-gold)]"
            style={inputStyle}
          />
        ) : (
          <input
            type={type}
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full text-sm px-3 py-2 outline-none transition-all focus:border-[color:var(--aurora-heritage-gold)]"
            style={inputStyle}
          />
        )
      ) : (
        <p className="text-sm" style={{ color: 'var(--aurora-text)' }}>{form[field] || '·'}</p>
      )}
    </div>
  );

  const cb = callbackLabel(audition.callback_date);

  const panel = (
    <>
      <div className="fixed inset-0 z-[110]" style={{ background: 'rgba(10,10,10,0.25)' }} />
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-96 z-[120] overflow-y-auto"
        style={{
          background: 'var(--aurora-page)',
          borderLeft: '1px solid var(--aurora-line)',
          boxShadow: 'var(--aurora-shadow-modal, 0 24px 60px rgba(10,10,10,0.18))',
          animation: 'aurora-slide-in 0.25s cubic-bezier(.2,.7,.3,1)',
        }}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between z-10"
          style={{ background: 'var(--aurora-page)', borderBottom: '1px solid var(--aurora-line)' }}
        >
          <h2 className="aurora-display text-base line-clamp-1 pr-4" style={{ color: 'var(--aurora-text)' }}>
            {audition.project_title}
          </h2>
          <div className="flex items-center gap-1">
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'var(--aurora-heritage-gold)', color: '#FFF' }}
              >
                {saving ? (
                  <span className="block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <Save size={16} />
                )}
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--aurora-sub)' }}
              >
                <Edit3 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--aurora-sub)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {cb && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={cb.urgent
                ? { background: 'rgba(255,130,128,0.14)', color: 'var(--aurora-coral-deep, #C05957)' }
                : { background: 'rgba(10,10,10,0.05)', color: 'var(--aurora-sub)' }
              }
            >
              <Calendar size={14} />
              Callback {cb.text}
            </div>
          )}

          <div className="space-y-1">
            <label className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)' }}>Status</label>
            <select
              value={audition._column}
              onChange={(e) => onStatusChange(audition.id, e.target.value)}
              className="w-full text-sm font-medium px-3 py-2 outline-none"
              style={inputStyle}
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

          <div className="pt-4" style={{ borderTop: '1px solid var(--aurora-line)' }}>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--aurora-coral-deep, #C05957)' }}>
                  Delete this audition?
                </span>
                <button
                  onClick={() => onDelete(audition.id)}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors"
                  style={{ background: 'var(--aurora-coral, #FF8280)', color: '#FFF' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ background: 'rgba(10,10,10,0.05)', color: 'var(--aurora-sub)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'var(--aurora-coral-deep, #C05957)' }}
              >
                <Trash2 size={14} />
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

  // Tell MobileApp to slide its persistent top bar out of the way for
  // the lifetime of this modal — otherwise the bell + avatar overlap
  // the modal's title row and the X close button is hard to reach.
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, [open]);

  if (!open) return null;

  const inputStyle = {
    background: 'var(--aurora-surface-solid)',
    color: 'var(--aurora-text)',
    border: '1px solid var(--aurora-line)',
    borderRadius: 10,
  };
  const inputCls = 'w-full text-sm px-3 py-2.5 outline-none transition-all focus:border-[color:var(--aurora-heritage-gold)]';

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
    border: '2px dashed var(--aurora-line)',
    borderRadius: 14,
  };

  const modal = (
    <>
      <div
        className="fixed inset-0 z-[110]"
        style={{ background: 'rgba(10,10,10,0.45)' }}
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-start justify-center z-[120] p-4 pt-8 overflow-y-auto">
        <div
          className="w-full max-w-lg max-h-[calc(100dvh-64px)] overflow-y-auto"
          style={{
            background: 'var(--aurora-surface-solid)',
            borderRadius: 20,
            border: '1px solid var(--aurora-line)',
            boxShadow: 'var(--aurora-shadow-modal, 0 24px 60px rgba(10,10,10,0.18))',
            animation: 'aurora-scale-in 0.2s cubic-bezier(.2,.7,.3,1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between px-6 pt-6 pb-4"
            style={{ borderBottom: '1px solid var(--aurora-line)' }}
          >
            <div>
              <span className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)', marginBottom: 4 }}>NEW AUDITION</span>
              <h2 className="aurora-display text-xl" style={{ color: 'var(--aurora-text)' }}>Track an opportunity</h2>
            </div>
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="p-1 rounded-lg"
              style={{ color: 'var(--aurora-sub)' }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-1 px-6 pt-4 pb-2 flex-wrap">
            {[
              { id: 'manual', label: 'Manual' },
              { id: 'screenshot', label: 'Screenshot' },
              { id: 'paste', label: 'Paste' },
              { id: 'pdf', label: 'PDF' },
            ].map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setMode(tab.id); setParseError(''); }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={active
                    ? { background: 'var(--aurora-heritage-gold)', color: '#FFF' }
                    : { background: 'rgba(10,10,10,0.04)', color: 'var(--aurora-sub)' }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="px-6 pb-6 pt-2">
            {mode === 'paste' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--aurora-sub)' }}>
                  Paste the full casting breakdown. The AI will extract project, role, CD, and notes automatically.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste breakdown here..."
                  rows={10}
                  className="w-full text-sm px-4 py-3 outline-none resize-none focus:border-[color:var(--aurora-heritage-gold)]"
                  style={inputStyle}
                />
                {parseError && <p className="text-xs" style={{ color: 'var(--aurora-coral-deep, #C05957)' }}>{parseError}</p>}
                <button
                  onClick={() => parseWithAI(pasteText)}
                  disabled={parsing || !pasteText.trim()}
                  className="w-full font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
                    color: '#FFF',
                    boxShadow: '0 8px 20px rgba(212,168,95,0.25)',
                  }}
                >
                  {parsing
                    ? <><span className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#FFF' }}/><span>Extracting...</span></>
                    : <><Sparkles size={16} /> Extract with AI</>
                  }
                </button>
              </div>
            )}

            {mode === 'screenshot' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--aurora-sub)' }}>
                  Upload a screenshot of your audition breakdown. The AI will read it and fill in the details.
                </p>
                <label
                  className="block p-8 text-center cursor-pointer transition-colors hover:border-[color:var(--aurora-heritage-gold)]"
                  style={dropzoneStyle}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--aurora-line)', borderTopColor: 'var(--aurora-heritage-gold)' }} />
                      <p className="text-sm" style={{ color: 'var(--aurora-text)' }}>Scanning screenshot with AI...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl mb-2">📸</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--aurora-text)' }}>Tap to upload screenshot</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--aurora-dim)' }}>JPG, PNG, WEBP</p>
                    </>
                  )}
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                    onChange={(e) => handleScreenshot(e.target.files?.[0])}
                  />
                </label>
                {parseError && <p className="text-xs" style={{ color: 'var(--aurora-coral-deep, #C05957)' }}>{parseError}</p>}
              </div>
            )}

            {mode === 'pdf' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--aurora-sub)' }}>
                  Upload the breakdown PDF. The AI will pull out the key details.
                </p>
                <label
                  className="block p-8 text-center cursor-pointer transition-colors hover:border-[color:var(--aurora-heritage-gold)]"
                  style={dropzoneStyle}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--aurora-line)', borderTopColor: 'var(--aurora-heritage-gold)' }} />
                      <p className="text-sm" style={{ color: 'var(--aurora-text)' }}>Reading PDF...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--aurora-text)' }}>Tap to upload breakdown PDF</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--aurora-dim)' }}>PDF files only</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                    onChange={(e) => handlePDFFile(e.target.files?.[0])}
                  />
                </label>
                {parseError && <p className="text-xs" style={{ color: 'var(--aurora-coral-deep, #C05957)' }}>{parseError}</p>}
              </div>
            )}

            {mode === 'manual' && (
              <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                {(form.project_title || form.character) && (
                  <div
                    className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(159,230,180,0.15)', border: '1px solid rgba(159,230,180,0.35)' }}
                  >
                    <span className="text-sm" style={{ color: '#1A6A38' }}>✓</span>
                    <p className="text-xs" style={{ color: '#1A6A38' }}>Fields populated from breakdown. Review and edit below</p>
                  </div>
                )}
                <input placeholder="Project name *" value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} className={inputCls} style={inputStyle} required />
                <input placeholder="Role / Character" value={form.character} onChange={(e) => setForm({ ...form, character: e.target.value })} className={inputCls} style={inputStyle} />
                <input placeholder="Casting Director" value={form.casting_director} onChange={(e) => setForm({ ...form, casting_director: e.target.value })} className={inputCls} style={inputStyle} />
                <input placeholder="Agency / Production Company" value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} className={inputCls} style={inputStyle} />
                <select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} className={inputCls} style={inputStyle}>
                  <option value="film">Film/TV</option>
                  <option value="commercial">Commercial</option>
                  <option value="theatrical">Theatrical</option>
                  <option value="industrial">Industrial</option>
                  <option value="theater">Theater</option>
                  <option value="voiceover">Voice Over</option>
                </select>
                <div>
                  <label className="aurora-eyebrow block mb-1" style={{ color: 'var(--aurora-dim)' }}>Callback Date</label>
                  <input type="datetime-local" value={form.callback_date} onChange={(e) => setForm({ ...form, callback_date: e.target.value })} className={inputCls} style={inputStyle} />
                </div>
                <textarea placeholder="Notes (character description, rate, union status, shoot dates...)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
                <button
                  type="submit"
                  className="w-full font-semibold py-2.5 rounded-xl transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
                    color: '#FFF',
                    boxShadow: '0 8px 20px rgba(212,168,95,0.25)',
                  }}
                >
                  Add Audition
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

  if (loading && allAuditions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid var(--aurora-line)', borderTopColor: 'var(--aurora-heritage-gold)' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 aurora-page-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)', marginBottom: 4 }}>YOUR WORK</span>
          <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
            Audition Tracker
          </h1>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          style={{
            background: 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
            color: '#FFF',
            boxShadow: '0 8px 20px rgba(212,168,95,0.25)',
          }}
        >
          <Plus size={16} />
          New Audition
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => {
          const count = typeCounts[f.key] || 0;
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-150"
              style={active
                ? { background: 'var(--aurora-heritage-gold)', color: '#FFF', boxShadow: '0 4px 12px rgba(212,168,95,0.22)' }
                : { background: 'var(--aurora-surface-solid)', color: 'var(--aurora-sub)', border: '1px solid var(--aurora-line)' }
              }
            >
              {f.icon && <f.icon size={13} />}
              {f.label}
              <span
                className="text-xs font-semibold"
                style={{ color: active ? 'rgba(255,255,255,0.75)' : 'var(--aurora-dim)' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
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
