import {
  BookmarkIcon,
  HeartIcon,
  SparklesIcon,
  StarIcon,
  ThumbsUpIcon,
} from '../../../../assets/icons';
import { CustomButton } from '../../../Shared';
import FeatureCard from './FeatureCard';
import { useNavigate } from 'react-router-dom';

const Feature = () => {
  const navigate = useNavigate();
  
  const features = [
    {
      title: 'Real-time Feedback',
      description:
        'Get immediate reactions and adjustments from experienced actors who understand the craft.',
      icon: <ThumbsUpIcon className='text-[#A7ECDA]' />,
    },
    {
      title: 'Authentic Connections',
      description:
        'Build relationships with fellow actors who can become long-term scene partners and industry contacts.',
      icon: <HeartIcon height={20} width={20} className='text-danger/50' />,
    },
    {
      title: 'Specialized Skills',
      description:
        'Find readers with specific accents, genre experience, or technical expertise for your unique needs.',
      icon: <SparklesIcon className='text-[#FCE072]' />,
    },
    {
      title: 'Track Progress',
      description:
        'Save session recordings, notes, and feedback to measure your growth over time.',
      icon: <BookmarkIcon height={20} width={20} className='text-[#A7ECDA]' />,
    },
  ];
  return (
    <div className='card-section w-full'>
      <div className='flex flex-col gap-10'>
        <div>
          <h1 className='text-xl font-semibold'>Reader Network Benefits</h1>

          <p className='text-sm text-input-title max-w-md'>
            Why connect with live readers
          </p>
        </div>
        <div className='flex flex-wrap gap-6'>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature?.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
        <CustomButton 
          className='!w-full sm:!w-auto !min-w-[200px] !h-10 !bg-primary !text-white hover:!bg-primary-dark !font-medium !rounded-lg !shadow-sm hover:!shadow-md !transition-all !duration-200 !px-5 !py-2 !self-start group !text-sm'
          onClick={() => navigate('/scene-study/live-rehearsal')}
        >
          <div className='flex items-center justify-center gap-2'>
            <span>Explore Reader Network</span>
            <svg 
              className='w-4 h-4 transition-transform group-hover:translate-x-1' 
              fill='none' 
              stroke='currentColor' 
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6' />
            </svg>
          </div>
        </CustomButton>
      </div>
    </div>
  );
};

export default Feature;
