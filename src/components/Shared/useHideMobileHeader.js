import { useEffect } from 'react';

/**
 * useHideMobileHeader — call from any modal so MobileApp's persistent
 * top bar (Aurora wordmark + notification bell + avatar) slides up out
 * of the way for the lifetime of the modal.
 *
 * Why this exists: the top bar lives at position:fixed zIndex:50.
 * Modals portal to body at z-110 and SHOULD layer above it, but they
 * collide visually at the same Y on iPhone — the avatar / bell ends up
 * sitting right on top of the modal's title row and the X close button
 * is hard to tap.
 *
 * MobileApp listens for `drst-modal-open` / `drst-modal-closed` window
 * events and force-hides the header while at least one is open. Call
 * this hook with a truthy `isOpen` whenever your modal becomes visible.
 *
 * Usage:
 *   useHideMobileHeader(isOpen);
 *
 * For modals that early-return null when closed, call this BEFORE the
 * early return so the hook order stays stable.
 */
export default function useHideMobileHeader(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, [isOpen]);
}
