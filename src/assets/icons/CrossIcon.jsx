const CrossIcon = ({ width, height, ...props }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width || 21}
    height={height || 21}
    viewBox='0 0 21 21'
    {...props}
  >
    <path
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      d='m15.5 15.5l-10-10zm0-10l-10 10'
      strokeWidth={1.5}
    />
  </svg>
);
export default CrossIcon;
