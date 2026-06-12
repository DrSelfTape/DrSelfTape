/**
 * First-run tutorial for the Self-Tape Analyzer (Tape Review + Compare Takes).
 * Shown the first time an actor opens the analyzer; re-openable from the "?"
 * button in TapeReview. Persists to localStorage (per-device is fine for a
 * walkthrough — no BE field needed).
 */
import { useEffect } from 'react';
import { Film, Trophy } from 'lucide-react';

export const TAPE_TUTORIAL_KEY = 'dst_tape_analyzer_tutorial_seen_v1';

const ROWS = [
  { e: '🎥', title: 'Review a take', body: 'Upload any self-tape — Jericho reads your framing, eyeline, lighting and the performance arc, then gives notes for your next take.' },
  { e: '🏆', title: 'Compare takes', body: 'Shot a few? Drop in 2–4 takes of the same scene and it ranks them — telling you which to submit and exactly why.' },
  { e: '🎯', title: 'Sharper notes', body: 'Add your character, the tone from the brief, or paste the sides for feedback tuned to the actual audition.' },
  { e: '💡', title: 'Best results', body: 'One clean, continuous take, framed chest-up, with your reader close to the lens. Good light beats an expensive camera.' },
];

export default function TapeAnalyzerTutorial({ onClose }) {
  // Slide the mobile bars out of the way while the sheet is up.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(TAPE_TUTORIAL_KEY, '1'); } catch { /* private mode */ }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{
      background: 'rgba(10,9,7,0.6)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }} onClick={dismiss}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-4 max-w-sm w-full px-6 py-7"
        style={{
          animation: 'tapeTutPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
          background: 'var(--aurora-surface-solid, #fff)',
          border: '1px solid var(--aurora-glass-border, rgba(10,10,10,0.08))',
          borderRadius: 26,
          boxShadow: 'var(--aurora-shadow-modal, 0 20px 60px rgba(0,0,0,0.3))',
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A5A18' }}>
          Self-Tape Analyzer
        </span>

        <div className="flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,168,95,0.18)' }}>
            <Film className="w-6 h-6" style={{ color: '#7A5A18' }} />
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,168,95,0.28)' }}>
            <Trophy className="w-6 h-6" style={{ color: '#7A5A18' }} />
          </div>
        </div>

        <div className="text-center">
          <h2 className="aurora-display" style={{ fontSize: 22, color: 'var(--aurora-text, #0A0A0A)', margin: '0 0 6px', letterSpacing: '-0.4px', fontFamily: "'Playfair Display', serif" }}>
            Notes like a casting director
          </h2>
          <p style={{ color: 'var(--aurora-sub, rgba(10,10,10,0.55))', fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
            Jericho watches your tape and gives real, specific acting notes — then helps you pick the take to send.
          </p>
        </div>

        <div className="w-full space-y-2">
          {ROWS.map((row) => (
            <div key={row.title} className="flex items-start gap-3 rounded-2xl p-3" style={{
              background: 'var(--aurora-glass, rgba(10,10,10,0.03))',
              border: '1px solid var(--aurora-glass-border, rgba(10,10,10,0.06))',
            }}>
              <span className="text-xl leading-none mt-0.5">{row.e}</span>
              <div>
                <p style={{ color: 'var(--aurora-text, #0A0A0A)', fontSize: 13.5, fontWeight: 700, margin: '0 0 2px' }}>{row.title}</p>
                <p style={{ color: 'var(--aurora-sub, rgba(10,10,10,0.6))', fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{row.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="w-full py-3.5 rounded-2xl transition-all hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
            color: '#0E0D0A', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer',
          }}
        >
          Show me
        </button>
      </div>
      <style>{`
        @keyframes tapeTutPop {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
