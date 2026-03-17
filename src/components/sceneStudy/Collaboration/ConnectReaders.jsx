import { useNavigate } from 'react-router-dom';
import { BrainIcon, UsersGroupIcon, VedioIcon } from '../../../assets/icons';
import { CustomButton } from '../../Shared';

const ConnectReaders = () => {
  const navigate = useNavigate();
  return (
    <div className='card-section flex flex-col items-center justify-center text-center px-4 py-8 sm:px-6 md:py-12'>
      <div className='mb-5'>
        <VedioIcon className='w-14 h-14 sm:w-16 sm:h-16 text-primary mb-3 mx-auto' />
      </div>

      <h1 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>Connect with Live Readers</h1>

      <p className='text-sm text-gray-600 max-w-lg leading-relaxed'>
        Practice your scenes with real actors, get AI-powered feedback, and
        track your progress.
      </p>

      <div className='flex flex-col sm:flex-row gap-3 justify-center items-center mt-5'>
        <CustomButton
          className='!min-w-[200px] !h-10 !bg-primary !text-white hover:!bg-primary-dark !font-medium !rounded-lg !shadow-sm hover:!shadow-md !transition-all !duration-200 !px-5 !py-2 !flex !items-center !justify-center !gap-2 group !text-sm'
          onClick={() => navigate('/scene-study/live-rehearsal')}
        >
          <UsersGroupIcon className='w-4 h-4 transition-transform group-hover:scale-110' />
          <span>Find Scene Partner</span>
        </CustomButton>

        <CustomButton
          variant='outlined'
          className='!min-w-[200px] !h-10 !border !border-primary !text-primary hover:!bg-primary/5 !font-medium !rounded-lg !shadow-sm hover:!shadow-md !transition-all !duration-200 !px-5 !py-2 !flex !items-center !justify-center !gap-2 group !bg-white !text-sm'
          onClick={() => navigate('/scene-study/collaboration/ai-scene-partner')}
        >
          <BrainIcon className='w-4 h-4 transition-transform group-hover:scale-110' />
          <span>Use AI Scene Partner</span>
        </CustomButton>
      </div>
    </div>
  );
};

export default ConnectReaders;
