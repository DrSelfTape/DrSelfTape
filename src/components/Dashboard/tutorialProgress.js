import { store } from '../../redux/store';
import { patchUserSettings } from '../../redux/features/userSettings/userSettingsSlice';

// Progress is now persisted server-side via UserSettings. We read the
// current snapshot from the Redux store so markStep can be called from
// anywhere (event handlers, async flows) without component plumbing.
function getProgress() {
  return store.getState()?.userSettings?.data?.tutorial_progress || {};
}

function markStep(stepId) {
  const current = getProgress();
  if (current[stepId]) return;
  const next = { ...current, [stepId]: true };
  store.dispatch(patchUserSettings({ tutorial_progress: next }));
  // Fire analytics for each tutorial milestone — lazy-import so this file
  // stays a tiny dependency-free helper for any panel that wants to mark.
  import('../../utils/analytics').then(({ trackEvent, Events }) => {
    trackEvent(Events.TUTORIAL_STEP, { step: stepId });
  }).catch(() => { /* swallow */ });
}

export { markStep };

