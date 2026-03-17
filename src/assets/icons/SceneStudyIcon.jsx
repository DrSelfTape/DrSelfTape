const SceneStudyIcon = ({ width, height,props }) => (
  <svg
    width={width || 20}
    height={height || 20}
    viewBox='0 0 24 24'
    fill='none'
    stroke={'currentColor'}
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path d='M4 2h11l5 5v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' />

    <polyline points='15 2 15 7 20 7' />

    <line x1='7' y1='11' x2='17' y2='11' />
    <line x1='7' y1='15' x2='17' y2='15' />
    <line x1='7' y1='19' x2='13' y2='19' />
  </svg>
);

export default SceneStudyIcon;
