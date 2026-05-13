import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Star, Clapperboard, X } from 'lucide-react';

/**
 * SceneCompleteBadge
 * ─────────────────────────────────────────────────────────
 * Full-screen celebration overlay:
 *  1. Confetti burst from both sides
 *  2. Badge swoops in from bottom (scale + translate animation)
 *  3. Holds in center for 2.5s
 *  4. Badge slides to top-left "home" position
 *  5. Overlay fades out, leaving a persistent mini badge in top-left
 *
 * Props:
 *  sceneName   — scene title string
 *  sceneNumber — which scene (1, 2, 3…)
 *  onDismiss   — called when overlay is fully done
 */
export default function SceneCompleteBadge({ sceneName, sceneNumber, onDismiss }) {
  const [phase, setPhase] = useState('enter'); // enter | hold | exit | done
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // ── Confetti ──────────────────────────────────────────────
  const fireConfetti = () => {
    const colors = ['#FF8280', '#E88BF5', '#A7ECDA', '#FCE072', '#FFB49A', '#ffffff'];

    // Left burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors,
      scalar: 1.2,
    });

    // Right burst
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors,
      scalar: 1.2,
    });

    // Center shower
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 90,
        origin: { x: 0.5, y: 0.3 },
        colors,
        gravity: 0.8,
        scalar: 1,
      });
    }, 250);

    // Second wave
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        scalar: 0.9,
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        scalar: 0.9,
      });
    }, 600);
  };

  useEffect(() => {
    // Fire confetti immediately
    fireConfetti();

    // Phase: enter → hold after 0.6s (animation duration)
    timerRef.current = setTimeout(() => {
      setPhase('hold');

      // Phase: hold → exit after 2.5s
      timerRef.current = setTimeout(() => {
        setPhase('exit');

        // Phase: exit → done after 0.8s (exit animation)
        timerRef.current = setTimeout(() => {
          setPhase('done');
          onDismiss?.();
        }, 800);
      }, 2500);
    }, 600);

    return () => clearTimeout(timerRef.current);
  }, []);

  if (phase === 'done') return null;

  const overlayOpacity = phase === 'exit' ? 0 : 1;

  // Badge transform per phase
  const badgeStyle = (() => {
    if (phase === 'enter') {
      return {
        transform: 'translateY(120px) scale(0.6)',
        opacity: 0,
      };
    }
    if (phase === 'hold') {
      return {
        transform: 'translateY(0) scale(1)',
        opacity: 1,
      };
    }
    if (phase === 'exit') {
      return {
        transform: 'translateY(-35vh) translateX(-35vw) scale(0.28)',
        opacity: 0.9,
      };
    }
    return {};
  })();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(8,8,18,0.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: overlayOpacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
      onClick={() => {
        clearTimeout(timerRef.current);
        setPhase('exit');
        timerRef.current = setTimeout(() => { setPhase('done'); onDismiss?.(); }, 800);
      }}
    >
      {/* Dismiss hint */}
      {phase === 'hold' && (
        <button
          onClick={(e) => { e.stopPropagation(); clearTimeout(timerRef.current); setPhase('exit'); timerRef.current = setTimeout(() => { setPhase('done'); onDismiss?.(); }, 800); }}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#999',
          }}
        >
          <X size={18} />
        </button>
      )}

      {/* THE BADGE */}
      <div
        style={{
          ...badgeStyle,
          transition: phase === 'enter'
            ? 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease'
            : phase === 'exit'
            ? 'transform 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease'
            : 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          userSelect: 'none',
        }}
      >
        {/* Badge circle */}
        <div style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a0a24 0%, #2d0d3e 50%, #1a0a24 100%)',
          border: '3px solid transparent',
          backgroundClip: 'padding-box',
          boxShadow: '0 0 0 3px #FF8280, 0 0 60px rgba(255, 130, 128,0.5), 0 0 120px rgba(255, 130, 128,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          gap: 6,
        }}>
          {/* Stars around circle */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <Star
              key={deg}
              size={10}
              fill="#FCE072"
              stroke="none"
              style={{
                position: 'absolute',
                color: '#FCE072',
                top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 85}px - 5px)`,
                left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 85}px - 5px)`,
                opacity: phase === 'hold' ? 1 : 0,
                transition: 'opacity 0.4s ease',
                transitionDelay: `${deg / 360 * 0.4}s`,
                animation: phase === 'hold' ? 'twinkle 1.5s ease-in-out infinite' : 'none',
                animationDelay: `${deg / 360 * 0.6}s`,
              }}
            />
          ))}

          <Clapperboard size={48} style={{ color: '#FF8280' }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#FCE072',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>Scene {sceneNumber}</span>
        </div>

        {/* Text below badge */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 6px',
            fontFamily: 'Georgia, serif',
            letterSpacing: '-0.5px',
          }}>Scene Complete!</p>
          <p style={{
            fontSize: 15,
            color: '#A7ECDA',
            margin: '0 0 4px',
            maxWidth: 300,
          }}>{sceneName}</p>
          <p style={{
            fontSize: 13,
            color: '#666',
          }}>Tap to continue</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              width: i === 1 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === 1 ? '#FF8280' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
