import React from 'react';
// Local Imports
import {
  InfoFilledIcon,
  SelectionDropArrowIcon,
  ThreeDotsIcon,
} from '../../../assets/icons';
import { Line, LineBarChat } from '../../shared';
import { data } from '../../../utils/data';

const ReportsInvoice = () => {
  // INVOICES
  const invoices = data.latestInvoices;
  return (
    <React.Fragment>
      <div className='grid grid-cols-3 gap-[10px] w-full mt-[10px]'>
        {/* REPORTS SECTION WITH GRAPH */}
        <div className='card-section col-span-3 sm:col-span-3 md:col-span-3 lg:col-span-2'>
          {/* NAME WITH SELECTIONS */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <p className='text-[13px] sm:text-[14px] lg:text-[16px] font-[475] leading-[22px] tracking-[-0.18px] text-secondary-dark'>
                Revenue overview
              </p>
              <InfoFilledIcon />
            </div>
            <div className='flex items-center rounded-[6px] border border-secondary-light pl-[8px] py-[4px]'>
              <select className='text-[12px] sm:text-[14px] lg:text-[16px] font-[475] leading-[22px] tracking-[-0.18px] text-secondary-dark appearance-none bg-secondary-light outline-none'>
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
              </select>
              <SelectionDropArrowIcon />
            </div>
          </div>
          {/* GRAPH */}
          <div>
            <LineBarChat />
          </div>
        </div>
        {/* INVOICES SECTION */}
        <div className='card-section col-span-3 sm:col-span-3 md:col-span-3 lg:col-span-1'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <p className='text-[13px] sm:text-[14px] lg:text-[16px] font-[475] leading-[22px] tracking-[-0.18px] text-secondary-dark'>
                Overdue Invoice
              </p>
            </div>
          </div>
          <Line className='my-[14px] border-secondary-light' />
          {/* INVOICES */}
          {invoices.map((invoice, index) => {
            const lastLength = invoices.length - 1;
            return (
              <React.Fragment key={index}>
                <div className='flex items-center justify-between pr-[10px]'>
                  <div>
                    <p className='text-[12px] sm:text-[13px] lg:text-[13px] font-[600] leading-[16px] tracking-[-0.02px] text-secondary-dark'>
                      {invoice.title} of {invoice.amount}
                    </p>
                    <span className='text-[11px] sm:text-[12px] lg:text-[12px] font-[475] leading-[18px] text-secondary'>
                      {invoice.timeStamp}
                    </span>
                  </div>
                  <span className='cursor-pointer'>
                    <ThreeDotsIcon />
                  </span>
                </div>
                {index !== lastLength && (
                  <Line className='my-[14px] border-secondary-light' />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
};

export default ReportsInvoice;
