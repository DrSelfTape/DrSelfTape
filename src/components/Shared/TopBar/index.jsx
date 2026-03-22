export const TopBar = ({ addButton, searchComponent, filter,isSearchOpen,ediColumn }) => {
  return (
    <div className={`border-b border-cool-grey-200 min-h-[65px] flex items-center justify-between px-4 bg-white overflow-auto `}>
      <div className={`${isSearchOpen?'hidden sm:block':'block'}`}>
        {addButton?addButton:null}
      </div>
      

      <div className='flex items-center gap-3 w-fit'>
        {searchComponent}
         <div className={`${isSearchOpen?'hidden sm:block':'block'}`}>
        {filter}
        </div>
            <div className={`${isSearchOpen?'hidden sm:block':'block'}`}>
        {ediColumn}
        </div>
      </div>
    </div>
  );
};
