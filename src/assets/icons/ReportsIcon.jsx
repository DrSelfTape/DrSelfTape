const ReportsIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M14 14V12M10 14V10M6 14V6M4 18C2.89543 18 2 17.1046 2 16V4C2 2.89543 2.89543 2 4 2H16C17.1046 2 18 2.89543 18 4V16C18 17.1046 17.1046 18 16 18H4Z'
      stroke={props?.active ? '#0A090B' : '#7F7D83'}
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default ReportsIcon;
