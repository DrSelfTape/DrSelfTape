import { useEffect } from 'react';
import { captureMessage } from '../../../utils/sentry';

/**
 * ComingSoon — the placeholder a route should never be pointing at.
 *
 * A live route rendering this is a bug, not a feature: the user tapped
 * something we shipped in the nav and got a dead end. So this does two
 * jobs at once. In dev it is impossible to miss — a red band naming the
 * offending path. In production it is a dignified empty state that at
 * least hands the actor a way back instead of stranding them, and it
 * reports itself to Sentry so we find out from telemetry rather than
 * from a one-star review.
 *
 * Props (all optional):
 *   feature   what is coming. Default: the generic line.
 *   note      one sentence on what to do in the meantime.
 *   onBack    override the back action. Default: history.back(), or Home.
 */
export const ComingSoon = ({ feature, note, onBack }) => {
  const path =
    typeof window !== 'undefined' ? window.location.pathname : '(unknown)';
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (isDev) {
      console.warn(
        `[ComingSoon] ${path} renders a placeholder. A route in the nav ` +
          'should point at a screen, not at this component.'
      );
      return;
    }
    captureMessage('ComingSoon placeholder rendered on a live route', {
      level: 'warning',
      extra: { path, feature },
    });
  }, [isDev, path, feature]);

  const goBack = () => {
    if (onBack) return onBack();
    if (window.history.length > 1) return window.history.back();
    window.location.assign('/');
  };

  return (
    <div
      style={{
        minHeight: '60dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--dst-space-md, 12px)',
        padding:
          'calc(var(--dst-space-3xl, 32px) + var(--dst-safe-top, 0px)) var(--dst-space-xl, 20px) calc(var(--dst-space-3xl, 32px) + var(--dst-safe-bottom, 0px))',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      {isDev && (
        <p
          style={{
            margin: '0 0 8px',
            maxWidth: 420,
            padding: '10px 14px',
            borderRadius: 'var(--dst-radius-sm, 8px)',
            background: 'var(--dst-danger-tint, rgba(198,40,40,0.10))',
            border: '1px solid var(--dst-danger, #C62828)',
            color: 'var(--dst-danger, #C62828)',
            fontSize: 'var(--dst-text-base, 13px)',
            fontWeight: 600,
            lineHeight: 'var(--dst-leading, 1.5)',
          }}
        >
          Route bug: <code>{path}</code> renders ComingSoon. Point it at a
          screen or take it out of the nav.
        </p>
      )}

      <span
        aria-hidden='true'
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--dst-brass-tint, #F8F3E8)',
          border: '1px solid var(--dst-brass-tint-line, #E9DFC9)',
          color: 'var(--dst-brass-ink, #8A6618)',
          fontFamily: 'var(--dst-font-serif, Georgia, serif)',
          fontSize: 22,
        }}
      >
        &#9679;
      </span>

      <h1
        style={{
          margin: 0,
          color: 'var(--dst-ink, #20221F)',
          fontFamily: 'var(--dst-font-serif, Georgia, serif)',
          fontWeight: 400,
          fontSize: 26,
          letterSpacing: '-0.5px',
          lineHeight: 'var(--dst-leading-tight, 1.2)',
        }}
      >
        {feature ? `${feature} is still in the studio` : 'Still in the studio'}
      </h1>

      <p
        style={{
          margin: 0,
          maxWidth: 340,
          color: 'var(--dst-ink-2, #575960)',
          fontSize: 'var(--dst-text-base, 13px)',
          lineHeight: 'var(--dst-leading, 1.5)',
        }}
      >
        {note ||
          "We're building this one properly rather than shipping half of it. Nothing here yet — head back and keep taping."}
      </p>

      <button
        type='button'
        onClick={goBack}
        style={{
          marginTop: 'var(--dst-space-xs, 4px)',
          minHeight: 'var(--dst-tap-min, 44px)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          borderRadius: 'var(--dst-radius-sm, 8px)',
          border: '1px solid var(--dst-fill-ink, #242722)',
          background: 'var(--dst-fill-ink, #242722)',
          color: 'var(--dst-on-fill-ink, #FFFEFB)',
          fontSize: 'var(--dst-text-base, 13px)',
          fontWeight: 600,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        Go back
      </button>
    </div>
  );
};
