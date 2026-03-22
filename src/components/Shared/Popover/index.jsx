import React from 'react';
//Local Imports
import { useOnClickOutside } from '../../../utils/utils';
const Popover = ({
  open,
  children,
  popoverRef,
  onClose,
  placement,
  width,
  height,
  className,
}) => {
  // CLICK ON OUTSIDE TO CLOSE POPOVER
  useOnClickOutside(popoverRef, onClose);

  return (
    <React.Fragment>
      <div
        className={`popover ${
          open ? 'open' : ''
        }  bg-white z-50 right-0 rounded-[8px] popover-shadow  ${
          width ? width : 'w-[200px]'
        } ${height ? height : 'h-[200px]'} ${
          placement ? placement : 'right-0 top-10'
        } ${className}`}
      >
        {children}
      </div>
    </React.Fragment>
  );
};

export default Popover;
