export const PopoverData = ({ icon, label, onClick }) => {
  return (
    <div
      onClick={onClick}
      className='flex items-center justify-start w-full gap-1 cursor-pointer rounded py-1 font-sans'
    >
      {icon && (
        <div className='flex items-center justify-center w-5 pr-1'>{icon}</div>
      )}
      <p className={`text-sm ${label?.className}`}>{label?.text}</p>
    </div>
  );
};
