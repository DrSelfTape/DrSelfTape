import { useEffect, useMemo } from 'react';
import { cheer } from '../../../../utils/haptics';

/**
 * Fireworks burst overlay shown when an actor + reader match successfully.
 * Auto-calls `onDone` after the animation finishes so the parent can
 * navigate to the match.
 *
 * The burst is built from small colored dots emitted from screen center;
 * each has a randomized angle/distance/colour/duration so the pattern
 * looks organic across mounts. Total runtime ~1.6s.
 */
const COLORS = ['#4ADE80', '#FCE072', '#FF8280', '#A7ECDA', '#D4A85F', '#FFFFFF'];
const PARTICLE_COUNT = 60;
const RUNTIME_MS = 1600;

const MatchCelebration = ({ onDone }) => {
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

  useEffect(() => {
    // Tactile success cue alongside the visual burst.
    cheer();
    const t = setTimeout(() => onDone?.(), RUNTIME_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at center, rgba(74,222,128,0.18), transparent 60%)',
        animation: 'drst-match-flash 1.6s ease-out forwards',
      }}
    >
      {/* Headline */}
      <div style={{
        position: 'absolute',
        fontFamily: '"Playfair Display", serif',
        fontSize: 'clamp(40px, 9vw, 88px)',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        textShadow: '0 6px 30px rgba(74,222,128,0.55), 0 2px 10px rgba(0,0,0,0.35)',
        animation: 'drst-match-pop 1.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}>
        It's a match!
      </div>

      {/* Particle burst */}
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            // Inline CSS variables consumed by the keyframe
            ['--x']: `${p.x}px`,
            ['--y']: `${p.y}px`,
            animation: `drst-match-particle ${p.duration}ms ease-out ${p.delay}ms forwards`,
            opacity: 0,
          }}
        />
      ))}

      <style>{`
        @keyframes drst-match-flash {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes drst-match-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          25%  { transform: scale(1.18); opacity: 1; }
          55%  { transform: scale(1); opacity: 1; }
          85%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.05); opacity: 0; }
        }
        @keyframes drst-match-particle {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(var(--x), var(--y)) scale(1.05); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MatchCelebration;
