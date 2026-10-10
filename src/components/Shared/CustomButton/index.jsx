import { splitSx, token } from '../sx';
import '../controls.css';

/**
 * CustomButton — the default button on every non-Studio screen.
 *
 * It used to be 35px tall, which is under Apple's 44px floor on a surface
 * that is mostly fingers. It is 44 now. Where a design genuinely needs a
 * shorter box — a toolbar, a table-row action — pass `dense`: the button
 * draws at 36px and an invisible pseudo-element stretches the HIT area
 * back to 44 without touching the layout.
 *
 * Every prop that worked before still works. `sx` is still applied last,
 * so a caller that already pinned its own height keeps it.
 *
 * 2026-10-10: reimplemented without @mui/material. This component and
 * CustomModal were the only things dragging MUI onto the first-paint
 * critical path — 428KB for a Button, a CircularProgress, a Modal and a
 * Close icon. The metrics in controls.css reproduce MUI's Button defaults
 * exactly, so this is a bundle change and not a design change.
 */
export const CustomButton = ({
  variant = 'contained',
  onClick,
  disabled,
  loading,
  children,
  sx,
  type,
  className,
  isDelete = false,
  CircularProgressSize,
  startIcon,
  endIcon,
  dense = false,
}) => {
  // #ef4444 under white text measures 3.8:1 — under AA on a button whose
  // whole job is to be read before something is destroyed.
  const baseColor = isDelete ? 'var(--dst-danger, #C62828)' : token('primary.main');
  const hoverColor = isDelete ? 'var(--dst-danger-deep, #A32020)' : token('primary.dark');

  const { style: sxStyle, hover: sxHover, disabled: sxDisabled } = splitSx(sx);
  const isOutlined = variant === 'outlined';
  const isDisabled = Boolean(disabled || loading);

  // Colours travel as custom properties because :hover and :disabled cannot be
  // expressed inline, and callers pass both through sx.
  const vars = {};
  if (isOutlined) {
    vars['--dst-btn-bg'] = 'transparent';
    vars['--dst-btn-fg'] = baseColor;
    vars['--dst-btn-border'] = baseColor;
    vars['--dst-btn-bg-hover'] = isDelete
      ? 'var(--dst-danger-tint, rgba(198,40,40,0.10))'
      : 'rgba(0, 0, 0, 0.04)';
    vars['--dst-btn-fg-hover'] = baseColor;
    vars['--dst-btn-border-hover'] = baseColor;
  } else {
    // A caller that set its own background/colour via sx owns both states,
    // exactly as it did when sx was spread last into MUI's styles.
    vars['--dst-btn-bg'] = sxStyle.backgroundColor || baseColor;
    vars['--dst-btn-fg'] = sxStyle.color || '#fff';
    vars['--dst-btn-bg-hover'] = sxStyle.backgroundColor || hoverColor;
    vars['--dst-btn-fg-hover'] = sxStyle.color || '#fff';
  }
  // An explicit &:hover in sx wins over everything above.
  if (sxHover?.backgroundColor) vars['--dst-btn-bg-hover'] = sxHover.backgroundColor;
  if (sxHover?.color) vars['--dst-btn-fg-hover'] = sxHover.color;
  if (sxHover?.borderColor) vars['--dst-btn-border-hover'] = sxHover.borderColor;
  if (sxStyle.borderColor) vars['--dst-btn-border'] = sxStyle.borderColor;

  const classes = [
    'dst-btn',
    isOutlined ? 'dst-btn--outlined' : '',
    dense ? 'dst-btn--dense' : '',
    className || '',
  ].filter(Boolean).join(' ');

  const spinnerSize = CircularProgressSize || 16;

  return (
    <button
      type={type || 'submit'}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={classes}
      aria-busy={loading ? true : undefined}
      style={{ ...vars, ...sxStyle, ...(isDisabled && sxDisabled ? sxDisabled : null) }}
    >
      {startIcon}
      {loading ? (
        <span className='flex items-center gap-1'>
          {children}
          <span
            className='dst-spinner'
            role='progressbar'
            aria-hidden='true'
            style={{
              width: spinnerSize,
              height: spinnerSize,
              color: isOutlined ? baseColor : '#fff',
            }}
          />
        </span>
      ) : (
        children
      )}
      {endIcon}
    </button>
  );
};
