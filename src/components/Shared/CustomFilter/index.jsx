// CustomFilter.js
import { CustomPopover } from '../../../components/Shared';
import { FilterIcon } from '../../../assets/icons';

const CustomFilter = ({
  className = '',
  open,
  setOpen,
  handleClear,
  active,
  children,
}) => {
  return (
    <div className={`${className}`}>
      <CustomPopover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <div
            className={`cursor-pointer flex items-center gap-1 text-black ${
              (open || active) && 'text-primary'
            }`}
          >
            <FilterIcon className='size-5' />
          </div>
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <div className='bg-white rounded-lg border border-style shadow-lg p-4 flex flex-col gap-3 min-w-[250px]'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-semibold text-primary'>Filter Options</p>
            <p
              onClick={handleClear}
              className='cursor-pointer font-semibold text-sm text-danger hover:underline'
            >
              Clear
            </p>
          </div>
          {children && (
            <div className='flex flex-col gap-4 overflow-auto max-h-[400px] min-h-[100px]'>
              {children}
            </div>
          )}
        </div>
      </CustomPopover>
    </div>
  );
};

export default CustomFilter;
