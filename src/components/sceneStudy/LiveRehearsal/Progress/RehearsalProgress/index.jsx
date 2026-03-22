import { Line } from '../../../../Shared';
import SessionHistory from './SessionHistory';
import StatsGrid from './StatsGrid';

const RehearsalProgress = ({ stats }) => {
  const statsData = [
    { label: 'Total Sessions', value: '12', change: '+3 this month' },
    { label: 'Total Hours', value: '8.5', change: '+2.5 this month' },
    { label: 'Different Readers', value: '5', change: '+1 this month' },
  ];
  const sessionData = [
    {
      title: 'The Interview',
      date: 'June 15, 2023',
      reader: 'Emma Rodriguez',
      duration: '45:22',
    },
    {
      title: 'Medical Drama',
      date: 'June 10, 2023',
      reader: 'Marcus Chen',
      duration: '32:15',
    },
    {
      title: 'Comedy Pilot',
      date: 'June 5, 2023',
      reader: 'James Wilson',
      duration: '28:40',
    },
    {
      title: 'Crime Scene',
      date: 'May 28, 2023',
      reader: 'Emma Rodriguez',
      duration: '51:10',
    },
  ];
  return (
    <div className='mt-[20px] flex flex-col gap-[10px]'>
      <StatsGrid stats={statsData} />
      <Line />
      <SessionHistory sessions={sessionData} />
    </div>
  );
};

export default RehearsalProgress;
