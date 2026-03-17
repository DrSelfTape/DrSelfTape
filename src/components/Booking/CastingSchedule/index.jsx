// CastingSchedule.js
import React from 'react';

const CastingSchedule = ({ location, data }) => {
  // Sort data by date and title within each location
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return [...data].sort((a, b) => {
      // Sort by date first
      const dateA = new Date(a.audition_date || 0);
      const dateB = new Date(b.audition_date || 0);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      
      // If dates are the same, sort by title alphabetically
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [data]);

  return (
    <div className=''>
      <h2 className='text-lg font-semibold mb-1'>{location}</h2>
      {sortedData.length > 0 ? (
        sortedData.map((item, index) => (
          <div
            key={item.id || index}
            className='mb-4 p-3 border-input border rounded-md flex flex-col justify-between'
          >
            <div className='flex justify-between items-center mb-2'>
              <div className='text-sm font-semibold'>
                {item?.audition_time || 'Time not set'}
              </div>
              <span className='text-xs mt-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>
                {item?.audition_type}
              </span>
            </div>
            <div className='text-sm text-gray-700'>{item?.title}</div>
          </div>
        ))
      ) : (
        <p className='text-sm text-gray-500'>No upcoming sessions</p>
      )}
    </div>
  );
};

export default CastingSchedule;
