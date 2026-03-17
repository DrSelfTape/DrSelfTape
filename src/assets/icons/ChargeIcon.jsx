const ChargeIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M9.98426 14.6893V18.0833M7.07517 3.5378V2.08325M12.8933 3.5378V2.08325M15.8024 6.93174H4.16608M5.62062 6.93174H14.3479V10.8105C14.3479 12.9527 12.6113 14.6893 10.4691 14.6893H9.49941C7.35721 14.6893 5.62062 12.9527 5.62062 10.8105V6.93174Z'
      stroke='#0A090B'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default ChargeIcon;
