import { useState, useEffect } from 'react';

export const CustomAvatar = ({
  userName,
  role,
  reverse = false,
  avatarClass = '',
  userNameClass = '',
  noUrlNameClass = '',
  hideUsername = false,
  url,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  const formatLabel = (key) => {
    if (!key) return '';
    
    // Map backend role values to frontend display labels
    const roleLabels = {
      coach: 'Reader',
      actor: 'Actor',
      agent: 'Agent',
      casting_director: 'Casting Director',
      admin: 'Admin',
    };
    
    // If it's a known role, return the mapped label
    if (roleLabels[key]) {
      return roleLabels[key];
    }
    
    // Otherwise, format it normally
    return (
      key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  // Reset error state when URL changes to force image reload
  useEffect(() => {
    if (url) {
      setImageError(false);
      setImageKey(prev => prev + 1); // Force re-render with new key
    }
  }, [url]);

  const handleImageError = () => {
    setImageError(true);
  };

  const avatar = (
    <div
      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center bg-primary overflow-hidden flex-shrink-0 ${avatarClass}`}
    >
      {url && !imageError ? (
        <img
          key={imageKey}
          src={url}
          alt={userName || 'User'}
          className="w-full h-full object-cover rounded-full"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span className={`text-[14px] leading-none text-white ${noUrlNameClass}`}>
          {userName?.charAt(0).toUpperCase() || 'U'}
        </span>
      )}
    </div>
  );

  const userInfo = (
    <div className="flex flex-col leading-tight">
      <p className={`text-[14px] font-sans ${userNameClass}`}>
        {formatLabel(userName)}
      </p>
      <p className="text-[10px] font-normal text-muted font-sans break-words">
        {formatLabel(role)}
      </p>
    </div>
  );

  return (
    <div className="w-full flex justify-start">
      <div
        className={`flex items-start gap-1 font-sans ${
          reverse ? 'flex-row-reverse' : ''
        }`}
      >
        {avatar}
        {!hideUsername && userInfo}
      </div>
    </div>
  );
};
