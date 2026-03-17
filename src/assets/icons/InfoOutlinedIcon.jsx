export const InfoOutlinedIcon = ({ width, height, ...props }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width || 30} height={height || 30} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4"></path>
      <path d="M12 8h.01"></path>
    </svg>
  )
}