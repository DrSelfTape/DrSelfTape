const PlusIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M10 6L10 14M14 10L6 10'
      stroke='#4F4D55'
      strokeWidth={1.5}
      strokeLinecap='round'
    />
  </svg>
);
export default PlusIcon;
