const DownArrowIcon = ({ width, height, props }) => (
  <svg
    width={width || 30}
    height={height || 30}
    viewBox='0 0 30 30'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M10.8333 13.3333L15.0006 17.1499L19.1666 13.3333'
      stroke='#0A090B'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default DownArrowIcon;
