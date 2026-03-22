const TvIcon = ({ width, height, strokeWidth, ...props }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width || 24}
    height={height || 24}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth || 2}
    strokeLinecap='round'
    strokeLinejoin='round'
    className='lucide lucide-tv'
    {...props}
  >
    <rect width={20} height={15} x={2} y={7} rx={2} ry={2} />
    <polyline points='17 2 12 7 7 2' />
  </svg>
);
export default TvIcon;
