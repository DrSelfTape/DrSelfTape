const AuditionIcon = ({width, height, ...props}) => (
 <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width || 19}
    height={height || 19}
    viewBox='0 0 24 24'
    {...props}
  >
    <g fill='none' stroke='currentColor' strokeWidth='1.5'>
      <rect x='1' y='1' width='22' height='22' rx='4' />
      <path d='M7 7h6M7 11h3M7 15h2' strokeLinecap='round' />
      <circle cx='16.5' cy='16.5' r='3.5' />
      <path
        d='M15.5 16.5l1 1 2-2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </g>
  </svg>
);
export default AuditionIcon;
