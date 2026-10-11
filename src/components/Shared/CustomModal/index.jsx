// Library imports
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Icons Import — lucide is already in the eager bundle (28KB for every icon
// we use); @mui/icons-material was not, and pulled 428KB of MUI with it.
import { X as CloseIcon } from 'lucide-react';

// Local Imports
import { CustomButton } from '../CustomButton';
import { Line } from '../Line';
import '../controls.css';

export const CustomModal = ({
  children,
  open,
  close,
  title,
  isDelete,
  primaryButtonText,
  handleSave,
  disableSave,
  loading,
  saveButtonSx,
  saveButton,
  noFooter,
  mainBoxClassName,
  headerBoxClassName,
  childClassName,
  secondaryButtonText,
  onPrimaryButtonClick,
  onSecondaryButtonClick,
  primaryButtonProps,
  secondaryButtonProps,
  hideCloseIcon = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
}) => {
  const resolvedSecondaryText =
    secondaryButtonText !== undefined ? secondaryButtonText : 'Cancel';

  const {
    className: primaryButtonClassName,
    onClick: primaryButtonOnClick,
    loading: primaryButtonLoadingProp,
    disabled: primaryButtonDisabledProp,
    sx: primaryButtonSx,
    ...restPrimaryButtonProps
  } = primaryButtonProps || {};

  const {
    className: secondaryButtonClassName,
    onClick: secondaryButtonOnClick,
    sx: secondaryButtonSx,
    ...restSecondaryButtonProps
  } = secondaryButtonProps || {};

  const combinedPrimaryLoading =
    primaryButtonLoadingProp !== undefined ? primaryButtonLoadingProp : loading;
  const combinedPrimaryDisabled =
    primaryButtonDisabledProp !== undefined
      ? primaryButtonDisabledProp
      : disableSave;

  const handlePrimaryAction = () => {
    if (onPrimaryButtonClick) {
      onPrimaryButtonClick();
      return;
    }

    if (primaryButtonOnClick) {
      primaryButtonOnClick();
      return;
    }

    handleSave?.();
  };

  const handleSecondaryAction = () => {
    if (onSecondaryButtonClick) {
      onSecondaryButtonClick();
      return;
    }

    if (secondaryButtonOnClick) {
      secondaryButtonOnClick();
      return;
    }

    close?.();
  };

  const handleModalClose = (event, reason) => {
    if (disableBackdropClick && reason === 'backdropClick') return;
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') return;
    close?.(event, reason);
  };

  const pressStartedOnBackdrop = useRef(false);
  const panelRef = useRef(null);

  // The keydown listener is registered once per open, so it captures ONE
  // render's handleModalClose and would keep calling that stale `close` prop
  // after a re-render. The ref is re-pointed on every render, so the listener
  // reads the current one. (The previous comment here claimed a plain closure
  // already did this; it does not — a closure freezes what it captured.)
  const closeRef = useRef(null);
  closeRef.current = handleModalClose;

  // MUI's <Modal> supplied five things, replaced here in order: a portal, a
  // backdrop, escape-to-close, scroll lock on the body, and a focus trap.
  useEffect(() => {
    if (!open) return undefined;

    const FOCUSABLE = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    // `el.tabIndex >= 0` is doing real work: a <button tabIndex={-1}> matches
    // the button selector but native Tab SKIPS it, so letting it be the first
    // or last boundary of the ring means the real edge is never detected and
    // focus walks out. Only genuinely tabbable elements can be boundaries.
    const focusable = () => Array.from(
      panelRef.current?.querySelectorAll(FOCUSABLE) || []
    ).filter((el) => el.tabIndex >= 0
      && (el.offsetParent !== null || el === document.activeElement));

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (disableEscapeKeyDown) return;
        closeRef.current?.(event, 'escapeKeyDown');
        return;
      }
      // Without this, Tab walks straight out of the dialog and into the page
      // behind it — MUI's FocusTrap was doing this and the replacement had
      // nothing. Keyboard focus must stay inside while the modal is up.
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        // No focusable control at all — only reachable via hideCloseIcon +
        // noFooter + inert children, which no caller does today. Keep focus on
        // the panel rather than letting Tab out of an open dialog, so the first
        // caller that does pass hideCloseIcon does not quietly inherit a leak.
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Two ways to be "not on the ring", same answer: focus is outside the
      // dialog entirely, or it is on the panel ITSELF — which is focusable at
      // tabIndex -1 and takes focus when you click blank space inside the
      // dialog. `contains` is true for the panel, and the panel is neither
      // `first` nor `last`, so without this second case Shift+Tab fell through
      // to native backward navigation and walked out into the page behind.
      if (!panelRef.current?.contains(active) || active === panelRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Remember where focus came from so closing returns it there, rather than
    // dumping the user at the top of the document.
    const previouslyFocused = document.activeElement;
    const items = focusable();
    (items[0] || panelRef.current)?.focus?.();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus?.();
    };
  }, [open, disableEscapeKeyDown]);

  if (!open) return null;

  return createPortal(
    (
      <div
        className='dst-modal-backdrop'
        role='presentation'
        onPointerDown={(event) => { pressStartedOnBackdrop.current = event.target === event.currentTarget; }}
        onClick={(event) => {
          // Close only when the press BOTH started and ended on the backdrop,
          // so selecting text inside the panel and releasing outside it does
          // not dismiss the dialog. Keyed off click rather than mousedown
          // because WKWebView synthesises click from a tap reliably and
          // mousedown inside a position:fixed overlay it does not
          // ([[reference_ios_wkwebview_constraints]]).
          if (event.target !== event.currentTarget) return;
          if (!pressStartedOnBackdrop.current) return;
          pressStartedOnBackdrop.current = false;
          handleModalClose(event, 'backdropClick');
        }}
      >
        {/* Main container */}
        {/* tabIndex -1 so the panel itself can take focus when it holds no
            focusable control, without joining the Tab order. */}
        <div
          ref={panelRef}
          role='dialog'
          aria-modal='true'
          tabIndex={-1}
          aria-label={typeof title === 'string' ? title : undefined}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-2xl rounded-lg pt-2.5 px-5 pb-2.5 ${mainBoxClassName}`}
        >
          {/* Modal Header */}
          <div
            className={`flex justify-between items-center ${headerBoxClassName}`}
          >
            <p className='text-[18px] text-gray-600'>{title}</p>
            {!hideCloseIcon && (
              <button
                type='button'
                aria-label='Close'
                className='ml-auto cursor-pointer bg-transparent border-0 p-0 text-gray-600'
                onClick={() => close?.()}
              >
                <CloseIcon size={24} />
              </button>
            )}
          </div>
          <Line className={'mt-2.5'} />
          {/* Modal Children */}
          <div
            className={`overflow-auto ${'max-w-[265px] xs:max-w-[370px] sm:max-w-[450px] md:max-w-[600px] min-w-[265px] xs:min-w-[370px] sm:min-w-[450px] md:min-w-[600px]'} min-h-[70px] ${childClassName}`}
          >
            {children}
          </div>

          {/* Modal Footer */}
          {!noFooter && (
            <div className='flex flex-col-reverse xs:flex-row justify-end items-center gap-2'>
              <CustomButton
                onClick={handleSecondaryAction}
                variant={'outlined'}
                className={`!w-full xs:!w-fit ${
                  secondaryButtonClassName || ''
                }`.trim()}
                sx={{
                  width: { xxs: '100%', xs: 'fit-content' },
                  ...secondaryButtonSx,
                }}
                {...restSecondaryButtonProps}
              >
                <p fontSize={'14px'}>{resolvedSecondaryText}</p>
              </CustomButton>

              {saveButton === null ? (
                ''
              ) : (
                <CustomButton
                  type='button'
                  isDelete={isDelete}
                  onClick={handlePrimaryAction}
                  disabled={combinedPrimaryDisabled}
                  loading={combinedPrimaryLoading}
                  sx={{
                    width: { xxs: '100%', xs: 'fit-content' },
                    ...saveButtonSx,
                    ...primaryButtonSx,
                  }}
                  className={`!w-full xs:!w-fit ${
                    primaryButtonClassName || ''
                  }`.trim()}
                  {...restPrimaryButtonProps}
                >
                  <p className='leading-[16px] text-[14px]'>
                    {isDelete
                      ? primaryButtonText
                        ? primaryButtonText
                        : 'Delete'
                      : primaryButtonText
                      ? primaryButtonText
                      : 'Save'}
                  </p>
                </CustomButton>
              )}
            </div>
          )}
        </div>
      </div>
    ),
    document.body
  );
};
