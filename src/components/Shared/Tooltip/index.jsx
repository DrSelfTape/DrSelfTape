import { Tooltip } from '@mui/material';

export const TooltipText = ({
  open,
  handleOpen,
  handleClose,
  text,
  children,
  tooltopSx,
  arrow = true,
  placement = 'bottom',
  offset = -10,
}) => {
  return (
    <Tooltip
      title={<p className='font-sans'>{text}</p>}
      open={open}
      onClose={handleClose}
      onOpen={handleOpen}
      arrow={arrow}
      placement={placement}
      slotProps={{
        arrow: {
          sx: {
            '&::before': {
              backgroundColor: '#000000',
              border: '1px solid black',
            },
          },
        },
        tooltip: {
          sx: {
            ...tooltopSx,
            backgroundColor: '#000000',
            width: '100%',
            color: '#ffffff',
            fontFamily: 'var(--font-sams)',
            fontSize: '12px',
            border: '1px solid black',
          },
        },
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, offset],
              },
            },
          ],
        },
      }}
    >
      {children}
    </Tooltip>
  );
};
