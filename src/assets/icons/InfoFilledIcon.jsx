const InfoFilledIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M17.5 5.31248C17.5 3.75919 16.2408 2.5 14.6875 2.5H5.3125C3.7592 2.5 2.5 3.75919 2.5 5.31248V14.6875C2.5 16.2408 3.7592 17.5 5.3125 17.5H14.6875C16.2408 17.5 17.5 16.2408 17.5 14.6875L17.5 5.31248Z'
      fill='#E6E6E6'
    />
    <path
      d='M10 6.42041V6.48429M8.82812 9.21864H10.3906L10.3909 13.9061'
      stroke='#7F7D83'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default InfoFilledIcon;
