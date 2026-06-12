import { useEffect, useMemo, useState } from 'react';
import { cheer } from '../../../../utils/haptics';

/**
 * "Scene Partners!" — the cinematic payoff shown on a mutual match. Two beats:
 *   1) a particle burst + headline (the dopamine spike), then
 *   2) a single frictionless CTA that converts the spike into an actual read.
 *
 * Per the engagement playbook, the celebration is reserved EXCLUSIVELY for the
 * rare mutual match (never per-swipe), and its job is to route the actor
 * straight into rehearsing together — not to dead-end on confetti. Never hearts,
 * never dating language.
 */
const COLORS = ['#4ADE80', '#FCE072', '#FF8280', '#A7ECDA', '#D4A85F', '#FFFFFF'];
const PARTICLE_COUNT = 60;

function firstName(name) {
  const clean = ((name || 'your partner').replace(/\bNone\b/g, '').replace(/\s+/g, ' ').trim()) || 'your partner';
  return clean.split(' ')[0];
}

const MatchCelebration = ({ actor, onConnect, onDismiss }) => {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.3;
      const distance = 180 + Math.random() * 220;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 6 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        duration: 800 + Math.random() * 700,
        delay: Math.random() * 200,
      };
    });
  }, []);

  // After the burst, reveal the CTA so the spike converts into a booked read.
  const [showCta, setShowCta] = useState(false);
  useEffect(() => {
    cheer();
    const t = setTimeout(() => setShowCta(true), 1300);
    return () => clearTimeout(t);
  }, []);

  const name = firstName(actor?.name);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 28px',
        background: 'radial-gradient(circle at center, rgba(20,18,14,0.92), rgba(8,7,5,0.96))',
        pointerEvents: showCta ? 'auto' : 'none',
      }}
    >
      {/* Headline — pops in and stays */}
      <div style={{
        fontFamily: '"Playfair Display", serif',
        fontSize: 'clamp(38px, 8.5vw, 76px)',
        fontWeight: 700, color: '#fff', textAlign: 'center',
        letterSpacing: '-0.02em', lineHeight: 1.05,
        textShadow: '0 6px 30px rgba(212,168,95,0.5), 0 2px 10px rgba(0,0,0,0.4)',
        animation: 'drst-match-pop2 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        zIndex: 2,
      }}>
        Scene Partners!
      </div>

      {/* Particle burst — emitted from center, one-time */}
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute', top: '42%', left: '50%',
            width: p.size, height: p.size, borderRadius: '50%',
            background: p.color, boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            ['--x']: `${p.x}px`, ['--y']: `${p.y}px`,
            animation: `drst-match-particle ${p.duration}ms ease-out ${p.delay}ms forwards`,
            opacity: 0, pointerEvents: 'none', zIndex: 1,
          }}
        />
      ))}

      {/* CTA — the conversion beat */}
      {showCta && (
        <div style={{
          marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14, zIndex: 3, animation: 'drst-cta-in 0.4s ease forwards', maxWidth: 360, width: '100%',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
            You and <span style={{ color: '#FCE072', fontWeight: 700 }}>{name}</span> both want to read. Get in the room.
          </p>
          <button
            onClick={onConnect}
            style={{
              width: '100%', padding: '15px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', color: '#0E0D0A',
              fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em',
              boxShadow: '0 10px 28px rgba(212,168,95,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🎬 Start a read now
          </button>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600, padding: '4px 12px',
            }}
          >
            Keep swiping
          </button>
        </div>
      )}

      <style>{`
        @keyframes drst-match-pop2 {
          0%   { transform: scale(0.4); opacity: 0; }
          45%  { transform: scale(1.15); opacity: 1; }
          70%  { transform: scale(0.98); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drst-match-particle {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.05); opacity: 0; }
        }
        @keyframes drst-cta-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MatchCelebration;
