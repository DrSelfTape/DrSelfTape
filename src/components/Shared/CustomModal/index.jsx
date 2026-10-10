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

  // MUI's <Modal> supplied four things, replaced here in order: a portal, a
  // backdrop, escape-to-close and scroll lock on the body.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || disableEscapeKeyDown) return;
      handleModalClose(event, 'escapeKeyDown');
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // handleModalClose is recreated each render; the listener reads the latest
    // close/disable props through it, so depending on `open` alone is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div
          role='dialog'
          aria-modal='true'
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
