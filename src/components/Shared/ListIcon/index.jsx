import React, { Fragment } from 'react';
import { NavLink } from 'react-router-dom';

const ListIcon = ({ text, icon, isHeading, link, isActive }) => {
  return (
    <React.Fragment>
      {!isHeading ? (
        <Fragment>
          <NavLink to={link}>
            <div
              className={`flex items-center gap-1.5 rounded-lg hover:bg-neutral-200 p-2 cursor-pointer transition-all duration-300 ${
                isActive
                  ? 'bg-neutral-200 shadow-[0_1.5px_4px_-1px_rgba(10, 9, 11, 0.07)]'
                  : ''
              }`}
            >
              {icon}
              <p className='text-sm font-[475] leading-5 text-neutral-1000 tracking-tighter-[-0.05px]'>
                {text}
              </p>
            </div>
          </NavLink>
        </Fragment>
      ) : (
        <Fragment>
          <div className='flex items-center gap-1.5 p-[8px] mt-4'>
            <p className='text-[10px] font-[475] leading-5 text-neutral-1000 tracking-tighter-[-0.05px] uppercase select-none'>
              {text}
            </p>
          </div>
        </Fragment>
      )}
    </React.Fragment>
  );
};

export default ListIcon;
