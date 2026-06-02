export default function V1Pulse({
  size = 48,
  color = 'var(--aurora-heritage-gold)',
  rings = 2,
  duration = 1600,
  className = '',
  style = {},
  children,
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        ...style,
      }}
    >
      {Array.from({ length: rings }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            color,
            animation: `aurora-pulse ${duration}ms cubic-bezier(.2,.7,.3,1) ${i * (duration / rings)}ms infinite`,
          }}
        />
      ))}
      {children}
    </div>
  );
}
