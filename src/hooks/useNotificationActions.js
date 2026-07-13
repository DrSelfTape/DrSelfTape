/**
 * useNotificationActions Hook
 * 
 * Shared hook for notification actions used by both Header and Notifications page.
 * Single source of truth for click handling, validation, and navigation.
 * 
 * Features:
 * - Pre-validates before navigation (doesn't navigate if item not found)
 * - Config-driven notification handling
 * - Consistent behavior across all notification UIs
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  getNotifications, 
  markNotificationRead 
} from '../redux/features/notifications/notificationsSlice';
import { 
  NOTIFICATION_CONFIG, 
  getIdFromNotification 
} from '../routes/notificationConfig';
import { useSnackbar } from './useSnackbar';

export const useNotificationActions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useSnackbar();

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await dispatch(markNotificationRead(notificationId));
      if (result?.meta?.requestStatus === 'fulfilled') {
        dispatch(getNotifications());
      }
      return result;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Mark all notifications as read
   * @param {Array} notifications - List of notifications
   * @param {Object} options - Optional callbacks
   * @param {Function} options.onComplete - Called after marking complete (e.g., close popover)
   */
  const markAllAsRead = useCallback(async (notifications, options = {}) => {
    const { onComplete } = options;
    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map(n => dispatch(markNotificationRead(n.id)))
      );
      dispatch(getNotifications());
      // No success toast - UI state change is sufficient feedback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      toast.error('Failed to mark notifications as read');
      throw error;
    }
  }, [dispatch, toast]);

  /**
   * Handle notification click with pre-validation
   * 
   * @param {Object} notification - The notification object
   * @param {Object} options - Optional callbacks
   * @param {Function} options.onBeforeNavigate - Called before navigation (e.g., close popover)
   */
  const handleNotificationClick = useCallback(async (notification, options = {}) => {
    const { onBeforeNavigate } = options;
    const { notification_type: type } = notification;

    // Live scene request → JOIN the partner's existing Daily room. The
    // room_url rides in the notification payload (BE StartRehearsalView),
    // so we jump straight into /meeting like socket.jsx's incoming-call
    // modal does. Without this, rehearsal_started fell through to the
    // green-room CHAT route, where the only CTA re-runs Start Rehearsal
    // and mints a NEW room — stranding the two users in different rooms
    // (the "loop of new sessions" bug). Falls through to the normal route
    // if there's no room_url (old/expired notification).
    const liveRoomUrl = notification?.data?.room_url;
    if (type === 'rehearsal_started' && liveRoomUrl) {
      let roomId = '';
      try { roomId = new URL(liveRoomUrl).pathname.split('/').filter(Boolean).pop() || ''; } catch { roomId = ''; }
      if (roomId) {
        if (!notification.is_read) markAsRead(notification.id);
        if (onBeforeNavigate) onBeforeNavigate();
        // Carry the real match id (room slug ≠ match) so the post-call screen
        // rates the right match and routes back to its chat.
        navigate(`/meeting/${roomId}`, { state: { roomUrl: liveRoomUrl, matchId: notification?.data?.match_id || null } });
        return;
      }
    }

    const config = NOTIFICATION_CONFIG[type];

    // Handle unknown notification types
    if (!config) {
      toast.info('This notification has no associated action.');
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      return;
    }

    // Handle action-only notifications (no navigation)
    if (config.onlyAction && config.action) {
      await config.action(dispatch, notification, toast);
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      return;
    }

    // Handle navigable notifications
    if (config.route) {
      const path = config.route;
      const search = config.search || '';
      const highlightKey = config.highlightKey || 'highlightId';
      
      // Get the target ID from notification
      const targetId = config.getHighlightId 
        ? config.getHighlightId(notification) 
        : getIdFromNotification(notification);

      // Check if user is already on the target route
      const isOnTargetRoute = location.pathname === path && 
        (!search || location.search === search || 
         new URLSearchParams(location.search).get('tab') === new URLSearchParams(search).get('tab'));

      // Refresh data and validate if needed
      let targetItem = null;
      let hasOthers = false;
      
      if (config.refreshAction) {
        const result = await dispatch(config.refreshAction());
        
        // Skip validation if configured (for modal-based notifications)
        if (config.skipValidation) {
          targetItem = { id: targetId }; // Always consider valid
        } else if (config.validateFn && targetId) {
          // Validate if the target item exists
          targetItem = config.validateFn(result, targetId);
        }
        
        // Check if there are other items (for "has others" message)
        const payload = result?.payload;
        if (Array.isArray(payload)) {
          hasOthers = payload.length > 0;
        } else if (payload?.pending || payload?.accepted) {
          hasOthers = (payload.pending?.length > 0) || (payload.accepted?.length > 0);
        } else if (payload?.shares) {
          hasOthers = payload.shares.length > 0;
        }
      } else {
        // No refresh action, assume item exists
        targetItem = { id: targetId };
      }

      // Determine if we should validate
      const shouldValidate = config.validateFn && !config.skipValidation && targetId;
      
      // PRE-VALIDATION: Check if item exists before navigating
      if (shouldValidate && !targetItem) {
        // Item not found - show toast and DON'T navigate
        toast.info(config.notFoundMessage || 'This item is no longer available.');
        if (!notification.is_read) {
          markAsRead(notification.id);
        }
        return; // Stop here, no navigation
      }

      // Item exists or no validation needed - proceed with navigation
      // Call onBeforeNavigate callback (e.g., close popover)
      if (onBeforeNavigate) {
        onBeforeNavigate();
      }

      // Build navigation state
      const baseState = { notification };
      
      if (isOnTargetRoute) {
        // Already on the page - trigger refresh with replace
        navigate({ pathname: path, search }, { 
          state: { 
            ...baseState, 
            [highlightKey]: targetItem?.id || targetId, 
            forceRefresh: Date.now() 
          },
          replace: true 
        });
      } else {
        // Navigate to the page
        navigate({ pathname: path, search }, { 
          state: { 
            ...baseState, 
            [highlightKey]: targetItem?.id || targetId 
          } 
        });
      }
    }

    // Mark as read after processing
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  }, [dispatch, navigate, location, toast, markAsRead]);

  /**
   * Refresh notifications from API
   */
  const refreshNotifications = useCallback(() => {
    return dispatch(getNotifications());
  }, [dispatch]);

  return {
    handleNotificationClick,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
};

export default useNotificationActions;
