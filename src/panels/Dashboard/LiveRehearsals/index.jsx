/**
 * src/panels/Dashboard/LiveRehearsals/index.jsx
 *
 * Fixes applied:
 *  4. Participant avatars on room cards (initials in colored circles)
 *  5. Room status badges (open/in_progress/closed)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, Users, Clock, X, Film, Mic, Theater,
  Megaphone, Building2, Clapperboard, Video,
  UserPlus, Copy, Check, MessageCircle,
} from 'lucide-react';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';
import {
  fetchRoomsThunk,
  createRoomThunk,
} from '../../../redux/features/rehearsals/rehearsalsSlice';

/* ── Helpers ── */

function nameColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#FF8280', '#A7ECDA', '#FCE072', '#FFB49A', '#b89aff', '#5ee6b8', '#7eb8ec'];
  return colors[Math.abs(hash) % colors.length];
}

function initials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?';
}

const STATUS_CONFIG = {
  open: { label: 'Open', bg: 'bg-green-500/15', text: 'text-green-400' },
  in_progress: { label: 'In Progress', bg: 'bg-[#FCE072]/15', text: 'text-[#FCE072]' },
  closed: { label: 'Closed', bg: 'bg-gray-500/15', text: 'text-gray-400' },
};

const TYPE_ICONS = {
  film: Film,
  commercial: Megaphone,
  theatrical: Clapperboard,
  theater: Theater,
  voiceover: Mic,
  industrial: Building2,
};

/* ── Room Card ── */

