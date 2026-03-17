import NotificationsIcon from '@mui/icons-material/Notifications';

const NotificationEmptyState = ({
  size = 'lg',
  hasNotifications = false,
  onViewAll,
}) => {
  const isSmall = size === 'sm';

  // Different messages based on whether user has any notifications
  const title = hasNotifications
    ? "You're all caught up!"
    : 'No notifications yet';
  const subtitle = hasNotifications
    ? 'No new notifications'
    : "We'll notify you when something happens";

  return (
    <div
      className={`text-center ${
        isSmall
          ? 'py-8 px-4'
          : 'bg-white border border-gray-200 rounded-xl p-8 sm:p-12'
      }`}
    >
      {/* Icon container */}
      <div
        className={`bg-green-100 rounded-full flex items-center justify-center mx-auto ${
          isSmall
            ? 'w-12 h-12 mb-3'
            : 'w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-4 sm:mb-5'
        }`}
      >
        <NotificationsIcon
          sx={{
            fontSize: isSmall ? '24px' : { xs: '28px', sm: '36px', lg: '44px' },
            color: 'var(--color-success)',
          }}
        />
      </div>

      {/* Title */}
      <p
        className={`font-medium text-gray-900 ${
          isSmall ? 'text-[13px]' : 'text-lg sm:text-xl'
        }`}
      >
        {title}
      </p>

      {/* Subtitle */}
      <p
        className={`text-gray-500 mt-1 ${
          isSmall ? 'text-[11px]' : 'text-sm sm:text-base'
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
};

export default NotificationEmptyState;
