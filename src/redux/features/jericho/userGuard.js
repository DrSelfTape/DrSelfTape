// V-02 review catch: a review/compare/recovery request that completes AFTER
// its user signed out (or after another account signed in on this browser)
// must not land in the new account's slice — the logout reset alone left the
// door open for the late response. Wrap the thunk's payload creator: the user
// id is read before the work and again after; a mismatch becomes a silent,
// stale rejection that the reducers ignore.
export const STALE_USER = Object.freeze({ stale: true, silent: true, message: '' });

const currentUserId = (getState) => getState()?.auth?.user?.id ?? null;

export const guardUser = (creator) => async (arg, api) => {
  const owner = currentUserId(api.getState);
  let result;
  try {
    result = await creator(arg, api);
  } catch (error) {
    if (currentUserId(api.getState) !== owner) return api.rejectWithValue(STALE_USER);
    throw error;
  }
  if (currentUserId(api.getState) !== owner) return api.rejectWithValue(STALE_USER);
  return result;
};
