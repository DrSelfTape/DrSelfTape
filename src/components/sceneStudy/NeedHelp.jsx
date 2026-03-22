const NeedHelp = () => {
  return (
    <div className='rounded-lg border bg-white text-secondary shadow-sm'>
      <div className='flex flex-col space-y-1.5 p-6 pb-2'>
        <div className='text-2xl font-semibold leading-none tracking-tight text-secondary-dark'>
          Need Help?
        </div>
      </div>
      <div className='p-3 sm:p-6'>
        <div className='flex flex-col gap-2'>
          <button className='inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary-light hover:text-secondary-dark h-10 px-4 py-2 justify-start gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='lucide lucide-circle-help h-4 w-4'
            >
              <circle cx='12' cy='12' r='10'></circle>
              <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'></path>
              <path d='M12 17h.01'></path>
            </svg>
            <span>How to use AI Scene Partner</span>
          </button>
          <button className='inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary-light hover:text-secondary-dark h-10 px-4 py-2 justify-start gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='lucide lucide-circle-help h-4 w-4'
            >
              <circle cx='12' cy='12' r='10'></circle>
              <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'></path>
              <path d='M12 17h.01'></path>
            </svg>
            <span>Script analysis tips</span>
          </button>
          <button className='inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary-light hover:text-secondary-dark h-10 px-4 py-2 justify-start gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='lucide lucide-circle-help h-4 w-4'
            >
              <circle cx='12' cy='12' r='10'></circle>
              <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'></path>
              <path d='M12 17h.01'></path>
            </svg>
            <span>Contact support</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NeedHelp;
