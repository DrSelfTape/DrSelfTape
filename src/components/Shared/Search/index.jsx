import { CrossIcon } from '../../../assets/icons';
import SearchIcon from '@mui/icons-material/Search';

export const Search = ({
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  className,
}) => {
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery('');
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {isSearchOpen ? (
        <div className="relative w-[220px] xs:w-[280px]">
          <SearchIcon
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-primary"
            style={{ fontSize: '20px' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-8 px-3 py-2 text-[14px] border border-primary rounded-lg focus:outline-none h-[35px]"
          />
          <CrossIcon
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-danger cursor-pointer"
            onClick={toggleSearch}
          />
        </div>
      ) : (
        <SearchIcon
          className="text-black cursor-pointer"
          style={{ fontSize: '24px' }}
          onClick={toggleSearch}
        />
      )}
    </div>
  );
};
