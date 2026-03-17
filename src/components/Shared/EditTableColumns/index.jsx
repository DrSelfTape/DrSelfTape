import { EditIcon } from '../../../assets/icons';
import { CustomButton } from '../CustomButton';
import { CustomCheckbox } from '../CustomCheckbox';
import { CustomPopover } from '../CustomPopover';

export const EditTableColumns = ({
  options,
  columnData,
  columnToShow,
  setColumnToShow,
}) => {
  const handleChange = (selectedColumn) => {
    let updatedColumns = [...columnToShow];

    if (updatedColumns.find((col) => col.name === selectedColumn.name)) {
      updatedColumns = updatedColumns.filter(
        (col) => col.name !== selectedColumn.name
      );
    } else {
      updatedColumns = [...updatedColumns, selectedColumn];
    }

    const orderedColumns = columnData.filter((col) =>
      updatedColumns.some((column) => column.name === col.name)
    );

    setColumnToShow(orderedColumns);
  };

  const handleResetAll = () => {
    setColumnToShow(columnData);
  };

  return (
    <CustomPopover
      trigger={
        <>
          <div
            className={`hidden sm:flex  items-center transition-all duration-300 `}
          >
            <CustomButton variant='outlined' className='!h-[33px] !font-normal bg-primary/80 !py-0 !pl-2.5'>
              <div className='flex items-center justify-center gap-1 text-primary'>
                <EditIcon height={19} width={19} />
                <span>Columns</span>
              </div>
            </CustomButton>
          </div>
          <div className=' text-primary h-[33px] flex justify-center items-center sm:hidden'>
            <EditIcon />
          </div>
        </>
      }
    >
      <div className='p-4 flex flex-col gap-3 w-[180px] max-h-[400px]'>
        <div className='flex items-center justify-between border-b border-neutral-100 pb-2'>
          <span className='text-sm font-medium text-neutral-800'>Columns</span>
          <button
            onClick={handleResetAll}
            className='text-sm font-medium text-primary hover:text-primary-dark transition-colors cursor-pointer'
          >
            Reset All
          </button>
        </div>

        {options.map((column) => (
          <CustomCheckbox
            key={column.name}
            checked={columnToShow.some((col) => col.name === column.name)}
            setChecked={() => handleChange(column)}
            label={column.title}
            sx={{
              '& .MuiFormControlLabel-label': {
                fontSize: '14px',
                color: 'neutral.700',
              },
              '& .MuiCheckbox-root': {
                padding: '4px',
              },
            }}
          />
        ))}
      </div>
    </CustomPopover>
  );
};
