const LeftArrowIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
    className={props.className}
  >
    <path
      d='M8.33333 5.83325L12.5 9.99992L8.33333 14.1666'
      stroke={props.color ? props.color : '#4F4D55'}
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default LeftArrowIcon;
