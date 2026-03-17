const ScriptUploadIcon = ({ width, height, props }) => (
  <svg
    fill='none'
    width={width || 24}
    height={height || 24}
    stroke='currentColor'
    viewBox='0 0 24 24'
    {...props}
  >
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
    />
  </svg>
);

export default ScriptUploadIcon;
