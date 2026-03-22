const HelpSupportIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M10.4998 18H5.49975C4.39518 17.9999 3.49975 17.1045 3.49976 15.9999L3.49983 3.99999C3.49984 2.89542 4.39527 2 5.49983 2H14.5001C15.6046 2 16.5001 2.89543 16.5001 4V7.5M12.5001 12.9566C12.5001 11.876 13.3955 11 14.5001 11C15.6046 11 16.5001 11.876 16.5001 12.9566C16.5001 14.0371 15.6046 14.9131 14.5001 14.9131M14.5001 17.5752V17.5'
      stroke='#7F7D83'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default HelpSupportIcon;
