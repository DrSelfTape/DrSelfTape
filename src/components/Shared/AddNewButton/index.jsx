import { AddIcon } from '../../../assets/icons';

export const AddNewButton = ({ onClick, text, isSearchOpen }) => {
  return (
    <button
      sx={{
        display: {
          xs: isSearchOpen ? 'none' : 'inline-flex',
          sm: 'inline-flex',
        },
      }}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-md 
        text-sm font-medium ring-offset-background transition-colors 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
        focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
        [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 
        py-2 h-10 px-3 sm:h-9 sm:px-4 gap-2 bg-[#3b82f6] text-white
        hover:bg-[#3b82f6]/80 !min-w-fit !w-fit cursor-pointer select-none
      `}
    >
      <AddIcon height={16} width={16} />
      <span>{text}</span>
    </button>
  );
};
