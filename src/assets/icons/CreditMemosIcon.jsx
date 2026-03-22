const CreditMemosIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M11.5334 15.533H3.53366C2.42912 15.533 1.53369 14.6376 1.53366 13.5331L1.53345 6.03326C1.53342 4.92867 2.42886 4.0332 3.53345 4.0332H15.533C16.6376 4.0332 17.533 4.92812 17.533 6.03272L17.5331 9.5332M2.03306 7.53308H17.0331M16.3612 15.9667L16.3612 13.8615M16.3612 13.8615L16.3612 11.7563M16.3612 13.8615H14.256M16.3612 13.8615H18.4664'
      stroke={props?.active ? '#0A090B' : '#7F7D83'}
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
export default CreditMemosIcon;
