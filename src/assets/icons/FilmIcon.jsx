const FilmIcon = ({ width, height, strokeWidth, ...props }) => (
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
    className='lucide lucide-film'
    {...props}
  >
    <rect width={18} height={18} x={3} y={3} rx={2} />
    <path d='M7 3v18' />
    <path d='M3 7h18' />
    <path d='M3 11h18' />
    <path d='M3 15h18' />
    <path d='M3 19h18' />
    <path d='M17 3v18' />
  </svg>
);
export default FilmIcon;
