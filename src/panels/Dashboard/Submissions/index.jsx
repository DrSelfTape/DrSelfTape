import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSubmissionsThunk,
  createSubmissionThunk,
  updateSubmissionThunk,
  deleteSubmissionThunk,
  promoteToAuditionThunk,
} from '../../../redux/features/submissions/submissionsSlice';
import StatsCard from '../../../components/StatsCard';
import TalentReportImporter from './TalentReportImporter';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';

// --- Constants ---

const STATUS_TABS = ['all', 'sent', 'callback', 'booked', 'passed'];

const STATUS_BADGE = {
  sent: 'bg-blue-500/10 text-blue-400',
  viewed: 'bg-purple-500/10 text-purple-400',
  callback: 'bg-orange-500/10 text-orange-400',
  passed: 'bg-[#F4F4EE] text-[rgba(10,10,10,0.4)]',
  booked: 'bg-green-500/10 text-green-400',
};

const STATUS_LABELS = {
  sent: 'Sent',
  viewed: 'Viewed',
  callback: 'Callback',
  passed: 'Passed',
  booked: 'Booked',
};

const VIA_BADGE = {
  self_submitted: 'bg-[#F4F4EE] text-[rgba(10,10,10,0.62)]',
  agent: 'bg-blue-500/10 text-blue-400',
  manager: 'bg-purple-500/10 text-purple-400',
  casting_network: 'bg-orange-500/10 text-orange-400',
  actors_access: 'bg-amber-500/10 text-amber-400',
  other: 'bg-[#F4F4EE] text-[rgba(10,10,10,0.4)]',
};

const VIA_LABELS = {
  self_submitted: 'Self Submitted',
  agent: 'Agent',
  manager: 'Manager',
  casting_network: 'Casting Network',
  actors_access: 'Actors Access',
  other: 'Other',
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'status', label: 'Status' },
];

const STATUS_ORDER = { sent: 0, viewed: 1, callback: 2, passed: 3, booked: 4 };

const EMPTY_FORM = {
  project_name: '',
  role: '',
  casting_office: '',
  casting_director: '',
  submitted_via: 'self_submitted',
  submitted_at: new Date().toISOString().slice(0, 16),
  deadline: '',
  video_url: '',
  status: 'sent',
  notes: '',
  follow_up_date: '',
};

// --- Helpers ---

