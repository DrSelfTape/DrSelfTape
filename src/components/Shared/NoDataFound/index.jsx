import DescriptionIcon from '@mui/icons-material/Description';

/**
 * NoDataFound — the screen when there is nothing to show yet.
 *
 * It used to say "No data found." in hardcoded black Montserrat with no
 * way out, which tells a paying actor nothing and offers them nothing.
 * It now takes the one sentence that says what WILL fill this space and
 * a button that goes and gets it.
 *
 *   <NoDataFound />                                     // unchanged
 *   <NoDataFound title="No auditions yet" />
 *   <NoDataFound
 *     title="No auditions yet"
 *     message="Submissions you send land here, with the tape attached."
 *     actionLabel="Add an audition"
 *     onAction={() => navigate('/auditions/new')}
 *   />
 *
 * Props (all optional — zero-prop callers keep the old copy):
 *   title       headline. Default "No data found."
 *   message     one line saying what fills the screen. Alias: description.
 *   actionLabel + onAction | href   the way out. Both halves required.
 *   icon        replace the glyph.
 *   compact     tighter padding, for a table cell rather than a page.
 */
export const NoDataFound = ({
  title = 'No data found.',
  message,
  description,
  actionLabel,
  onAction,
  href,
  icon,
  compact = false,
  className = '',
}) => {
  const body = message ?? description;
  const hasAction = Boolean(actionLabel) && Boolean(onAction || href);

  return (
    <div
      className={className}
      style={{
        textAlign: 'center',
        padding: compact ? '20px 16px' : '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--dst-space-md, 12px)',
      }}
    >
      <span
        aria-hidden='true'
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--dst-surface-sunken, #F4F4EE)',
          color: 'var(--dst-brass-ink, #8A6618)',
        }}
      >
        {icon || <DescriptionIcon fontSize='medium' color='inherit' />}
      </span>

      <p
        style={{
          margin: 0,
          color: 'var(--dst-ink, #20221F)',
          fontSize: 'var(--dst-text-lg, 18px)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 'var(--dst-leading-tight, 1.2)',
        }}
      >
        {title}
      </p>

      {body && (
        <p
          style={{
            margin: 0,
            maxWidth: 320,
            color: 'var(--dst-ink-2, #575960)',
            fontSize: 'var(--dst-text-base, 13px)',
            lineHeight: 'var(--dst-leading, 1.5)',
          }}
        >
          {body}
        </p>
      )}

      {hasAction &&
        (href ? (
          <a href={href} style={actionStyle}>
            {actionLabel}
          </a>
        ) : (
          <button type='button' onClick={onAction} style={actionStyle}>
            {actionLabel}
          </button>
        ))}
    </div>
  );
};

const actionStyle = {
  marginTop: 'var(--dst-space-xs, 4px)',
  minHeight: 'var(--dst-tap-min, 44px)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 20px',
  borderRadius: 'var(--dst-radius-sm, 8px)',
  border: '1px solid var(--dst-fill-ink, #242722)',
  background: 'var(--dst-fill-ink, #242722)',
  color: 'var(--dst-on-fill-ink, #FFFEFB)',
  fontSize: 'var(--dst-text-base, 13px)',
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
  touchAction: 'manipulation',
};
