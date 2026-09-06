import { useSyncExternalStore } from 'react';
import { getPendingAuditionNotification, subscribeAuditionNotification } from '../utils/auditionNotification';

export default function useAuditionNotification(panel) {
  const pending = useSyncExternalStore(subscribeAuditionNotification, getPendingAuditionNotification, () => null);
  return pending?.panel === panel ? pending : null;
}