function RoomCard({ room, onJoin, onInvite }) {
  const statusCfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.open;
  const TypeIcon = TYPE_ICONS[room.project_type] || Film;
  const participants = room.participants || [];
  const isFull = participants.length >= (room.max_participants || 4);

  return (
    <div className="bg-[#13151d] rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all p-4 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF8280]/10 flex items-center justify-center shrink-0">
            <TypeIcon size={16} className="text-[#FF8280]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{room.title}</h3>
            {room.host_name && (
              <p className="text-xs text-gray-500 truncate">by {room.host_name}</p>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Description */}
      {room.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{room.description}</p>
      )}

      {/* Script badge */}
      {room.script_title && (
        <div className="flex items-center gap-1.5 text-xs text-[#A7ECDA] mb-3">
          <Video size={12} />
          <span className="truncate">{room.script_title}</span>
        </div>
      )}

      {/* Footer: Participants + Join */}
      <div className="flex items-center justify-between">
        {/* FIX 4: Participant avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {participants.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#13151d]"
                style={{ backgroundColor: nameColor(`${p.first_name}${p.last_name}`) }}
                title={`${p.first_name} ${p.last_name}`}
              >
                {initials(p.first_name, p.last_name)}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-gray-400 font-semibold border-2 border-[#13151d]">
                +{participants.length - 3}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {participants.length}/{room.max_participants || 4}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onInvite(room)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#FF8280] hover:bg-[#FF8280]/10 transition-colors"
            title="Invite"
          >
            <UserPlus size={14} />
          </button>
          <button
            onClick={() => onJoin(room.id)}
            disabled={isFull || room.status === 'closed'}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors
              bg-[#FF8280] hover:bg-[#e06e6c] text-white
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isFull ? 'Full' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Invite Modal ── */

function InviteModal({ room, onClose }) {
  const [tab, setTab] = useState('invite');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [invited, setInvited] = useState({});
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      axios.get(endPoints.searchUsers + '?q=' + encodeURIComponent(query.trim()))
        .then(res => setResults(res.data?.data || res.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleInvite = (user) => {
    axios.post(endPoints.roomInvite, { room_id: room.id, user_id: user.id })
      .then(() => setInvited(prev => ({ ...prev, [user.id]: true })))
      .catch(() => {});
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const inputCls = 'w-full bg-[#13151d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#A7ECDA]/30';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="text-lg font-bold text-gray-900">Invite to {room.title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-5">
            {[['invite', 'Invite Users'], ['share', 'Share Link']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === key ? 'border-[#FF8280] text-[#FF8280]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 min-h-[280px]">
            {tab === 'invite' ? (
              <div className="space-y-3">
                <input
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#FF8280]/40"
                />
                {searching && (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!searching && query && results.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No users found</p>
                )}
                {!searching && results.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: nameColor(`${user.first_name || ''}${user.last_name || ''}`) }}
                      >
                        {initials(user.first_name, user.last_name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    {invited[user.id] ? (
                      <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                        <Check size={14} /> Invited
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInvite(user)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF8280] hover:bg-[#e06e6c] text-white transition-colors"
                      >
                        Invite
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Copy Daily Link */}
                <button
                  onClick={() => handleCopy(room.room_url, 'daily')}
                  className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Copy Daily Link</p>
                    <p className="text-xs text-gray-400">Direct Daily.co link - no account needed</p>
                  </div>
                  {copied === 'daily' ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                </button>

                {/* Copy Invite Link */}
                <button
                  onClick={() => handleCopy(window.location.origin + '/join/' + room.id, 'invite')}
                  className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Copy Invite Link</p>
                    <p className="text-xs text-gray-400">Branded join page for new users</p>
                  </div>
                  {copied === 'invite' ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent('Join my rehearsal: ' + room.room_url))}
                  className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-900">Share via WhatsApp</span>
                </button>

                {/* SMS */}
                <button
                  onClick={() => window.open('sms:?body=' + encodeURIComponent('Join my rehearsal: ' + room.room_url))}
                  className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={16} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">Share via SMS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Create Room Modal ── */

function CreateModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_type: 'film',
    max_participants: 4,
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreate(form);
    setForm({ title: '', description: '', project_type: 'film', max_participants: 4 });
    onClose();
  };

  const inputCls = 'w-full bg-[#13151d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#A7ECDA]/30';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-[#1a1c26] rounded-2xl w-full max-w-md p-6 space-y-4 border border-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Create room</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-400">
              <X size={18} />
            </button>
          </div>

          <input
            placeholder="Room title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputCls}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className={`${inputCls} resize-none`}
          />
          <select
            value={form.project_type}
            onChange={(e) => setForm({ ...form, project_type: e.target.value })}
            className={inputCls}
          >
            <option value="film">Film/TV</option>
            <option value="commercial">Commercial</option>
            <option value="theatrical">Theatrical</option>
            <option value="theater">Theater</option>
            <option value="voiceover">Voice Over</option>
            <option value="industrial">Industrial</option>
          </select>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max participants</label>
            <select
              value={form.max_participants}
              onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })}
              className={inputCls}
            >
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-[#FF8280] hover:bg-[#e06e6c] text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Create room
          </button>
        </form>
      </div>
    </>
  );
}

/* ── Main Export ── */

export default function LiveRehearsals() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { rooms, loading } = useSelector((state) => state.rehearsals);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteRoom, setInviteRoom] = useState(null);

  useEffect(() => {
    dispatch(fetchRoomsThunk());
  }, [dispatch]);

  const handleJoin = (roomId) => {
    navigate(`/dashboard/live-rehearsals/room/${roomId}`);
  };

  const handleCreate = async (form) => {
    const result = await dispatch(createRoomThunk(form)).unwrap();
    if (result?.data?.id) {
      navigate(`/dashboard/live-rehearsals/room/${result.data.id}`);
    } else {
      dispatch(fetchRoomsThunk());
    }
  };

  const roomList = rooms?.data || rooms || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Live Rehearsals</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#FF8280] hover:bg-[#e06e6c] text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus size={16} />
          New Room
        </button>
      </div>

      {/* Room Grid */}
      {loading && roomList.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : roomList.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No rehearsal rooms yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-[#FF8280] font-semibold hover:underline"
          >
            Create the first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomList.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoin} onInvite={setInviteRoom} />
          ))}
        </div>
      )}

      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      {inviteRoom && (
        <InviteModal
          room={inviteRoom}
          onClose={() => setInviteRoom(null)}
        />
      )}
    </div>
  );
}