function deadlineClass(deadline) {
  if (!deadline) return '';
  const diff = new Date(deadline) - new Date();
  if (diff < 0) return 'text-red-600 font-semibold';
  if (diff < 86400000) return 'text-orange-500 font-medium';
  return 'text-[rgba(10,10,10,0.62)]';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// --- Skeleton ---

const SkeletonCard = () => (
  <div className="bg-[#1E1E1E] rounded-xl shadow-sm p-4 animate-pulse">
    <div className="flex justify-between mb-3">
      <div className="h-5 bg-[#F4F4EE] rounded w-1/3" />
      <div className="h-5 bg-[#F4F4EE] rounded w-16" />
    </div>
    <div className="h-4 bg-[#F4F4EE] rounded w-1/2 mb-2" />
    <div className="h-3 bg-[#F4F4EE] rounded w-2/3" />
  </div>
);

// --- Main Component ---

export default function Submissions() {
  const dispatch = useDispatch();
  const { submissions, loading, createLoading } = useSelector(
    (state) => state.submissions
  );

  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showModal, setShowModal] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    dispatch(fetchSubmissionsThunk());
  }, [dispatch]);

  // --- Stats ---
  const list = Array.isArray(submissions) ? submissions : [];
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);

  const totalSent = list.length;
  const callbacks = list.filter((s) => s.status === 'callback').length;
  const booked = list.filter((s) => s.status === 'booked').length;
  const thisWeek = list.filter((s) => new Date(s.submitted_at) >= weekAgo).length;

  // --- Filter + Sort ---
  const filtered =
    activeTab === 'all' ? list : list.filter((s) => s.status === activeTab);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (sortBy === 'status') {
      return (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
    }
    return new Date(b.submitted_at) - new Date(a.submitted_at);
  });

  // --- Handlers ---
  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      submitted_at: new Date().toISOString().slice(0, 16),
    });
    setShowModal(true);
  };

  const openEdit = (sub) => {
    setEditingId(sub.id);
    setForm({
      project_name: sub.project_name || '',
      role: sub.role || '',
      casting_office: sub.casting_office || '',
      casting_director: sub.casting_director || '',
      submitted_via: sub.submitted_via || 'self_submitted',
      submitted_at: sub.submitted_at ? sub.submitted_at.slice(0, 16) : '',
      deadline: sub.deadline ? sub.deadline.slice(0, 16) : '',
      video_url: sub.video_url || '',
      status: sub.status || 'sent',
      notes: sub.notes || '',
      follow_up_date: sub.follow_up_date ? sub.follow_up_date.slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_name.trim()) return;

    const payload = { ...form };
    if (!payload.deadline) delete payload.deadline;
    if (!payload.follow_up_date) delete payload.follow_up_date;
    if (!payload.video_url) delete payload.video_url;

    let result;
    if (editingId) {
      result = await dispatch(updateSubmissionThunk({ id: editingId, ...payload }));
      if (updateSubmissionThunk.fulfilled.match(result)) {
        setShowModal(false);
      }
    } else {
      result = await dispatch(createSubmissionThunk(payload));
      if (createSubmissionThunk.fulfilled.match(result)) {
        setShowModal(false);
      }
    }
  };

  const handleDelete = async (id) => {
    await dispatch(deleteSubmissionThunk(id));
  };

  const [promotingId, setPromotingId] = useState(null);
  const handlePromote = async (id) => {
    setPromotingId(id);
    await dispatch(promoteToAuditionThunk({ id }));
    await dispatch(fetchSubmissionsThunk());
    await dispatch(fetchAuditionStatsThunk());
    setPromotingId(null);
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      {showImporter && (
        <TalentReportImporter
          onClose={() => setShowImporter(false)}
          onImported={() => dispatch(fetchSubmissionsThunk())}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Submissions</h1>
        <div className="flex items-center gap-3">
          {/* Import Agency Report button */}
          <button
            onClick={() => setShowImporter(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer border-2"
            style={{ borderColor: '#FF8280', color: '#FF8280', background: 'rgba(255, 130, 128,0.06)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import Report
          </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[#0A0A0A] font-semibold text-sm transition-colors cursor-pointer"
          style={{ backgroundColor: '#FF8280' }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Log Submission
        </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard title="Total Sent" value={String(totalSent)} />
        <StatsCard title="Callbacks" value={String(callbacks)} />
        <StatsCard title="Booked" value={String(booked)} />
        <StatsCard title="This Week" value={String(thisWeek)} />
      </div>

      {/* Filter Tabs + Sort */}
      <div className="flex items-center justify-between">
        <div className="flex gap-6 border-b border-[rgba(10,10,10,0.08)]">
          {STATUS_TABS.map((tab) => {
            const count =
              tab === 'all'
                ? list.length
                : list.filter((s) => s.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'border-b-2 text-[#0A0A0A]'
                    : 'text-[rgba(10,10,10,0.4)] hover:text-[rgba(10,10,10,0.62)]'
                }`}
                style={activeTab === tab ? { borderColor: '#FF8280' } : undefined}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-3 py-1.5 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="mx-auto mb-4 text-[rgba(10,10,10,0.4)] w-12 h-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-[rgba(10,10,10,0.62)] mb-1">No submissions yet.</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[#0A0A0A] font-medium text-sm"
            style={{ backgroundColor: '#FF8280' }}
          >
            Log Your First Submission
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((sub) => (
            <div
              key={sub.id}
              className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[rgba(10,10,10,0.08)] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-sm font-semibold text-[#0A0A0A] truncate">
                      {sub.project_name}
                    </h4>
                    {sub.role && (
                      <span className="text-xs text-[rgba(10,10,10,0.62)] truncate">
                        — {sub.role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sub.casting_office && (
                      <span className="text-xs text-[rgba(10,10,10,0.62)]">
                        {sub.casting_office}
                      </span>
                    )}
                    {sub.casting_director && (
                      <span className="text-xs text-[rgba(10,10,10,0.4)]">
                        CD: {sub.casting_director}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      STATUS_BADGE[sub.status] || STATUS_BADGE.sent
                    }`}
                  >
                    {STATUS_LABELS[sub.status] || sub.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap mt-3">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    VIA_BADGE[sub.submitted_via] || VIA_BADGE.other
                  }`}
                >
                  {VIA_LABELS[sub.submitted_via] || sub.submitted_via}
                </span>

                <span className="text-xs text-[rgba(10,10,10,0.4)]">
                  Sent {formatDate(sub.submitted_at)}
                </span>

                {sub.deadline && (
                  <span className={`text-xs ${deadlineClass(sub.deadline)}`}>
                    Deadline: {formatDate(sub.deadline)}
                  </span>
                )}

                {sub.follow_up_date && (
                  <span className="text-xs text-blue-500">
                    Follow-up: {formatDateTime(sub.follow_up_date)}
                  </span>
                )}
              </div>

              {sub.notes && (
                <p className="text-xs text-[rgba(10,10,10,0.4)] mt-2 line-clamp-2">
                  {sub.notes}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#1E1E1E] mt-3">
                {/* Promote to Audition */}
                {sub.status !== 'viewed' && sub.status !== 'callback' && sub.status !== 'booked' ? (
                  <button
                    onClick={() => handlePromote(sub.id)}
                    disabled={promotingId === sub.id}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    style={{ background: 'rgba(255, 130, 128,0.1)', color: '#FF8280', border: '1px solid rgba(255, 130, 128,0.2)' }}
                  >
                    {promotingId === sub.id ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                        Moving...
                      </>
                    ) : (
                      <>🎬 Got an Audition!</>
                    )}
                  </button>
                ) : (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                    ✓ In Audition Tracker
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(sub)}
                    className="text-xs text-[rgba(10,10,10,0.4)] hover:text-[#7A5A18] transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="text-xs text-[rgba(10,10,10,0.4)] hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log / Edit Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#0A0A0A]">
                {editingId ? 'Edit Submission' : 'Log Submission'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[rgba(10,10,10,0.4)] hover:text-[rgba(10,10,10,0.62)] cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.project_name}
                  onChange={(e) =>
                    setForm({ ...form, project_name: e.target.value })
                  }
                  placeholder="e.g. The Last Chapter"
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Detective Monroe"
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                />
              </div>

              {/* Casting Office + CD */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                    Casting Office
                  </label>
                  <input
                    type="text"
                    value={form.casting_office}
                    onChange={(e) =>
                      setForm({ ...form, casting_office: e.target.value })
                    }
                    placeholder="e.g. Telsey"
                    className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                    Casting Director
                  </label>
                  <input
                    type="text"
                    value={form.casting_director}
                    onChange={(e) =>
                      setForm({ ...form, casting_director: e.target.value })
                    }
                    placeholder="e.g. Jane Smith"
                    className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Submitted Via */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Submitted Via
                </label>
                <select
                  value={form.submitted_via}
                  onChange={(e) =>
                    setForm({ ...form, submitted_via: e.target.value })
                  }
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                >
                  {Object.entries(VIA_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Submitted + Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                    Date Submitted
                  </label>
                  <input
                    type="datetime-local"
                    value={form.submitted_at}
                    onChange={(e) =>
                      setForm({ ...form, submitted_at: e.target.value })
                    }
                    className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm({ ...form, deadline: e.target.value })
                    }
                    className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Video URL
                </label>
                <input
                  type="url"
                  value={form.video_url}
                  onChange={(e) =>
                    setForm({ ...form, video_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Any notes about this submission..."
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm resize-none"
                />
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-medium text-[rgba(10,10,10,0.62)] mb-1">
                  Follow-up Date
                </label>
                <input
                  type="datetime-local"
                  value={form.follow_up_date}
                  onChange={(e) =>
                    setForm({ ...form, follow_up_date: e.target.value })
                  }
                  className="w-full border border-[rgba(10,10,10,0.14)] bg-[#F4F4EE] text-[#0A0A0A] rounded-lg px-4 py-3 focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-[rgba(10,10,10,0.62)] bg-[#F4F4EE] hover:bg-[#3A3A3A] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !form.project_name.trim()}
                  className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-4 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading
                    ? 'Saving...'
                    : editingId
                    ? 'Update Submission'
                    : 'Log Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
