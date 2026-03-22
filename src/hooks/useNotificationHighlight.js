/**
 * useNotificationHighlight Hook
 * 
 * A reusable hook that handles notification-based highlighting and scrolling.
 * Supports both page-level (immediate) and modal-level (async/polling) use cases.
 * 
 * Usage for Pages (reads from location.state):
 * ```jsx
 * const { isHighlighted, getHighlightProps } = useNotificationHighlight({
 *   items: myItemsList,
 *   isLoading: isLoadingData,
 *   idField: 'id',
 *   highlightKey: 'highlightId',
 *   elementIdPrefix: 'item-card',
 * });
 * ```
 * 
 * Usage for Modals (pass highlightId directly):
 * ```jsx
 * const { highlightedId } = useNotificationHighlight({
 *   items: shares,
 *   highlightId: highlightShareId,  // Direct prop instead of location.state
 *   isActive: open,                  // Only active when modal is open
 *   waitForElement: true,            // Enable polling for async rendering
 *   getElementId: (item) => `share-item-${item.script?.id}`,
 * });
 * ```
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NOTIFICATION_CONSTANTS } from '../routes/notificationConfig';

const {
  HIGHLIGHT_DURATION,
  SCROLL_DELAY,
  STATE_CLEANUP_DELAY,
  HIGHLIGHT_CLASS,
  DEFAULT_HIGHLIGHT_KEY,
  DEFAULT_ID_FIELD,
} = NOTIFICATION_CONSTANTS;

// Default max wait time for polling (2 seconds)
const DEFAULT_MAX_WAIT_TIME = 2000;
const POLL_INTERVAL = 100;

// Check if element is visible within its scrollable container
const isElementInViewport = (element) => {
  if (!element) return true;
  const container = element.closest('.overflow-y-auto');
  if (!container) return true;
  
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  return (
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom
  );
};

export const useNotificationHighlight = ({
  items = [],
  isLoading = false,
  idField = DEFAULT_ID_FIELD,
  highlightKey = DEFAULT_HIGHLIGHT_KEY,
  elementIdPrefix = 'highlight-item',
  highlightDuration = HIGHLIGHT_DURATION,
  highlightClass = HIGHLIGHT_CLASS,
  //  options for modal/async use cases:
  highlightId: propHighlightId = null,  // Direct prop (overrides location.state)
  isActive = true,                       // Control when hook is active (e.g., modal open)
  waitForElement = false,                // Enable polling for async rendering
  maxWaitTime = DEFAULT_MAX_WAIT_TIME,   // Max polling time
  getElementId = null,                   // Custom function to get element ID from item
  cleanupLocationState = true,           // Whether to clean location.state after highlighting
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get highlight ID from prop or location state
  const locationHighlightId = location.state?.[highlightKey];
  const highlightIdToUse = propHighlightId !== null ? propHighlightId : locationHighlightId;
  const forceRefresh = location.state?.forceRefresh;
  const locationKey = location.key; // Unique key for each navigation
  
  // State and refs
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightTimeoutRef = useRef(null);
  const pollTimeoutRef = useRef(null);
  const lastHandledRef = useRef(null);
  const lastLocationKeyRef = useRef(null);
  
  // Reset lastHandledRef when location changes (new navigation with highlight)
  // Don't reset on cleanup navigation (when new state has no highlightId)
  if (locationKey !== lastLocationKeyRef.current) {
    lastLocationKeyRef.current = locationKey;
    // Only reset for location-based highlighting when there's a NEW highlightId to process
    // This prevents reset when it's just a state cleanup navigation
    if (propHighlightId === null && locationHighlightId) {
      lastHandledRef.current = null;
    }
  }

  // Cleanup function for timeouts
  const cleanupTimeouts = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  // Get element ID for an item
  const getItemElementId = useCallback((item) => {
    if (getElementId && typeof getElementId === 'function') {
      return getElementId(item);
    }
    return `${elementIdPrefix}-${item[idField]}`;
  }, [getElementId, elementIdPrefix, idField]);

  // Core highlight logic - scroll first, then highlight
  const executeHighlight = useCallback((targetItem, elementId) => {
    const element = document.getElementById(elementId);
    
    if (element) {
      // Scroll to element if not visible
      const needsScroll = !isElementInViewport(element);
      
      if (needsScroll) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Apply highlight AFTER scroll completes
      setTimeout(() => {
        setHighlightedId(targetItem[idField]);
        
        // Remove highlight after duration
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedId(null);
        }, highlightDuration);
      }, 350); // Wait for scroll animation
      
      return true;
    }
    return false;
  }, [idField, highlightDuration]);

  // Handle highlight when items load or highlightId changes
  useEffect(() => {
    // Skip if not active (e.g., modal closed)
    if (!isActive) {
      cleanupTimeouts();
      setHighlightedId(null);
      return;
    }
    
    // Skip if no highlight requested or still loading
    if (!highlightIdToUse || isLoading) {
      return;
    }
    
    // Skip if no items yet
    if (!items || items.length === 0) {
      return;
    }
    
    // Create unique key for this request - include locationKey for page navigations
    // This ensures each navigation is treated as a new request
    const requestKey = propHighlightId !== null 
      ? `${highlightIdToUse}-${forceRefresh || 'prop'}`  // For modal (prop-based)
      : `${highlightIdToUse}-${locationKey}`;             // For pages (location-based)
    
    if (lastHandledRef.current === requestKey) {
      return;
    }
    
    // Mark as handled
    lastHandledRef.current = requestKey;
    
    // Find the target item - compare as strings to handle type mismatches
    const targetItem = items.find(
      (item) => String(item[idField]) === String(highlightIdToUse)
    );
    
    // Clear any existing timeouts
    cleanupTimeouts();
    
    if (targetItem) {
      const elementId = getItemElementId(targetItem);
      
      // Always use polling to handle async DOM rendering
      // This works for both pages and modals
      let elapsedTime = 0;
      const pollMaxTime = waitForElement ? maxWaitTime : 2000; // 2s default for pages
      
      const pollForElement = () => {
        const success = executeHighlight(targetItem, elementId);
        
        if (!success && elapsedTime < pollMaxTime) {
          // Element not found yet, keep polling
          elapsedTime += POLL_INTERVAL;
          pollTimeoutRef.current = setTimeout(pollForElement, POLL_INTERVAL);
        }
      };
      
      // Start polling after initial delay
      pollTimeoutRef.current = setTimeout(pollForElement, SCROLL_DELAY);
      
      // Clean up navigation state (only for location.state based highlighting)
      if (cleanupLocationState && locationHighlightId) {
        setTimeout(() => {
          navigate(location.pathname + location.search, { 
            replace: true, 
            state: {} 
          });
        }, STATE_CLEANUP_DELAY);
      }
    } else {
      // Item not found - just clean up state
      if (cleanupLocationState && locationHighlightId) {
        navigate(location.pathname + location.search, { 
          replace: true, 
          state: {} 
        });
      }
    }
  }, [
    highlightIdToUse, 
    forceRefresh, 
    locationKey,
    propHighlightId,
    isLoading, 
    isActive,
    items, 
    idField, 
    waitForElement,
    maxWaitTime,
    getItemElementId,
    executeHighlight,
    cleanupTimeouts,
    cleanupLocationState,
    locationHighlightId,
    navigate, 
    location
  ]);

  // Reset when isActive becomes false (e.g., modal closes)
  useEffect(() => {
    if (!isActive) {
      lastHandledRef.current = null;
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimeouts();
    };
  }, [cleanupTimeouts]);

  // Check if a specific item is highlighted
  const isHighlighted = useCallback(
    (itemId) => highlightedId === itemId,
    [highlightedId]
  );

  // Get highlight class for an item
  const getHighlightClass = useCallback(
    (itemId, baseClass = '') => {
      return isHighlighted(itemId) 
        ? `${baseClass} ${highlightClass}`.trim()
        : baseClass;
    },
    [isHighlighted, highlightClass]
  );

  // Get all props needed for a highlightable element
  const getHighlightProps = useCallback(
    (itemId, baseClass = '') => ({
      id: `${elementIdPrefix}-${itemId}`,
      className: getHighlightClass(itemId, baseClass),
    }),
    [elementIdPrefix, getHighlightClass]
  );

  return {
    highlightedId,
    isHighlighted,
    getHighlightClass,
    getHighlightProps,
  };
};

export default useNotificationHighlight;
