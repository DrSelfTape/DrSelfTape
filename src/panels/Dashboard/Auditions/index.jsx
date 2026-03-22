/**
 * Auditions Kanban — Drag & Drop Tracker
 * src/panels/Dashboard/Auditions/index.jsx
 *
 * Features:
 *  • @dnd-kit drag-and-drop kanban columns
 *  • Filter pills by project type (client-side)
 *  • Click → detail side panel (view / edit / delete)
 *  • Quick-action buttons on each card (advance / pass)
 *  • Callback countdown badges + pulse glow
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  X, ChevronRight, ChevronDown, Trash2, Edit3, Save,
  GripVertical, CheckCircle2, XCircle, Calendar, Clock,
  Film, Mic, Theater, Megaphone, Building2, Clapperboard,
  Plus, Search, Filter,
} from 'lucide-react';
import {
  fetchTrackerThunk,
  fetchAuditionStatsThunk,
  updateAuditionThunk,
  deleteAuditionThunk,
  createAuditionThunk,
} from '../../../redux/features/auditions/auditionsSlice';

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const COLUMNS = [
  { id: 'submitted',  label: 'Submitted',  color: '#6b7280' },
  { id: 'in_review',  label: 'In Review',  color: '#3b82f6' },
  { id: 'callback',   label: 'Callback',   color: '#f59e0b' },
  { id: 'booked',     label: 'Booked',     color: '#22c55e' },
  { id: 'passed',     label: 'Passed',     color: '#ef4444' },
];

const STATUS_ORDER = ['submitted', 'in_review', 'callback', 'booked'];

// Map internal status → API status (backend uses "reviewed" not "in_review")
const STATUS_TO_API = {
  submitted: 'submitted',
  in_review: 'reviewed',
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
  film: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-400' },
  commercial: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  theatrical: { bg: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400' },
  industrial: { bg: 'bg-gray-50 text-gray-600', dot: 'bg-gray-400' },
  theater: { bg: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
  voiceover: { bg: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400' },
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function callbackLabel(dateStr) {
  if (!dateStr) return null;
  const cb = new Date(dateStr);
  const now = new Date();
  const diffMs = cb.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / 86400000);
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

/* ═══════════════════════════════════════════════════════════════════
   SORTABLE AUDITION CARD
   ═══════════════════════════════════════════════════════════════════ */

