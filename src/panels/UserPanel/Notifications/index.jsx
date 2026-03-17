import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircleIcon } from "../../../assets/icons";
import { CircularProgress } from "@mui/material";
import { useNotificationActions } from "../../../hooks/useNotificationActions";
import { useNotificationSync } from "../../../hooks/useNotificationSync";
import { formatRelativeTime } from "../../../utils/utils";
import { NotificationEmptyState } from "../../../components/Shared";

// ============================================================
// NOTIFICATION TYPE CONFIGURATION
// ============================================================
const getTypeBadgeStyle = (type) => {
  switch (type) {
    case 'script_share_invite':
      return { style: 'bg-blue-100 text-blue-700', label: 'Invitation' };
    case 'script_share_accepted':
      return { style: 'bg-green-100 text-green-700', label: 'Accepted' };
    case 'script_share_rejected':
      return { style: 'bg-red-100 text-red-700', label: 'Declined' };
    default:
      return { style: 'bg-gray-100 text-gray-700', label: 'Notification' };
  }
};

// ============================================================
// TIME GROUPING HELPERS
// ============================================================
const getTimeGroup = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= thisWeek) return 'This Week';
  return 'Earlier';
};

const groupNotificationsByTime = (notifications) => {
  const groups = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Earlier': [],
  };

  notifications.forEach((notification) => {
    const group = getTimeGroup(notification.created_at);
    groups[group].push(notification);
  });

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
};

// ============================================================
// FILTER TABS CONFIGURATION
// ============================================================
const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// Notification card component - Clean and simple
const NotificationCard = ({ notification, onNotificationClick, onMarkAsRead }) => {
  const badge = getTypeBadgeStyle(notification.notification_type);

  return (
    <div 
      onClick={() => onNotificationClick(notification)}
      className={`group relative bg-white border rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
        !notification.is_read 
          ? 'border-l-4 border-l-primary border-t border-r border-b border-gray-200 bg-gradient-to-r from-blue-50/50 to-white' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Unread indicator dot */}
      {!notification.is_read && (
        <span className="absolute top-3 sm:top-4 right-3 sm:right-4 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-pulse" />
      )}

      <div className="pr-4 sm:pr-6">
        {/* Title */}
        <h3 className={`text-sm sm:text-base text-gray-900 leading-snug ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
          {notification.title}
        </h3>
        
        {/* Message */}
        <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 flex-wrap">
          <span className="text-[10px] sm:text-xs text-gray-500">
            {formatRelativeTime(notification.created_at)}
          </span>

          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${badge.style}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Mark as read button */}
      {!notification.is_read && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
          className="absolute top-3 sm:top-4 right-7 sm:right-10 p-1 sm:p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
          title="Mark as Read"
        >
          <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      )}
    </div>
  );
};

// Time group header
const TimeGroupHeader = ({ label }) => (
  <div className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2">
    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);


// ============================================================
// MAIN COMPONENT
// ============================================================
const Notifications = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  
  const { 
    notifications: notificationsList, 
    loading, 
    error 
  } = useSelector((state) => state.notifications);

  const { 
    handleNotificationClick, 
    markAsRead, 
    markAllAsRead,
    refreshNotifications 
  } = useNotificationActions();

  const sortedNotifications = useMemo(() => {
    if (!notificationsList || notificationsList.length === 0) return [];
    return [...notificationsList].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  }, [notificationsList]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return sortedNotifications.filter(n => !n.is_read);
    }
    return sortedNotifications;
  }, [sortedNotifications, activeFilter]);

  const groupedNotifications = useMemo(() => {
    return groupNotificationsByTime(filteredNotifications);
  }, [filteredNotifications]);

  useNotificationSync(sortedNotifications);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const unreadCount = sortedNotifications.filter(n => !n.is_read).length;
  const totalCount = sortedNotifications.length;

  const handleMarkAllAsRead = () => {
    markAllAsRead(sortedNotifications);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header */}
      <div className="border-b border-style px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 bg-white shrink-0">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Notifications
            </h2>
            {!loading && totalCount > 0 && (
              <span className="text-xs sm:text-sm text-gray-500">
                ({totalCount})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 1 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-success hover:bg-success/10 rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer"
              >
                <CheckCircleIcon className="!size-3.5 sm:!size-4" />
                <span className="hidden sm:inline">Mark All Read</span>
                <span className="sm:hidden">Read All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {FILTER_TABS.map((tab) => {
            const count = tab.id === 'unread' ? unreadCount : totalCount;
            const isActive = activeFilter === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Loading State - centered in full content area */}
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <CircularProgress size={32} />
          </div>
        ) : (
          <div className="w-full max-w-5xl mx-auto py-3 sm:py-4 lg:py-6 px-3 sm:px-4 lg:px-6">
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center">
                <p className="text-sm sm:text-base text-red-600 font-medium">Failed to load notifications</p>
                <button 
                  onClick={refreshNotifications}
                  className="mt-2 sm:mt-3 text-xs sm:text-sm text-primary hover:underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!error && filteredNotifications.length === 0 && (
              <NotificationEmptyState size="lg" hasNotifications={totalCount > 0} />
            )}

            {/* Grouped Notifications List */}
            {!error && groupedNotifications.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                {groupedNotifications.map(([groupLabel, notifications]) => (
                  <div key={groupLabel}>
                    <TimeGroupHeader label={groupLabel} />
                    <div className="space-y-2 sm:space-y-3 mt-1.5 sm:mt-2">
                      {notifications.map((notification) => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          onNotificationClick={handleNotificationClick}
                          onMarkAsRead={markAsRead}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
