/**
 * useNotificationSync Hook
 * 
 * Handles real-time notification sync via WebSocket.
 * Used by both Header and Notifications page to stay in sync.
 * 
 * Features:
 * - Listens to incoming socket notifications
 * - Deduplicates notifications
 * - Triggers config-driven refresh actions
 * - Shows toast messages for new notifications
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useSocket } from '../socket/socket';
import { getNotifications } from '../redux/features/notifications/notificationsSlice';
import { SOCKET_NOTIFICATION_HANDLERS } from '../routes/notificationConfig';
import { useSnackbar } from './useSnackbar';

export const useNotificationSync = (currentNotifications = []) => {
  const dispatch = useDispatch();
  const { notifications: incomingNotification } = useSocket();
  const { toast } = useSnackbar();
  const processedIdsRef = useRef(new Set());

  /**
   * Process incoming socket notifications
   */
  const processSocketNotifications = useCallback((incoming, existing) => {
    if (!incoming || incoming.length === 0) return [];

    // Filter only new notifications not already processed or in list
    const filtered = incoming.filter((socketItem) => {
      const socketId = socketItem.data?.id || socketItem.id;
      
      // If no ID, always consider it new (can't dedupe without ID)
      if (!socketId) return true;
      
      // Skip if already processed in this session
      if (processedIdsRef.current.has(socketId)) return false;
      
      // Skip if already in existing notifications
      const alreadyExists = existing.some((apiItem) => {
        const apiId = apiItem.id || apiItem.data?.id;
        return apiId === socketId;
      });
      
      return !alreadyExists;
    });

    return filtered;
  }, []);

  /**
   * Handle new notifications - trigger refresh actions and toasts
   */
  const handleNewNotifications = useCallback((newNotifications) => {
    newNotifications.forEach((notif) => {
      const notification = notif.data || notif;
      const socketId = notification.id;
      
      // Mark as processed
      if (socketId) {
        processedIdsRef.current.add(socketId);
      }
      
      // Get notification type
      const type = notification.notification_type || notification.type;
      const handler = SOCKET_NOTIFICATION_HANDLERS[type];
      
      if (handler) {
        // Refresh data if handler specifies
        if (handler.refreshAction) {
          dispatch(handler.refreshAction());
        }
        // Show toast if handler specifies
        if (handler.toastMessage) {
          toast.info(handler.toastMessage);
        }
      }
    });

    // Always refresh notifications list
    if (newNotifications.length > 0) {
      dispatch(getNotifications());
    }
  }, [dispatch, toast]);

  // Process incoming notifications
  useEffect(() => {
    if (!incomingNotification || incomingNotification.length === 0) return;

    const newNotifications = processSocketNotifications(
      incomingNotification, 
      currentNotifications
    );

    if (newNotifications.length > 0) {
      handleNewNotifications(newNotifications);
    }
  }, [incomingNotification, currentNotifications, processSocketNotifications, handleNewNotifications]);

  // Cleanup processed IDs periodically to prevent memory leak
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Keep only last 100 processed IDs
      if (processedIdsRef.current.size > 100) {
        const arr = Array.from(processedIdsRef.current);
        processedIdsRef.current = new Set(arr.slice(-50));
      }
    }, 60000); // Every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    // Expose for components that need to know about incoming notifications
    incomingNotification,
  };
};

export default useNotificationSync;
