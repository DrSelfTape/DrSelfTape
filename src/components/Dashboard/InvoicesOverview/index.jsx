import React from 'react';
// Local Imports
import { Line } from '../../shared';
import DonutChart from '../../shared/DonutChart';
import { data } from '../../../utils/data';

const InvoicesOverview = () => {
  return (
    <React.Fragment>
      <div className='grid grid-cols-12 gap-4 w-full mt-4 mb-[20px]'>
        {/* Invoices Overview */}
        <div className='btw-lg-xl:col-span-6 lg:col-span-4 rounded-[10px] border border-neutral-500 p-3 sm:p-3 md:p-5 col-span-12 sm:col-span-12 report-shadow'>
          <InvoiceOverView />
        </div>
        <div className='btw-lg-xl:col-span-6 lg:col-span-4 rounded-[10px] border border-neutral-500 p-3 sm:p-3 md:p-5 col-span-12 sm:col-span-12 report-shadow'>
          <EstimatesOverView />
        </div>
        <div className='btw-lg-xl:col-span-12 lg:col-span-4 rounded-[10px] border border-neutral-500 py-3 pl-3 sm:pl-5 md:py-5 col-span-12 sm:col-span-12 report-shadow'>
          <Overview />
        </div>
      </div>
    </React.Fragment>
  );
};

export default InvoicesOverview;

// INVOICES OVERVIEW
const InvoiceOverView = () => {
  //DATA
  const overviews = data.invoicesOverview;
  return (
    <React.Fragment>
      {/* TITLE & BUTTON */}
      <div className='flex items-center justify-between '>
        <p className='text-[13px] sm:text-[14px] lg:text-[16px] font-[475] leading-[22px] tracking-[-0.18px] text-cool-grey-1100'>
          Invoices Overview
        </p>
        <button className='px-[8px] rounded-[8px] bg-neutral-200 hover:bg-neutral-300 transition-all duration-400 h-[30px]'>
          <span className='text-[12px] sm:text-[12px] lg:text-[12px] font-[475] leading-[18px] tracking-[-0.18px] text-cool-grey-1100'>
            See All
          </span>
        </button>
      </div>
      <Line className='my-[11px]' />
      {/* GRAPH */}
      <div className='flex items-center justify-between gap-[33px]'>
        <div className='w-1/2'>
          <DonutChart />
        </div>
        <div className='flex flex-col gap-4 w-1/2'>
          {overviews.map((overview, index) => {
            return (
              <div className='flex items-center justify-between' key={index}>
                <div className='flex items-center gap-2'>
                  <p
                    className={`w-[10px] h-[10px] rounded-full ${overview.color}`}
                  />
                  <p className='text-[12px] sm:text-[12px] lg:text-[12px] font-[475] leading-[18px] tracking-[-0.18px] text-cool-grey-900'>
                    {overview.name}
                  </p>
                </div>
                <p className='text-[12px] sm:text-[12px] lg:text-[12px] font-[600] leading-[18px] tracking-[-0.18px] text-cool-grey-1300'>
                  {overview.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
};
// Estimates Overview
const EstimatesOverView = () => {
  //DATA
  const overviews = data.estimatesOverview;
  return (
    <React.Fragment>
      {/* TITLE & BUTTON */}
      <div className='flex items-center justify-between '>
        <p className='text-[13px] sm:text-[14px] lg:text-[16px] font-[475] leading-[22px] tracking-[-0.18px] text-cool-grey-1100'>
          Estimates Overview
        </p>
        <button className='px-[8px] rounded-[8px] bg-neutral-200 hover:bg-neutral-300 transition-all duration-400 h-[30px]'>
          <span className='text-[12px] sm:text-[12px] lg:text-[12px] font-[475] leading-[18px] tracking-[-0.18px] text-cool-grey-1100'>
            See All
          </span>
        </button>
      </div>
      <Line className='my-[11px]' />
      {/* GRAPH */}
      <div className='flex items-center justify-between gap-[33px]'>
        <div className='w-1/2'>
          <DonutChart />
        </div>
        <div className='flex flex-col gap-4 w-1/2'>
          {overviews.map((overview, index) => {
            return (
              <div className='flex items-center justify-between' key={index}>
                <div className='flex items-center gap-2'>
                  <p
                    className={`w-[10px] h-[10px] rounded-full ${overview.color}`}
                  />
                  <p className='text-[12px] sm:text-[12px] lg:text-[12px] font-[475] leading-[18px] tracking-[-0.18px] text-cool-grey-900'>
                    {overview.name}
                  </p>
                </div>
                <p className='text-[12px] sm:text-[12px] lg:text-[12px] font-[600] leading-[18px] tracking-[-0.18px] text-cool-grey-1300'>
                  {overview.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
};

// OVERVIEW
const Overview = () => {
  // OVERVIEWS
  const overviews = data.overviews;
  return (
    <React.Fragment>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <p className='text-[13px] sm:text-[14px] lg:text-[16px] font-[475] leading-[22px] tracking-[-0.18px] text-cool-grey-1100'>
            Overdue Invoice
          </p>
        </div>
      </div>
      <Line className='my-[14px]' />
      {/* INVOICES */}
      {overviews.map((overview, index) => {
        const lastLength = overviews.length - 1;
        return (
          <React.Fragment key={index}>
            <div
              className='flex items-center justify-between pr-[10px]'
              key={index}
            >
              <p className='text-[12px] sm:text-[13px] lg:text-[13px] font-[600] leading-[16px] tracking-[-0.02px] text-neutral-1200'>
                {overview.title}
              </p>

              <span className='text-[12px] sm:text-[13px] lg:text-[14px] font-[550] leading-[20px] tracking-[-0.02px] text-neutral-1000'>
                {overview.value}
              </span>
            </div>
            {index !== lastLength && <Line className='my-[16px]' />}
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
};
