import { ClockIcon, MessageIcon, ProgressIcon } from '../../../../assets/icons';
import FlameIcon from '../../../../assets/icons/FlameIcon';
import BadgeCard from '../Community/BadgeCard';
import PerformanceMetrics from './PerformanceGrowth/PerformanceMetrics';


const Badges = () => {
  const badges = [
    {
      icon: <ProgressIcon />,
      bgColor: '#A7ECDA',
      textColor: 'text-[#A7ECDA]',
      title: '🎭 Scene Rehearsed 5x',
      description: 'Unlocked June 10',
    },
    {
      icon: <ClockIcon />,
      bgColor: '#FCE072',
      textColor: 'text-[#FCE072]',
      title: '🕰️ 5 Hours Live Coaching',
      description: 'Unlocked May 28',
    },
    {
      icon: <MessageIcon />,
      bgColor: '#FFB49A',
      textColor: 'text-[#FFB49A]',
      title: '🗣️ 5 Sessions with Readers',
      description: 'Unlocked June 5',
    },
    {
      icon: <FlameIcon />,
      bgColor: '',
      textColor: '',
      title: '🔥 10-Session Streak',
      description: '8/10 completed',
      disabled: true,
    },
  ];

  return (
    <>
      <div className='grid grid-cols-2 gap-4'>
        {badges.map((badge, i) => (
          <BadgeCard key={i} {...badge} />
        ))}
      </div>
      <PerformanceMetrics
        showNote
        metrics={[
          {
            label: 'Next Badge Progress',
            improvement: '8/10',
            color: '#A7ECDA',
            progress: 80,
            note: '2 more sessions to unlock 🔥 10-Session Streak',
          },
        ]}
      />
    </>
  );
};

export default Badges;
