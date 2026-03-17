import { useState } from 'react';
import { DashboardStats, ReportsInvoice } from '../../../components/Dashboard';
import { Search, SelectDropdown } from '../../../components/Shared';
import CustomFilter from '../../../components/Shared/CustomFilter';
const Dashboard = () => {
  // Filters State
  const [openFilter, setOpenFilter] = useState(false);
  const [filterOptions] = useState({
    dateRange: [
      { label: '7 days', value: '7-days' },
      { label: '30 days', value: '30-days' },
      { label: '90 days', value: '90-days' },
    ],
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    dateRange: null,
  });

  // handle filters functions
  const handleFilterChange = (filterType, value) => {
    const isValid = filterOptions[filterType]?.some(
      (option) => option.value === value?.value
    );
    if (!isValid && value !== null) {
      console.warn(`Invalid filter value for ${filterType}:`, value);
      return;
    }

    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setOpenFilter(false);
    console.log(`Filter applied for ${filterType}:`, value);
  };
  const handleClear = () => {
    setSelectedFilters({
      dateRange: null,
    });
    setOpenFilter(false);
  };
  return (
    <>
      <div className='topbar-style  border-style'>
        <div className='w-full flex justify-end items-center gap-3'>
          <Search
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <div className={`${isSearchOpen ? 'hidden sm:block' : 'block'}`}>
            <CustomFilter
              open={openFilter}
              setOpen={setOpenFilter}
              handleClear={handleClear}
            >
              <div className='pt-2'>
                <SelectDropdown
                  label='Date Range'
                  onChange={(e) =>
                    handleFilterChange('dateRange', e.target.value)
                  }
                  options={filterOptions.dateRange}
                  value={selectedFilters.dateRange?.value || ''}
                  className='w-full'
                  crossIcon={false}
                  placeholder='Select a date range'
                />
              </div>
            </CustomFilter>
          </div>
        </div>
      </div>
      <div className='w-full h-full p-[10px] flex flex-col'>
        <DashboardStats />
        <ReportsInvoice />
      </div>
    </>
  );
};
export default Dashboard;
