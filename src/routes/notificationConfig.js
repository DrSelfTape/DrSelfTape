import { getCoachInvites, getOutgoingShares } from '../redux/features/sceneStudyScripts/readersSlice';

export const NOTIFICATION_CONSTANTS = {
  // Highlight timing
  HIGHLIGHT_DURATION: 3000,      // How long the highlight animation lasts (ms)
  SCROLL_DELAY: 300,             // Delay before scrolling to element (ms)
  STATE_CLEANUP_DELAY: 1000,     // Delay before cleaning navigation state (ms) - must be > SCROLL_DELAY + 350ms
  
  // Default CSS classes for highlighting
  HIGHLIGHT_CLASS: 'border-primary shadow-lg ring-2 ring-primary/30 animate-notification-pulse',
  
  // Default keys
  DEFAULT_HIGHLIGHT_KEY: 'highlightId',
  DEFAULT_ID_FIELD: 'id',
};

// Helper to extract ID from notification - checks common fields
export const getIdFromNotification = (notification) => {
  return (
    notification.redirect_info?.object_id ||
    notification.share_id ||
    notification.script_share_id ||
    notification.object_id ||
    notification.related_id ||
    notification.data?.share_id ||
    notification.data?.id ||
    null
  );
};

// Notification type configurations
export const NOTIFICATION_CONFIG = {
  
  // Coach receives invitation from Actor - highlights invite card
  script_share_invite: {
    route: '/collaboration',
    search: '?tab=1',
    getHighlightId: getIdFromNotification,
    highlightKey: 'highlightId',
    refreshAction: getCoachInvites,
    validateFn: (result, targetId) => {
      const pending = result?.payload?.pending || [];
      return pending.find((inv) => String(inv.id) === String(targetId));
    },
    notFoundMessage: 'This invitation is no longer available or has been processed.',
    hasOthersMessage: 'This invitation may have been processed. Showing your current invitations.',
  },


  // Actor's invitation was accepted by Coach - opens modal with highlighted script
  script_share_accepted: {
    route: '/scene-study/live-rehearsal',
    search: '', // Tab 0 (Find a Reader) is default
    getHighlightId: getIdFromNotification,
    highlightKey: 'highlightShareId', // Used by InviteCoachModal
    refreshAction: getOutgoingShares,
    validateFn: (result, targetId) => {
      const shares = result?.payload?.shares || [];
      return shares.find((s) => String(s.id) === String(targetId));
    },
    notFoundMessage: 'This session is no longer available.',
    hasOthersMessage: 'This session may have been processed. Showing your sessions.',
  },

  // Actor's invitation was rejected by Coach - just show toast, no navigation
  script_share_rejected: {
    route: null, // No navigation - just action
    onlyAction: true,
    action: async (dispatch, notification, toast) => {
      dispatch(getOutgoingShares());
      toast.info('Your session request was declined.');
    },
  },
};

// Socket notification handlers - what to do when notification arrives via WebSocket
export const SOCKET_NOTIFICATION_HANDLERS = {
  script_share_invite: {
    refreshAction: getCoachInvites,
    toastMessage: 'New script share invitation received.',
  },
  script_share_rejected: {
    refreshAction: getOutgoingShares,
    toastMessage: 'Your session request was declined.',
  },
  script_share_accepted: {
    refreshAction: getOutgoingShares,
    toastMessage: 'Your invitation was accepted!',
  },
  // Add more socket handlers here...
};

export default NOTIFICATION_CONFIG;
