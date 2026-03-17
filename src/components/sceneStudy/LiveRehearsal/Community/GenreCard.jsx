import { CustomButton } from '../../../Shared';

export const GenreCard = ({ genre, readers, onClick }) => {
  return (
    <div className='bg-white rounded-xl shadow-sm border border-style p-6 flex flex-col items-center text-center h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer' onClick={onClick}>
      <div className='text-lg font-semibold text-secondary-dark mb-2'>{genre}</div>
      <div className='text-sm text-secondary mb-4'>
        {readers} {readers === 1 ? 'reader' : 'readers'}
      </div>
      <CustomButton
        className='!text-sm !font-medium !border !border-input !h-9 !rounded-md !px-4'
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        variant='outlined'
      >
        View Readers
      </CustomButton>
    </div>
  );
};
