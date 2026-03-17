import { Box } from '@mui/material';
import { CustomPopover } from '../CustomPopover';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { PopoverData } from '../PopoverData';
import { getStatusStyles } from '../../../utils/utils';

// Status Utility
export const AuditionStatusUtil = (status) => {
  return (
    <div className='w-full flex items-center justify-center'>
      <div
        className={` 
          ${getStatusStyles(status)} 
          font text-center text-[12px] px-2 py-0.5 rounded text-white capitalize`}
      >
        {status || 'Unknown'}
      </div>
    </div>
  );
};

// Action
export const ActionUtil = (restProps, popoverData, isOpen) => {
  return (
    <>
        <CustomPopover
          // success={errorsShow?.success ? errorsShow?.success : modalOpen}
          trigger={<MoreVertIcon sx={{ color: 'black', fontSize: 'large' }} />}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          success={isOpen}
        >
          <Box minWidth={'127px'} p={1}>
            {popoverData?.map(({ icon, label, onClick }, index) => (
              <Box
                key={index}
                component={'div'}
                display={'flex'}
                flexDirection={'column'}
                justifyContent={'right'}
                py={'3px'}
                px={'5px'}
                onClick={() => onClick(restProps, label)}
              >
                <PopoverData icon={icon} label={label} />
              </Box>
            ))}
          </Box>
        </CustomPopover>
      
    </>
  );
};
