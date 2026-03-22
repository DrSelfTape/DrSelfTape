/**
 * src/panels/Join/index.jsx
 *
 * Public landing page for room invites — /join/:id
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Film, Megaphone, Clapperboard, Theater, Mic, Building2 } from 'lucide-react';
import { baseURL } from '../../redux/constant';

const TYPE_LABELS = {
  film: 'Film/TV',
  commercial: 'Commercial',
  theatrical: 'Theatrical',
  theater: 'Theater',
  voiceover: 'Voice Over',
  industrial: 'Industrial',
};

const TYPE_ICONS = {
  film: Film,
  commercial: Megaphone,
  theatrical: Clapperboard,
  theater: Theater,
  voiceover: Mic,
  industrial: Building2,
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};

export default function JoinPage() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(baseURL + '/v1/rehearsals/' + id + '/public/')
      .then(r => r.json())
      .then(data => {
        setRoom(data.data || data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-white mb-2">Room not found</p>
          <p className="text-gray-500 text-sm">This room may have been closed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[room.project_type] || Film;
  const participants = room.participants || [];
  const maxP = room.max_participants || 4;
  const status = STATUS_LABELS[room.status] || 'Open';

  return (
    <div className="min-h-screen bg-[#0c0e14] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Dr <span className="text-[#FF8280]">Self Tape</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">Rehearse together, anywhere</p>
      </div>

      {/* Room Card */}
      <div className="w-full max-w-sm bg-[#13151d] rounded-2xl border border-white/[0.06] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF8280]/10 flex items-center justify-center">
            <TypeIcon size={20} className="text-[#FF8280]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{room.title}</h2>
            {room.host_name && (
              <p className="text-xs text-gray-500">Hosted by {room.host_name}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-[#FF8280]/15 text-[#FF8280]">
            {TYPE_LABELS[room.project_type] || room.project_type}
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-[#A7ECDA]/15 text-[#A7ECDA]">
            {status}
          </span>
        </div>

        {/* Participant count */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users size={14} />
          <span>{participants.length}/{maxP} actors</span>
        </div>

        {/* CTAs */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => { window.location.href = '/login?redirect=/join/' + id; }}
            className="w-full bg-[#FF8280] hover:bg-[#e06e6c] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Join with Account
          </button>
          <button
            onClick={() => window.open(room.room_url, '_blank')}
            className="w-full border border-white/10 hover:border-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Join via Daily.co directly
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-500">
        New to Dr Self Tape?{' '}
        <a href="/login" className="text-[#A7ECDA] hover:underline font-medium">Sign up free</a>
      </p>
    </div>
  );
}
