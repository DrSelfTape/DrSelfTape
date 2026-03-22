const EstimatesIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M2 10.2162H9.78378M10.2162 18V2M6.10811 7.62162V4.81081M4.7027 6.21622H7.51351M4.7027 14.5405H7.51351M12.8108 11.7297H15.6216M12.8108 9.13513H15.6216M4.16216 18H15.8378C17.032 18 18 17.032 18 15.8378V4.16216C18 2.96803 17.032 2 15.8378 2H4.16216C2.96803 2 2 2.96803 2 4.16216V15.8378C2 17.032 2.96803 18 4.16216 18Z'
      stroke={props?.active ? '#0A090B' : '#7F7D83'}
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default EstimatesIcon;
