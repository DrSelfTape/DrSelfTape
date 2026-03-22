// Library imports
import Modal from '@mui/material/Modal';

// Icons Import
import CloseIcon from '@mui/icons-material/Close';

// Local Imports
import { CustomButton } from '../CustomButton';
import { Line } from '../Line';

export const CustomModal = ({
  children,
  open,
  close,
  title,
  isDelete,
  primaryButton,
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

  return (
    <div>
      <Modal
        open={open}
        onClose={handleModalClose}
        disableEscapeKeyDown={disableEscapeKeyDown}
      >
        {/* Main container */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-2xl rounded-lg pt-2.5 px-5 pb-2.5 ${mainBoxClassName}`}
        >
          {/* Modal Header */}
          <div
            className={`flex justify-between items-center ${headerBoxClassName}`}
          >
            <p className='text-[18px] text-gray-600'>{title}</p>
            {!hideCloseIcon && (
              <div className='ml-auto cursor-pointer' onClick={() => close?.()}>
                <CloseIcon />
              </div>
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
      </Modal>
    </div>
  );
};
