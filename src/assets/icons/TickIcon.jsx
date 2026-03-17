const TickIcon = ({ width, height, ...props }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width || 26}
    height={height || 26}
    viewBox='0 0 16 16'
    {...props}
  >
    <path
      fill='currentColor'
      d='M11.4 6.85a.5.5 0 0 0-.707-.707l-3.65 3.65l-1.65-1.65a.5.5 0 0 0-.707.707l2 2a.5.5 0 0 0 .707 0l4-4z'
    />
  </svg>
);
export default TickIcon;