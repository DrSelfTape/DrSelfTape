import { useEffect, useState } from 'react';
import Popover from '@mui/material/Popover';
import { Box } from '@mui/material';

export const CustomPopover = ({
  trigger,
  anchorOrigin,
  transformOrigin,
  children,
  sx,
  paperSX,
  open,
  onOpenChange,
  success
}) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (onOpenChange) {
      onOpenChange(true);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };
  useEffect(() => {
    if (success) {
      handleClose();
    }
  }, [success]);
  return (
    <>
      <Box
        sx={{
          cursor: 'pointer',
          ...sx,
        }}
        width={'fit-content'}
        height={'fit-content'}
        onClick={handleClick}
      >
        {trigger}
      </Box>
      <Popover
        open={open !== undefined ? open : Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={
          anchorOrigin || {
            vertical: 'bottom',
            horizontal: 'center',
          }
        }
        transformOrigin={
          transformOrigin || {
            vertical: 'top',
            horizontal: 'center',
          }
        }
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
              overflow:'clip',
              ...paperSX,
            },
          },
        }}
      >
        {children}
      </Popover>
    </>
  );
};