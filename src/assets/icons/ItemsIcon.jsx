const ItemsIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M3.95833 7.42855H15.625M5.46627 2.5V3.78586M13.9583 2.5V3.78571M13.9583 3.78571H5.625C4.24429 3.78571 3.125 4.93697 3.125 6.35712V14.9286C3.125 16.3487 4.24429 17.5 5.625 17.5H13.9583C15.339 17.5 16.4583 16.3487 16.4583 14.9286L16.4583 6.35712C16.4583 4.93697 15.339 3.78571 13.9583 3.78571ZM6.04167 10.4286H13.5417M6.04167 13.8571H13.5417'
      stroke={props?.active ? '#0A090B' : '#7F7D83'}
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default ItemsIcon;
