import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from '../redux/http';
import { loadPersonalRecords, reviewRecordId } from '../utils/personalRecords';

export function usePersonalRecords({ review, allowDimensions = false, enabled = true } = {}) {
  const userId = useSelector(state => state.auth?.user?.id);
  const reviewId = reviewRecordId(review);
  const [snapshot, setSnapshot] = useState(null);
  // Even legacy notes without an ID refresh after a new review. Never compare
  // scores/content to invent a review identity.
  useEffect(() => {
    if (!enabled || userId == null) return;
    let active = true;
    let controller;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      loadPersonalRecords({ request: axios.get, userId, reviewId, allowDimensions, signal })
        .then(data => {
          if (active && !signal.aborted) setSnapshot({ userId, review, allowDimensions, data });
        })
        .catch(() => {
          if (active && !signal.aborted) setSnapshot({ userId, review, allowDimensions, data: null });
        });
    };
    refresh();
    window.addEventListener('online', refresh);
    return () => { active = false; controller?.abort(); window.removeEventListener('online', refresh); };
  }, [userId, reviewId, review, allowDimensions, enabled]);
  // Suppress the previous user's/tier's/result's state during the effect gap.
  return enabled && snapshot?.userId === userId && snapshot?.review === review &&
    snapshot?.allowDimensions === allowDimensions ? snapshot.data : null;
}
