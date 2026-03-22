const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className='space-y-2 md:max-w-[315px]'>
      <h3 className='font-medium flex items-center gap-2'>
        {icon}
        <span>{title}</span>
      </h3>
      <p className='text-sm text-muted-foreground'>{description}</p>
    </div>
  );
};

export default FeatureCard;
