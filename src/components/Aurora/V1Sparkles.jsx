import { useMemo } from 'react';

const rand = (min, max) => min + Math.random() * (max - min);

export default function V1Sparkles({
  count = 10,
  radius = 80,
  size = 6,
  color = 'var(--aurora-heritage-gold)',
  duration = 900,
  delayStagger = 40,
  trigger = 0,
  className = '',
  style = {},
}) {
  // `trigger` is intentionally a dep — bumping it re-shuffles the scatter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sparks = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + rand(-0.25, 0.25);
      const distance = radius * rand(0.7, 1.0);
      return {
        dx: `${Math.cos(angle) * distance}px`,
        dy: `${Math.sin(angle) * distance}px`,
        rot: `${rand(120, 360)}deg`,
        delay: i * delayStagger,
        size: size * rand(0.6, 1.2),
      };
    });
  }, [count, radius, size, delayStagger, trigger]);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'center',
        ...style,
      }}
      aria-hidden="true"
    >
      {sparks.map((s, i) => (
        <span
          key={`${trigger}-${i}`}
          style={{
            position: 'absolute',
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${s.size * 2}px ${color}`,
            '--dx': s.dx,
            '--dy': s.dy,
            '--rot': s.rot,
            animation: `aurora-sparkle ${duration}ms cubic-bezier(.2,.7,.3,1) ${s.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  );
}
