import React from 'react';
import { ProgressIcon } from '../../../assets/icons';

export const StatsCard = ({ name, amount, percentage, metrics }) => {
  return (
    <React.Fragment>
      <div className='card-section relative overflow-hidden'>
        <div className='absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/80 to-success/80' />
        <p className='text-[13px] sm:text-sm font-medium leading-[22px] tracking-[-0.18px] text-secondary-dark'>
          {name}
        </p>

        <div className='flex flex-col gap-1 mt-4'>
          <p className='text-lg sm:text-xl lg:text-2xl font-semibold leading-[22px] tracking-[-0.18px] text-secondary-dark text-wrap'>
            {amount}
          </p>

          <div className='flex items-center gap-1'>
            <ProgressIcon
              fill={
                metrics > 0 ? 'var(--color-success)' : 'var(--color-danger)'
              }
            />
            <span
              className={`text-[12px] font-[600] leading-[18px] tracking-[-0.18px] ${
                metrics > 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {percentage > 0 ? '+' : ''}
              {percentage}%
            </span>
            <span className='text-[12px] font-[400] leading-[18px] tracking-[-0.18px] text-secondary'>
              vs last 30 days
            </span>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};
