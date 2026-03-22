// Library imports
import { useNavigate } from 'react-router-dom';

// Local imports
import { NewScriptIcon } from '../../../assets/icons';

/**
 * Header component for AI Scene Partner session
 * Follows the same pattern as ScriptAnalysis Header
 */
const AiScenePartnerHeader = () => {
  const navigate = useNavigate();

  return (
    <div className='topbar-style border-style'>
      <div className='w-full flex justify-between items-center gap-3'>
        <div className='flex items-center gap-2 text-secondary text-sm'>
          <span>AI Scene Partner</span>
          <span className='text-secondary'>•</span>
          <span className='text-primary font-semibold'>Rehearsal</span>
        </div>

        <div className='flex items-center gap-3'>
          <div
            onClick={() => navigate('/scene-study/collaboration/ai-scene-partner')}
            className='flex items-center justify-center gap-1 text-primary hover:bg-secondary/20 cursor-pointer rounded p-1'
          >
            <NewScriptIcon className='!size-5' />
            <span className='hidden sm:block text-sm font-semibold'>
              Choose Another Script
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiScenePartnerHeader;

