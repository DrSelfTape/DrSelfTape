import React from 'react';

export const Line = ({ className }) => {
  return (
    <React.Fragment>
      <p className={`h-[1px] w-full bg-gray-200 ${className}`} />
    </React.Fragment>
  );
};
