import React from 'react';
import { StatsCard } from '../../Shared';
import { data } from '../../../utils/data';

const DashbaordStats = () => {
  const stats = data?.stats;
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[10px] w-full'>
      {stats?.map((state, index) => (
        <StatsCard
          name={state?.name}
          amount={state?.amount}
          percentage={state?.percentage}
          metrics={state?.metrics}
          key={index}
        />
      ))}
    </div>
  );
};

export default DashbaordStats;
