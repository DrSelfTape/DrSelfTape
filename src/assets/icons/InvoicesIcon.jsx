const InvoicesIcon = ({ width, height, props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M10.9723 2.5V6.25C10.9723 6.76777 11.4076 7.1875 11.9445 7.1875H15.8334M11.1391 2.5H6.11119C5.03731 2.5 4.16675 3.33947 4.16675 4.375V15.625C4.16675 16.6605 5.03731 17.5 6.11119 17.5H13.889C14.9629 17.5 15.8334 16.6605 15.8334 15.625V7.02665C15.8334 6.52937 15.6286 6.05246 15.2639 5.70083L12.514 3.04917C12.1494 2.69754 11.6548 2.5 11.1391 2.5Z'
      stroke={props?.active ? '#0A090B' : '#7F7D83'}
      strokeWidth={1.5}
    />
  </svg>
);
export default InvoicesIcon;
