const BadgeCard = ({
  icon,
  bgColor,
  textColor,
  title,
  description,
  disabled = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center text-center p-3 transition-opacity ${
        disabled ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div
        className={`h-16 w-16 rounded-full flex items-center justify-center mb-2 ${
          disabled ? 'bg-muted' : ''
        }`}
        style={!disabled ? { backgroundColor: `${bgColor}33` } : {}}
      >
        <div
          className={`h-8 w-8 flex justify-center items-center ${
            disabled ? 'text-muted-foreground' : textColor
          }`}
        >
          {icon}
        </div>
      </div>
      <div className='font-medium'>{title}</div>
      <div className='text-xs text-muted-foreground'>{description}</div>
    </div>
  );
};

export default BadgeCard;
