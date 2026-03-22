// Library import
import { useNavigate } from 'react-router-dom';

// Icon import
import { NewScriptIcon } from '../../../assets/icons';
import { CustomButton } from '../../Shared';

const Header = ({
  mode = 'actor',
  onStartMeeting,
  onCancel,
  extraActions,
}) => {
  const navigate = useNavigate();

  const isCoach = mode === 'coach';

  return (
    <div className='topbar-style border-style'>
      <div className='w-full flex justify-between items-center gap-3 px-[16px]'>
        {isCoach ? (
          <div className='flex items-center gap-2 text-secondary text-sm'>
            <span>Script Insights</span>
            <span className='text-secondary'>•</span>
            <span className='text-primary font-semibold'>Rehearsal</span>
          </div>
        ) : (
          <div className='flex flex-col'>
            {/* <span className='text-xs text-secondary'>Scene Study</span>
            <h2 className='text-base sm:text-lg font-semibold'>Script Analysis</h2> */}
          </div>
        )}

        <div className='flex justify-end items-center gap-3'>
          {!isCoach && (
          <div
            onClick={() => {
              navigate('/scene-study/analysis');
            }}
            className='flex items-center justify-center gap-1 text-primary hover:bg-secondary/20 cursor-pointer rounded p-1'
          >
            <NewScriptIcon className='!size-5' />
            <span className='hidden sm:block text-sm font-semibold'>
              New Script
            </span>
            </div>
          )}

          {isCoach && !extraActions && (
            <div className='flex items-center gap-2.5'>
              <CustomButton
                onClick={onStartMeeting}
                sx={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  height: '36px',
                  minWidth: '140px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: '#059669',
                    boxShadow: 'none',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:focus': {
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                  },
                }}
              >
                Start Meeting
              </CustomButton>
              <CustomButton
                variant='outlined'
                onClick={onCancel}
                sx={{
                  borderColor: '#6b7280',
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  height: '36px',
                  minWidth: '100px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(107, 114, 128, 0.05)',
                    borderColor: '#4b5563',
                    color: '#4b5563',
                    boxShadow: 'none',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:focus': {
                    boxShadow: '0 0 0 3px rgba(107, 114, 128, 0.2)',
                  },
                }}
              >
                Back
              </CustomButton>
            </div>
          )}

          {isCoach && extraActions}
        </div>
      </div>
    </div>
  );
};

export default Header;
