import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';
import { useDispatch, useSelector } from 'react-redux';
import { Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CircleIcon from '@mui/icons-material/Circle';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { NotificationIcon } from '../../../assets/icons';
import { getPageName, formatRelativeTime } from '../../../utils/utils';
import { Line } from '../Line';
import { CustomPopover } from '../CustomPopover';
import { CustomAvatar } from '../CustomAvatar';
import { PopoverData } from '../PopoverData';
import NotificationEmptyState from '../NotificationEmptyState';
import { logoutUser, getProfileDetails, switchRole } from '../../../redux/features/auth/authSlice';
import { getNotifications } from '../../../redux/features/notifications/notificationsSlice';
import { sideMenuRoutes } from '../../../routes/sideMenuConfig';
import { useNotificationActions } from '../../../hooks/useNotificationActions';
import { useNotificationSync } from '../../../hooks/useNotificationSync';
import { useStoreData } from '../../../hooks/useStoreData';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { setAuthToken } from '../../../redux/http';
import { getFirstRouteByRole } from '../../../routes/routeHelpers';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export const Header = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const parentPage = pathSegments[0] || '';
  const childPage = pathSegments[1] || '';
  const subChildPage = pathSegments[2] || '';
  const scriptId = pathSegments[3] || '';
  // Only show breadcrumbs on /scene-study/collaboration/ai-scene-partner/:scriptId
  const isAiScenePartnerBreadcrumb =
    parentPage === 'scene-study' && 
    childPage === 'collaboration' && 
    subChildPage === 'ai-scene-partner' &&
    scriptId; // Must have scriptId (like '126')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] =
    useState(false);
  const user = useSelector((state) => state?.auth?.user);
  const profileDetails = useSelector((state) => state?.auth?.profileDetails);
  const { loading: switchRoleLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useSnackbar();
  const { role, hasMultipleRoles, hasRole, allUserPermissions } = useStoreData();
  const {
    notifications: notificationsList,
    loading,
    error,
  } = useSelector((state) => state.notifications);
  const [notifications, setNotifications] = useState(notificationsList);
  
  // Use shared notification hooks
  const { 
    handleNotificationClick: sharedHandleNotificationClick, 
    markAllAsRead 
  } = useNotificationActions();
  
  // Use shared socket sync
  useNotificationSync(notifications);
  
  const handleLogout = () => {
    dispatch(logoutUser());
  };
  const handleProfile = () => {
    setIsPopoverOpen(false);
    navigate('/settings');
  };

  const handleSwitchRole = async (targetRole) => {
    if (switchRoleLoading) return;

    try {
      setIsPopoverOpen(false);
      
      const result = await dispatch(switchRole({ role: targetRole })).unwrap();

      // Update token
      const newToken = result?.token?.access || result?.access;
      if (newToken) {
        setAuthToken(newToken);
      }

      // Show success message
      const roleLabel = getRoleLabel(targetRole);
      toast.success(`Successfully switched to ${roleLabel} role.`);

      // Navigate to role-specific dashboard
      const firstRoute = getFirstRouteByRole(targetRole);
      navigate(firstRoute, { replace: true });
    } catch (error) {
      const errorMessage =
        typeof error === 'string'
          ? error
          : error?.message || 'Failed to switch role. Please try again.';

      toast.error(errorMessage);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      actor: 'Actor',
      coach: 'Reader',
      agent: 'Agent',
      casting_director: 'Casting Director',
      admin: 'Admin',
    };
    return labels[role] || role;
  };

  // Mark all notifications as read using shared hook
  const handleMarkAllRead = async () => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );

    try {
      await markAllAsRead(notifications, {
        onComplete: () => setIsNotificationPopoverOpen(false),
      });
    } catch (error) {
      // Revert on error - will be synced by refreshNotifications in hook
      dispatch(getNotifications());
    }
  };

  // Build popover data with role switcher if user has multiple roles
  const popoverData = [];

  // Add role switcher options if user has multiple roles
  if (hasMultipleRoles && allUserPermissions.length > 1) {
    // Find the other role(s) the user can switch to
    const otherRoles = allUserPermissions.filter((r) => r !== role);
    
    otherRoles.forEach((otherRole) => {
      popoverData.push({
        icon: <SwapHorizIcon fontSize='small' />,
        label: { text: `Switch to ${getRoleLabel(otherRole)}` },
        action: () => handleSwitchRole(otherRole),
      });
    });
  }

  // Add separator line if role switcher items exist
  if (popoverData.length > 0) {
    popoverData.push({
      icon: null,
      label: { text: 'separator' },
      action: null,
      isSeparator: true,
    });
  }

  // Add Settings and Logout
  popoverData.push(
    {
      icon: <ManageAccountsIcon fontSize='small' />,
      label: { text: 'Settings' },
      action: handleProfile,
    },
    {
      icon: <LogoutIcon fontSize='14px' />,
      label: { text: 'Logout' },
      action: handleLogout,
    }
  );

  useEffect(() => {
    dispatch(getNotifications());
    // Always fetch profile details on mount to ensure we have the latest data
    // This ensures the profile image is always up-to-date after login or long periods
    if (user) {
      dispatch(getProfileDetails());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (notificationsList?.length >= 0) {
      setNotifications(notificationsList);
    }
  }, [notificationsList]);

  // Wrapper for shared notification click handler
  const handleNotificationClick = (notification) => {
    sharedHandleNotificationClick(notification, {
      onBeforeNavigate: () => setIsNotificationPopoverOpen(false),
    });
  };

  // Handle "See All" - smart navigation
  const handleSeeAll = () => {
    setIsNotificationPopoverOpen(false);
    // Don't navigate if already on notifications page
    if (location.pathname !== '/notifications') {
      navigate('/notifications');
    }
  };

  const menuRoutes = sideMenuRoutes(user?.role || '');

  const isChildInSideMenu = menuRoutes.some(
    (route) =>
      route.child &&
      route.child.some((child) => child.path === `/${parentPage}/${childPage}`)
  );

  const sortedNotifications = [...notifications].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  // Filter unread notifications for the popover
  const unreadNotifications = sortedNotifications.filter((n) => !n.is_read);
  const unreadCount = unreadNotifications.length;
  return (
    <div className='py-[10px] pl-4 pr-[17px] flex items-center justify-between border-b border-style h-[70px] bg-white'>
      {/* Page Title / Breadcrumb */}
      <div className='flex items-center gap-2 max-w-[60%] sm:max-w-[70%]'>
        <h1 className='text-[14px] sm:text-[16px] font-bold leading-[22px] truncate'>
          <div className='text-sm flex items-center text-secondary-dark'>
            {parentPage ? (
              <>
                {isAiScenePartnerBreadcrumb ? (
                  <span className='font-medium truncate cursor-default'>
                    {getPageName(parentPage)}
                  </span>
                ) : isChildInSideMenu ? (
                  <span className='font-medium truncate cursor-default'>
                    {getPageName(parentPage)}
                  </span>
                ) : (
                  <Link
                    to={`/${parentPage}`}
                    className='hover:text-primary transition-colors font-medium truncate'
                  >
                    {getPageName(parentPage)}
                  </Link>
                )}
                {childPage && (
                  <>
                    <NavigateNextIcon
                      sx={{
                        fontSize: 18,
                        color: 'var(--color-secondary)',
                        mx: 0.5,
                      }}
                    />
                    {isAiScenePartnerBreadcrumb ? (
                      <Link
                        to={`/${parentPage}/${childPage}`}
                        className='text-secondary-dark hover:text-primary transition-colors font-medium truncate'
                      >
                        {getPageName(childPage)}
                      </Link>
                    ) : (
                      <span className='text-primary font-semibold truncate'>
                        {getPageName(childPage)}
                      </span>
                    )}
                  </>
                )}
                {/* Show third breadcrumb level only on ai-scene-partner route with scriptId */}
                {subChildPage && isAiScenePartnerBreadcrumb && (
                  <>
                    <NavigateNextIcon
                      sx={{
                        fontSize: 18,
                        color: 'var(--color-secondary)',
                        mx: 0.5,
                      }}
                    />
                    <span className='text-primary font-semibold truncate'>
                      {getPageName(subChildPage)}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className='text-primary font-semibold truncate'>Dashboard</span>
            )}
          </div>
        </h1>
      </div>

      {/* Right Side Icons */}
      <div className='flex items-center gap-3 sm:gap-5'>
        {/* Notifications */}
        <CustomPopover
          open={isNotificationPopoverOpen}
          onOpenChange={setIsNotificationPopoverOpen}
          trigger={
            <Badge
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '12px',
                  padding: '4px',
                  background: 'var(--color-danger)',
                  color: 'var(--color-white)',
                },
              }}
              badgeContent={unreadCount}
            >
              <NotificationIcon />
            </Badge>
          }
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <div
            className='w-[300px] bg-white rounded-xl shadow-lg font-sans border border-style'
            style={{ minWidth: '260px', maxWidth: '340px' }}
          >
            <div className='flex justify-between items-center p-2 bg-secondary-light rounded-t-xl'>
              <span className='font-semibold text-secondary-dark text-[14px] leading-[22px]'>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className='text-[11px] text-primary hover:text-primary-dark hover:underline font-medium transition-colors cursor-pointer'
                >
                  {unreadCount === 1 ? 'Mark read' : 'Mark all read'}
                </button>
              )}
            </div>
            {loading && (
              <p className='text-center text-secondary text-[12px] leading-[22px]'>
                Loading...
              </p>
            )}
            {!loading && error && (
              <p className='text-center text-primary text-[12px] leading-[22px]'>
                {typeof error === 'string'
                  ? error
                  : 'Failed to load notifications'}
              </p>
            )}
            {!loading && !error && unreadCount === 0 && (
              <NotificationEmptyState 
                size="sm" 
                hasNotifications={sortedNotifications.length > 0}
                onViewAll={handleSeeAll}
              />
            )}
            {!loading && !error && unreadCount > 0 && (
              <div className='max-h-[280px] overflow-y-auto text-[12px] leading-[22px]'>
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className='flex items-start py-2 px-2 cursor-pointer rounded-md mb-1 transition-colors bg-white hover:bg-primary-light'
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className='mr-3 mt-1'>
                      <CircleIcon
                        sx={{ fontSize: '10px', color: 'var(--color-primary)' }}
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <span className='font-medium block text-secondary-dark truncate'>
                        {notification.title}
                      </span>
                      <p className='text-secondary text-[11px] line-clamp-2'>
                        {notification.message}
                      </p>
                      <p className='text-secondary/70 text-[10px] mt-1'>
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* See All Button */}
            <div className='border-t border-style p-2'>
              <button
                onClick={handleSeeAll}
                className='flex items-center justify-center gap-1 w-full py-2 text-[12px] font-medium text-primary hover:text-primary-dark hover:bg-primary-light rounded-md transition-colors cursor-pointer'
              >
                See All Notifications
                <NavigateNextIcon sx={{ fontSize: '16px' }} />
              </button>
            </div>
          </div>
        </CustomPopover>

        {/* Profile / User Menu */}
        <CustomPopover
          trigger={
            <CustomAvatar
              userName={user?.first_name}
              hideUsername={true}
              role={user?.role}
              reverse
              avatarClass='hover:shadow-md transition-shadow'
              url={profileDetails?.user_image || user?.user_image}
            />
          }
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          open={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
        >
          <div
            className='w-[180px] bg-white rounded-xl shadow-lg border border-style'
            style={{ minWidth: '160px', maxWidth: '220px' }}
          >
            <div className='p-2.5'>
              <CustomAvatar 
                userName={user?.first_name} 
                role={user?.role}
                url={profileDetails?.user_image || user?.user_image}
              />
            </div>

            <Line />
            <div className='p-3 pt-1'>
              {popoverData.map(({ icon, label, action, isSeparator }, index) => {
                if (isSeparator) {
                  return <Line key={index} className='my-2' />;
                }
                return (
                  <div
                    key={index}
                    className='flex flex-col hover:bg-secondary-light/60 rounded-md transition-colors'
                    onClick={action}
                  >
                    <PopoverData icon={icon} label={label} />
                  </div>
                );
              })}
            </div>
          </div>
        </CustomPopover>
      </div>
    </div>
  );
};