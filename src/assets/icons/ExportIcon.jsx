const ExportIcon = ({ width, height, ...props }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width || 24}
    height={height || 24}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    strokeLinecap='round'
    strokeLinejoin='round'
    className='lucide lucide-printer h-4 w-4'
    {...props}
  >
    {'\n    //             '}
    <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' />
    {'\n    //             '}
    <path d='M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6' />
    {'\n    //             '}
    <rect x={6} y={14} width={12} height={8} rx={1} />
    {'\n    //           '}
  </svg>
);
export default ExportIcon;
