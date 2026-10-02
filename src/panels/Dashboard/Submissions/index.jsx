import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSubmissionsThunk,
  createSubmissionThunk,
  updateSubmissionThunk,
  deleteSubmissionThunk,
  promoteToAuditionThunk,
} from '../../../redux/features/submissions/submissionsSlice';
import { NoDataFound } from '../../../components/Shared/NoDataFound';
import TalentReportImporter from './TalentReportImporter';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';
import useAuditionNotification from '../../../hooks/useAuditionNotification';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { clearAuditionNotification } from '../../../utils/auditionNotification';
import '../studioScreens.css';

// --- Constants ---

const STATUS_TABS = ['all', 'sent', 'viewed', 'callback', 'booked', 'passed'];

// Studio has one accent — brass — so status reads from tone + label, not from
// six competing hues. `ink` is the neutral in-progress tone.
const STATUS_TONE = {
  sent: 'quiet',
  viewed: 'ink',
  callback: 'brass',
  passed: 'quiet',
  booked: 'ok',
};

const STATUS_LABELS = {
  sent: 'Sent',
  viewed: 'Viewed',
  callback: 'Callback',
  passed: 'Passed',
  booked: 'Booked',
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

function deadlineTone(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff < 0) return 'alert';
  if (diff < 86400000) return 'brass';
  return null;
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
  <div className="sx-card" aria-hidden="true">
    <div className="flex justify-between gap-3 mb-3">
      <div className="sx-skel h-4 w-1/3" />
      <div className="sx-skel h-4 w-16" />
    </div>
    <div className="sx-skel h-3 w-1/2 mb-2" />
    <div className="sx-skel h-3 w-2/3" />
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
  const [reminderSubmissionId, setReminderSubmissionId] = useState(null);
  const notificationTarget = useAuditionNotification('submissions');

  // The log/edit sheet covers the screen on iPhone; without this the native
  // top bar (bell + avatar) clips its title row.
  useHideMobileHeader(showModal);

  useEffect(() => {
    if (!notificationTarget) return;
    let cancelled = false;
    setReminderSubmissionId(null);
    dispatch(fetchSubmissionsThunk()).unwrap().then(items => {
      if (cancelled) return;
      const exists = Array.isArray(items) && items.some(item => String(item.id) === notificationTarget.id);
      if (exists) {
        setActiveTab('all');
        setReminderSubmissionId(notificationTarget.id);
      }
      clearAuditionNotification(notificationTarget);
    }).catch(() => { /* keep the handoff for retry on the next panel mount */ });
    return () => { cancelled = true; };
  }, [notificationTarget, dispatch]);

  useEffect(() => {
    if (!reminderSubmissionId || loading) return;
    const card = document.getElementById(`submission-${reminderSubmissionId}`);
    card?.scrollIntoView({ block: 'center' });
    card?.focus({ preventScroll: true });
  }, [reminderSubmissionId, loading, activeTab]);

  useEffect(() => {
    dispatch(fetchSubmissionsThunk());
    dispatch(fetchAuditionStatsThunk());
  }, [dispatch]);

  // --- Stats ---
  // Pipeline numbers come from the ONE server-side metrics module (P1-02),
  // never recomputed locally: this page used to count current statuses over
  // its own list and showed "0 callbacks" while the tracker showed 6 for
  // the same user. `reached_*` semantics: a booked row still counts as a
  // callback. Local list math survives only for thisWeek (a list-scoped
  // display detail, not a pipeline metric).
  const pipelineStats = useSelector((state) => state.auditions.stats?.data?.pipeline);
  const list = Array.isArray(submissions) ? submissions : [];
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);

  const totalSent = pipelineStats?.total ?? list.length;
  const callbacks = pipelineStats?.reached_callback ?? 0;
  const booked = pipelineStats?.reached_booked ?? 0;
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

  // Empty-state copy says what will fill the screen, and the button goes
  // there. A filtered-to-nothing tab is a different situation from a user
  // who has never logged anything, so it gets its own sentence.
  const emptyCopy = activeTab === 'all'
    ? {
        message:
          'Every tape you send lands here — project, role, who you sent it to, and what came back. Log the last one you sent and the pipeline above starts counting.',
        action: { label: 'Log your first submission', onClick: openCreate },
      }
    : {
        message: `Nothing marked ${STATUS_LABELS[activeTab]?.toLowerCase() || activeTab} yet. Submissions move here as you update them.`,
        action: { label: 'Show all submissions', onClick: () => setActiveTab('all') },
      };

  // --- Render ---
  return (
    <div className="sx sx-page space-y-6">
      {showImporter && (
        <TalentReportImporter
          onClose={() => setShowImporter(false)}
          onImported={() => dispatch(fetchSubmissionsThunk())}
        />
      )}

      {/* Header — stacks on mobile so the buttons don't crash into the title */}
      <div className="sx-head">
        <div>
          <span className="sx-eyebrow">YOUR WORK</span>
          <h1 className="sx-title">Submissions</h1>
        </div>
        <div className="sx-actions">
          <button
            type="button"
            onClick={() => setShowImporter(true)}
            className="sx-btn sx-btn--sm sx-btn--quiet"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import report
          </button>
          <button type="button" onClick={openCreate} className="sx-btn sx-btn--sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log submission
          </button>
        </div>
      </div>

      {/* Pipeline ledger */}
      <div className="sx-ledger">
        <div><span className="sx-eyebrow">Total sent</span><b>{totalSent}</b></div>
        <div><span className="sx-eyebrow">Callbacks</span><b>{callbacks}</b></div>
        <div><span className="sx-eyebrow">Booked</span><b>{booked}</b></div>
        <div><span className="sx-eyebrow">This week</span><b>{thisWeek}</b></div>
      </div>

      {/* Filter tabs + sort */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="sx-tabs sx-scroll-x -mx-1 px-1" role="tablist" aria-label="Filter submissions by status">
          {STATUS_TABS.map((tab) => {
            const count =
              tab === 'all'
                ? list.length
                : list.filter((s) => s.status === tab).length;
            return (
              <button
                key={tab}
                role="tab"
                type="button"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className="sx-tab"
              >
                {tab}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <label className="sx-meta flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="sr-only">Sort submissions</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sx-select"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <NoDataFound
          title={activeTab === 'all' ? 'No submissions logged yet' : 'Nothing in this tab'}
          message={emptyCopy.message}
          action={emptyCopy.action}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((sub) => {
            const dTone = deadlineTone(sub.deadline);
            return (
              <div
                key={sub.id}
                id={`submission-${sub.id}`}
                tabIndex={-1}
                className={`sx-card${String(sub.id) === reminderSubmissionId ? ' sx-card--flagged' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--sx-ink)' }}>
                      {sub.project_name}
                      {sub.role && <span className="sx-meta font-normal"> · {sub.role}</span>}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {sub.casting_office && (
                        <span className="sx-meta">{sub.casting_office}</span>
                      )}
                      {sub.casting_director && (
                        <span className="sx-meta sx-meta--faint">CD: {sub.casting_director}</span>
                      )}
                    </div>
                  </div>
                  <span className="sx-badge" data-tone={STATUS_TONE[sub.status] || 'quiet'}>
                    {STATUS_LABELS[sub.status] || sub.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap mt-3">
                  <span className="sx-badge" data-tone="quiet">
                    {VIA_LABELS[sub.submitted_via] || sub.submitted_via}
                  </span>

                  <span className="sx-meta sx-meta--faint">
                    Sent {formatDate(sub.submitted_at)}
                  </span>

                  {sub.deadline && (
                    <span
                      className="sx-meta"
                      style={dTone ? { color: `var(--sx-${dTone === 'alert' ? 'alert' : 'gold-ink'})`, fontWeight: 600 } : undefined}
                    >
                      Deadline {formatDate(sub.deadline)}
                    </span>
                  )}

                  {sub.follow_up_date && (
                    <span className="sx-meta">
                      Follow-up {formatDateTime(sub.follow_up_date)}
                    </span>
                  )}
                </div>

                {sub.notes && (
                  <p className="sx-meta mt-2 line-clamp-2">{sub.notes}</p>
                )}

                <div className="sx-divider flex items-center justify-between gap-3 flex-wrap">
                  {/* Promote to Audition */}
                  {sub.status !== 'viewed' && sub.status !== 'callback' && sub.status !== 'booked' ? (
                    <button
                      type="button"
                      onClick={() => handlePromote(sub.id)}
                      disabled={promotingId === sub.id}
                      className="sx-btn sx-btn--sm sx-btn--brass"
                    >
                      {promotingId === sub.id ? 'Moving…' : 'Got an audition'}
                    </button>
                  ) : (
                    <span className="sx-badge" data-tone="ok">In audition tracker</span>
                  )}

                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => openEdit(sub)} className="sx-textbtn">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub.id)}
                      className="sx-textbtn sx-textbtn--alert"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log / Edit Submission sheet */}
      {showModal && (
        <>
          <div className="sx-backdrop" onClick={() => setShowModal(false)} />
          <div className="sx sx-modal">
            <div className="sx-sheet">
              <div className="sx-sheet-head">
                <div>
                  <span className="sx-eyebrow">{editingId ? 'EDIT' : 'NEW'}</span>
                  <h2 className="sx-title sx-title--sm">
                    {editingId ? 'Edit submission' : 'Log a submission'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                  className="sx-icon-btn"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="sx-label" htmlFor="sub-project">Project name *</label>
                  <input
                    id="sub-project"
                    type="text"
                    required
                    value={form.project_name}
                    onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                    placeholder="e.g. The Last Chapter"
                    className="sx-input"
                  />
                </div>

                <div>
                  <label className="sx-label" htmlFor="sub-role">Role</label>
                  <input
                    id="sub-role"
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="e.g. Detective Monroe"
                    className="sx-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="sx-label" htmlFor="sub-office">Casting office</label>
                    <input
                      id="sub-office"
                      type="text"
                      value={form.casting_office}
                      onChange={(e) => setForm({ ...form, casting_office: e.target.value })}
                      placeholder="e.g. Telsey"
                      className="sx-input"
                    />
                  </div>
                  <div>
                    <label className="sx-label" htmlFor="sub-cd">Casting director</label>
                    <input
                      id="sub-cd"
                      type="text"
                      value={form.casting_director}
                      onChange={(e) => setForm({ ...form, casting_director: e.target.value })}
                      placeholder="e.g. Jane Smith"
                      className="sx-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="sx-label" htmlFor="sub-via">Submitted via</label>
                  <select
                    id="sub-via"
                    value={form.submitted_via}
                    onChange={(e) => setForm({ ...form, submitted_via: e.target.value })}
                    className="sx-input"
                  >
                    {Object.entries(VIA_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="sx-label" htmlFor="sub-sent">Date submitted</label>
                    <input
                      id="sub-sent"
                      type="datetime-local"
                      value={form.submitted_at}
                      onChange={(e) => setForm({ ...form, submitted_at: e.target.value })}
                      className="sx-input"
                    />
                  </div>
                  <div>
                    <label className="sx-label" htmlFor="sub-deadline">Deadline</label>
                    <input
                      id="sub-deadline"
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="sx-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="sx-label" htmlFor="sub-video">Video URL</label>
                  <input
                    id="sub-video"
                    type="url"
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    placeholder="https://..."
                    className="sx-input"
                  />
                </div>

                <div>
                  <label className="sx-label" htmlFor="sub-status">Status</label>
                  <select
                    id="sub-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="sx-input"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="sx-label" htmlFor="sub-notes">Notes</label>
                  <textarea
                    id="sub-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    placeholder="Anything worth remembering about this one…"
                    className="sx-input"
                  />
                </div>

                <div>
                  <label className="sx-label" htmlFor="sub-followup">Follow-up date</label>
                  <input
                    id="sub-followup"
                    type="datetime-local"
                    value={form.follow_up_date}
                    onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                    className="sx-input"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="sx-btn sx-btn--quiet flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || !form.project_name.trim()}
                    className="sx-btn flex-1"
                  >
                    {createLoading
                      ? 'Saving…'
                      : editingId
                      ? 'Update'
                      : 'Log submission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
