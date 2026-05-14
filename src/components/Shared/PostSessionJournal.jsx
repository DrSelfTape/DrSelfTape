import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, BookOpen, Check, Star } from 'lucide-react';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { updateSessionLog } from '../../redux/features/jericho/jerichoSlice';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';

const MOOD_OPTIONS = [
  { emoji: '🔥', label: 'Nailed it' },
  { emoji: '😊', label: 'Felt good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🤔', label: 'Need more work' },
];

/**
 * Post-session journal prompt shown after practice/recording sessions.
 *
 * Props:
 *   sessionType — 'self-tape' | 'scene-study' | 'live-scene' | 'cd-coach'
 *   scriptTitle — optional script/scene title for context
 *   onClose     — dismiss
 */
export default function PostSessionJournal({ sessionType, scriptTitle, onClose }) {
  const dispatch = useDispatch();
  const lastSessionLogId = useSelector((s) => s.jericho?.lastSessionLogId);
  const [mood, setMood] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!mood && !note.trim() && rating === 0) { onClose(); return; }
    setSaving(true);
    try {
      await axios.post(`${baseURL}/v1/growth/journal/`, {
        session_type: sessionType,
        script_title: scriptTitle || '',
        mood: mood?.label || '',
        rating: rating || undefined,
        note: note.trim(),
        created_at: new Date().toISOString(),
      });
      // Also update the Jericho session log with mood/rating/notes
      if (lastSessionLogId) {
        dispatch(updateSessionLog({
          sessionId: lastSessionLogId,
          user_mood: mood?.label || '',
          user_rating: rating || undefined,
          user_notes: note.trim(),
        }));
      }
      setSaved(true);
      setTimeout(onClose, 1000);
    } catch {
      // Nothing else reads `drst-journal`, so the previous localStorage
      // fallback created data the user could never see. Surface a real
      // error so they can retry.
      dispatch(showSnackbar({
        message: "Couldn't save your journal entry. Please try again.",
        variant: 'error',
      }));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
        <div className="rounded-2xl p-8 text-center w-full max-w-sm mx-4" style={{ background: 'var(--bg-surface, #1E1E1E)' }}>
          <div className="w-16 h-16 rounded-full bg-[#D4A85F]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-[#7A5A18]" />
          </div>
          <p className="text-[#0A0A0A] font-bold text-lg">Journal saved</p>
          <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">Tracking your progress builds awareness.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 mx-0 sm:mx-4" style={{ background: 'var(--bg-surface, #1E1E1E)', border: '1px solid var(--border-active, #3A3A3A)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#7A5A18]" />
            <h2 className="text-lg font-bold text-[#0A0A0A]">How'd that go?</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#F4F4EE] transition-colors" style={{ color: 'var(--text-muted, #666)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted, #666)' }}>
          Quick check-in after your {sessionType === 'self-tape' ? 'self-tape' : sessionType === 'cd-coach' ? 'coaching' : 'practice'} session
        </p>

        {/* Mood picker */}
        <div className="flex justify-between gap-1 mb-5">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setMood(mood?.label === m.label ? null : m)}
              className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 flex-1 transition-all"
              style={{
                background: mood?.label === m.label ? 'rgba(212,168,95,0.18)' : 'var(--bg-input, #2A2A2A)',
                border: mood?.label === m.label ? '1.5px solid #D4A85F' : '1px solid transparent',
              }}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] font-medium" style={{ color: mood?.label === m.label ? '#7A5A18' : 'var(--text-muted, #666)' }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>

        {/* Self-rating */}
        <div className="mb-4">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary, #999)' }}>Rate your performance</p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoveredStar || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="transition-transform hover:scale-110 p-1"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${active ? 'text-amber-400 fill-amber-400' : 'text-[rgba(10,10,10,0.20)]'}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What would you do differently next time? Any breakthroughs?"
          maxLength={500}
          rows={3}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4 transition-colors focus:border-[#D4A85F]"
          style={{
            background: 'var(--bg-input, #2A2A2A)',
            border: '1px solid var(--border-active, #3A3A3A)',
            color: 'var(--text-primary, #fff)',
          }}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--border-active, #3A3A3A)', color: 'var(--text-secondary, #999)' }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[#0A0A0A] transition-all disabled:opacity-50"
            style={{ background: '#7A5A18' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
