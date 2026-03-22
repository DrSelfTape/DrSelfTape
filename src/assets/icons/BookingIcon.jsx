const BookingIcon = ({width, height, ...props}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width || 19}
    height={height || 19}
    viewBox="0 0 24 24"
    {...props}
  >
    <g>
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="23"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontFamily="Arial"
        fontWeight="bold"
        fill="currentColor"
      >
        B.
      </text>
    </g>
  </svg>
);
export default BookingIcon;
