import { useEffect, useState } from 'react';

/**
 * CreateLoader — what the app shows while it is working.
 *
 * It used to be a MUI spinner over "Please wait...", which tells the user
 * nothing and makes a $25/mo app feel like a form. Three treatments now,
 * same component:
 *
 *   <CreateLoader />                          overlay, scrim + card (default,
 *                                             unchanged for existing callers)
 *   <CreateLoader variant="skeleton" lines={4} />
 *                                             the shape of the content that
 *                                             is coming, instead of a spinner
 *   <CreateLoader variant="inline" />         a quiet row inside a card
 *
 * Give it `stages` and it cascades through them the way the Tape Review
 * analysing screen does — pending, active, done — so a long wait reads as
 * progress rather than as a hang:
 *
 *   <CreateLoader stages={[
 *     { label: 'Uploading tape', detail: 'H.264 · 1080p' },
 *     { label: 'Checking the frame' },
 *     { label: 'Writing your notes' },
 *   ]} />
 *
 * Props (all optional):
 *   variant   'overlay' (default) | 'skeleton' | 'inline'
 *   message   the line under the beat. Default "Working on it".
 *   stages    [{ label, detail }] — replaces message with a cascade.
 *   stageMs   ms per stage before it advances. Default 1200.
 *   lines     skeleton rows. Default 3.
 *   label     accessible name when there is no visible text.
 */
export const CreateLoader = ({
  variant = 'overlay',
  message = 'Working on it',
  stages,
  stageMs = 1200,
  lines = 3,
  label,
  className = '',
}) => {
  const [step, setStep] = useState(0);
  const count = stages?.length ?? 0;

  useEffect(() => {
    if (count < 2) return undefined;
    const timers = [];
    for (let i = 1; i < count; i += 1) {
      timers.push(setTimeout(() => setStep(i), stageMs * i));
    }
    return () => timers.forEach(clearTimeout);
  }, [count, stageMs]);

  const live = {
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': true,
    'aria-label': label || (stages ? 'Working' : undefined),
  };

  if (variant === 'skeleton') {
    return (
      <div className={className} {...live} style={{ display: 'grid', gap: 'var(--dst-space-md, 12px)' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className='aurora-skeleton'
            style={{
              height: i === 0 ? 20 : 13,
              width: i === 0 ? '58%' : i === lines - 1 ? '72%' : '100%',
            }}
          />
        ))}
        <span className='sr-only'>{label || message}</span>
      </div>
    );
  }

  const beat = stages ? (
    <Stages stages={stages} step={step} />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dst-space-sm, 8px)' }}>
      <Dots />
      <p style={textStyle}>{message}</p>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={className} {...live} style={{ padding: 'var(--dst-space-md, 12px) 0' }}>
        {beat}
      </div>
    );
  }

  return (
    <div
      {...live}
      className={`flex justify-center items-center h-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-[100] ${className}`}
      style={{ background: 'var(--dst-overlay, rgba(32,34,31,0.56))' }}
    >
      <div
        style={{
          maxWidth: 'min(320px, calc(100vw - 48px))',
          padding: 'var(--dst-space-lg, 16px) var(--dst-space-xl, 20px)',
          borderRadius: 'var(--dst-radius-lg, 12px)',
          border: '1px solid var(--dst-line, #E8E6E0)',
          background: 'var(--dst-paper-raised, #FFFEFB)',
          boxShadow: 'var(--dst-shadow-modal, 0 24px 60px rgba(10,10,10,0.18))',
        }}
      >
        {beat}
      </div>
    </div>
  );
};

const textStyle = {
  margin: 0,
  color: 'var(--dst-ink, #20221F)',
  fontSize: 'var(--dst-text-base, 13px)',
  lineHeight: 'var(--dst-leading, 1.5)',
};

const Dots = () => (
  <span aria-hidden='true' style={{ display: 'inline-flex', gap: 3, flexShrink: 0 }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className='dst-typedot'
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--dst-brass-ui, #9B731F)',
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </span>
);

/** Pending → active → done, one row per stage. */
const Stages = ({ stages, step }) => (
  <div style={{ display: 'grid', gap: 'var(--dst-space-md, 12px)', minWidth: 0 }}>
    {stages.map((s, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <div
          key={s.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--dst-space-md, 12px)',
            opacity: i > step ? 0.42 : 1,
            transition: 'opacity 300ms',
          }}
        >
          <span
            aria-hidden='true'
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              flexShrink: 0,
              background: done
                ? 'var(--dst-success-mark, #249B4B)'
                : active
                ? 'var(--dst-brass-tint, #F8F3E8)'
                : 'var(--dst-surface-sunken, #F4F4EE)',
              color: done ? 'var(--dst-on-fill-ink, #FFFEFB)' : 'var(--dst-ink-3, #62646A)',
              fontFamily: 'var(--dst-font-mono, monospace)',
              fontSize: 11,
              transition: 'background 300ms',
            }}
          >
            {done ? (
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
            ) : active ? (
              <Dots />
            ) : (
              i + 1
            )}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ ...textStyle, display: 'block', fontWeight: 600 }}>{s.label}</span>
            {s.detail && (
              <span
                style={{
                  display: 'block',
                  marginTop: 2,
                  fontFamily: 'var(--dst-font-mono, monospace)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--dst-ink-3, #62646A)',
                }}
              >
                {s.detail}
              </span>
            )}
          </span>
        </div>
      );
    })}
  </div>
);