function SortableCard({ audition, onClick, onAdvance, onPass }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(audition.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cb = callbackLabel(audition.callback_date);
  const badge = TYPE_BADGES[audition.project_type] || TYPE_BADGES.film;
  const canAdvance = nextStatus(audition._column) !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white rounded-xl border border-gray-100 shadow-sm
        transition-all duration-200 cursor-pointer
        ${isDragging ? 'shadow-xl opacity-90 rotate-1 scale-105 z-50' : 'hover:shadow-md hover:border-gray-200'}
        ${cb?.urgent ? 'ring-2 ring-[#ff6b35]/40 animate-[pulse-glow_2s_ease-in-out_infinite]' : ''}
      `}
      onClick={() => onClick(audition)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2.5 left-1.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      <div className="pl-6 pr-3 py-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">
            {audition.project_title}
          </h4>
          {/* Quick Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {canAdvance && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdvance(audition); }}
                className="p-1 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                title="Advance status"
              >
                <CheckCircle2 size={15} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onPass(audition); }}
              className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
              title="Move to passed"
            >
              <XCircle size={15} />
            </button>
          </div>
        </div>

        {/* Character & CD */}
        {audition.character && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            as <span className="font-medium text-gray-700">{audition.character}</span>
          </p>
        )}
        {audition.casting_director && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
            CD: {audition.casting_director}
          </p>
        )}

        {/* Footer: type badge + callback */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {audition.project_type}
          </span>
          {cb && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cb.urgent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
              <Clock size={10} />
              {cb.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STATIC CARD (for DragOverlay — no sortable hooks)
   ═══════════════════════════════════════════════════════════════════ */

function StaticCard({ audition }) {
  const badge = TYPE_BADGES[audition.project_type] || TYPE_BADGES.film;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xl opacity-90 rotate-1 scale-105 w-64">
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-900">{audition.project_title}</h4>
        {audition.character && (
          <p className="text-xs text-gray-500 mt-0.5">as {audition.character}</p>
        )}
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mt-2 ${badge.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          {audition.project_type}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DROPPABLE COLUMN
   ═══════════════════════════════════════════════════════════════════ */

function KanbanColumn({ column, items, onCardClick, onAdvance, onPass }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const ids = useMemo(() => items.map((a) => String(a.id)), [items]);

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-sm font-semibold text-gray-700">{column.label}</h3>
        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto">
          {items.length}
        </span>
      </div>

      {/* Card Stack */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 flex flex-col gap-2 p-2 rounded-xl min-h-[200px]
          transition-colors duration-200
          ${isOver ? 'bg-[#ff6b35]/5 ring-2 ring-[#ff6b35]/20' : 'bg-gray-50/60'}
        `}
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
          <div className="flex items-center justify-center h-24 text-xs text-gray-300">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DETAIL SIDE PANEL
   ═══════════════════════════════════════════════════════════════════ */

function DetailPanel({ audition, onClose, onSave, onDelete, onStatusChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (audition) {
      setForm({ ...audition });
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [audition]);

  // Close on click outside
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

  const handleSave = () => {
    onSave(form);
    setEditing(false);
  };

  const Field = ({ label, field, type = 'text', options }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      {editing ? (
        type === 'select' ? (
          <select
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] outline-none transition-all"
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
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] outline-none transition-all resize-none"
          />
        ) : (
          <input
            type={type}
            value={form[field] || ''}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] outline-none transition-all"
          />
        )
      ) : (
        <p className="text-sm text-gray-800">{form[field] || '—'}</p>
      )}
    </div>
  );

  const cb = callbackLabel(audition.callback_date);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-96 bg-white z-50 shadow-2xl border-l border-gray-100 overflow-y-auto animate-[slide-in_0.25s_ease-out]"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-gray-900 line-clamp-1 pr-4">
            {audition.project_title}
          </h2>
          <div className="flex items-center gap-1">
            {editing ? (
              <button
                onClick={handleSave}
                className="p-2 rounded-lg bg-[#ff6b35] text-white hover:bg-[#e55a2b] transition-colors"
              >
                <Save size={16} />
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Edit3 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Callback Badge */}
          {cb && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${cb.urgent ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-600'}`}>
              <Calendar size={14} />
              Callback {cb.text}
            </div>
          )}

          {/* Move-to Status Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</label>
            <select
              value={audition._column}
              onChange={(e) => onStatusChange(audition.id, e.target.value)}
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] outline-none"
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
          </div>

          {/* Fields */}
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

          {/* Delete */}
          <div className="pt-4 border-t border-gray-100">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">Delete this audition?</span>
                <button
                  onClick={() => onDelete(audition.id)}
                  className="px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors"
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
}

/* ═══════════════════════════════════════════════════════════════════
   NEW AUDITION FORM (modal)
   ═══════════════════════════════════════════════════════════════════ */

function NewAuditionModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    project: '',
    role: '',
    casting_director: '',
    agency: '',
    project_type: 'film',
    callback_date: '',
    notes: '',
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.project.trim()) return;
    onSubmit(form);
    setForm({ project: '', role: '', casting_director: '', agency: '', project_type: 'film', callback_date: '', notes: '' });
    onClose();
  };

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] outline-none transition-all';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-[scale-in_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">New Audition</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <input placeholder="Project name *" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={inputCls} required />
          <input placeholder="Role / Character" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls} />
          <input placeholder="Casting Director" value={form.casting_director} onChange={(e) => setForm({ ...form, casting_director: e.target.value })} className={inputCls} />
          <input placeholder="Agency" value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} className={inputCls} />
          <select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} className={inputCls}>
            <option value="film">Film/TV</option>
            <option value="commercial">Commercial</option>
            <option value="theatrical">Theatrical</option>
            <option value="industrial">Industrial</option>
            <option value="theater">Theater</option>
            <option value="voiceover">Voice Over</option>
          </select>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Callback Date</label>
            <input type="datetime-local" value={form.callback_date} onChange={(e) => setForm({ ...form, callback_date: e.target.value })} className={inputCls} />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={`${inputCls} resize-none`} />

          <button
            type="submit"
            className="w-full bg-[#ff6b35] hover:bg-[#e55a2b] text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Add Audition
          </button>
        </form>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT — AUDITIONS KANBAN PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function DashboardAuditions() {
  const dispatch = useDispatch();
  const { tracker, loading } = useSelector((state) => state.auditions);

  const [activeFilter, setActiveFilter] = useState('all');
  const [activeDragId, setActiveDragId] = useState(null);
  const [selectedAudition, setSelectedAudition] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Flatten tracker buckets into a single array with _column tag
  const allAuditions = useMemo(() => {
    const data = tracker?.data || {};
    const list = [];
    for (const col of COLUMNS) {
      const items = data[col.id] || [];
      items.forEach((item) => list.push({ ...item, _column: col.id }));
    }
    return list;
  }, [tracker]);

  // Client-side type filter
  const filteredAuditions = useMemo(() => {
    if (activeFilter === 'all') return allAuditions;
    return allAuditions.filter((a) => a.project_type === activeFilter);
  }, [allAuditions, activeFilter]);

  // Group by column
  const columns = useMemo(() => {
    const grouped = {};
    for (const col of COLUMNS) grouped[col.id] = [];
    filteredAuditions.forEach((a) => {
      if (grouped[a._column]) grouped[a._column].push(a);
    });
    return grouped;
  }, [filteredAuditions]);

  // Type counts (unfiltered)
  const typeCounts = useMemo(() => {
    const counts = { all: allAuditions.length };
    allAuditions.forEach((a) => {
      counts[a.project_type] = (counts[a.project_type] || 0) + 1;
    });
    return counts;
  }, [allAuditions]);

  // Active dragging card (for overlay)
  const activeCard = useMemo(
    () => allAuditions.find((a) => String(a.id) === activeDragId),
    [allAuditions, activeDragId]
  );

  // Sensors — small activation distance to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    dispatch(fetchTrackerThunk());
  }, [dispatch]);

  /* ── Status change (used by drag, quick actions, side panel) ─── */
  const changeStatus = useCallback(
    async (auditionId, newColumn) => {
      const apiStatus = STATUS_TO_API[newColumn];
      if (!apiStatus) return;
      try {
        await dispatch(updateAuditionThunk({ id: auditionId, data: { status: apiStatus } })).unwrap();
      } catch {
        // Revert handled inside thunk (re-fetch)
      }
      dispatch(fetchTrackerThunk());
      dispatch(fetchAuditionStatsThunk());
    },
    [dispatch]
  );

  /* ── Drag handlers ─────────────────────────────────────────── */
  const onDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const onDragEnd = useCallback(
    (event) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;

      const auditionId = Number(active.id);
      // "over" could be a card id or a column id — find the column
      let targetColumn = over.id;
      // If we dropped on a card, resolve its column
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

  /* ── Quick actions ──────────────────────────────────────────── */
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

  /* ── Side panel save / delete ───────────────────────────────── */
  const handleSave = useCallback(
    async (form) => {
      const payload = {
        project_type: form.project_type,
        agency: form.agency || '',
        callback_date: form.callback_date || null,
        notes: form.notes || '',
      };
      await dispatch(updateAuditionThunk({ id: form.id, data: payload })).unwrap();
      dispatch(fetchTrackerThunk());
      dispatch(fetchAuditionStatsThunk());
      setSelectedAudition(null);
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    async (id) => {
      await dispatch(deleteAuditionThunk(id)).unwrap();
      dispatch(fetchTrackerThunk());
      dispatch(fetchAuditionStatsThunk());
      setSelectedAudition(null);
    },
    [dispatch]
  );

  /* ── Create ─────────────────────────────────────────────────── */
  const handleCreate = useCallback(
    async (form) => {
      await dispatch(createAuditionThunk(form)).unwrap();
      dispatch(fetchTrackerThunk());
      dispatch(fetchAuditionStatsThunk());
    },
    [dispatch]
  );

  /* ── Loading state ──────────────────────────────────────────── */
  if (loading && allAuditions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#ff6b35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audition Tracker</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-[#ff6b35] hover:bg-[#e55a2b] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
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
              className={`
                flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full
                transition-all duration-150
                ${active
                  ? 'bg-[#ff6b35] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {f.icon && <f.icon size={13} />}
              {f.label}
              <span className={`text-xs font-semibold ${active ? 'text-white/70' : 'text-gray-400'}`}>
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

      {/* Detail Side Panel */}
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

      {/* New Audition Modal */}
      <NewAuditionModal
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        onSubmit={handleCreate}
      />

      {/* Custom Animations */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0); }
          50% { box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.15); }
        }
      `}</style>
    </div>
  );
}
