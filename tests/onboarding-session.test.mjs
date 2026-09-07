import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { createOnboardingSession } from '../src/panels/Onboarding/onboardingSession.js';

for (const boundary of ['logout and another account', 'logout and the same account', 'unmount', 'replacement session']) {
  test(`a pending save cannot dispatch or fulfill after ${boundary}`, async () => {
    let resolve;
    let aborted = false;
    const save = createAsyncThunk('test/save', async (_, { signal }) => {
      signal.addEventListener('abort', () => { aborted = true; });
      return new Promise(done => { resolve = done; });
    });
    const store = configureStore({ reducer: (state = { auth: { user: { id: 42, token: 'a' } }, profile: null }, action) => {
      if (action.type === 'account') return { ...state, auth: { user: action.payload } };
      if (action.type === save.fulfilled.type) return { ...state, profile: action.payload };
      return state;
    } });
    const scope = createOnboardingSession(store);
    const pending = scope.run(store.dispatch, save());
    if (boundary === 'unmount') scope.dispose();
    else {
      if (boundary !== 'replacement session') store.dispatch({ type: 'account', payload: null });
      store.dispatch({ type: 'account', payload: { id: boundary === 'logout and another account' ? 99 : 42, token: 'b' } });
    }
    resolve({ first_name: 'Actor A' });
    assert.equal(await pending, false);
    assert.equal(aborted, true);
    assert.equal(store.getState().profile, null);
    let dispatched = false;
    assert.equal(await scope.run(() => { dispatched = true; }, {}), false);
    assert.equal(dispatched, false);
    scope.dispose();
  });
}

test('a stalled save times out without acknowledging the draft', async () => {
  let aborted = false;
  const store = {getState: () => ({auth: {user: {id: 42, token: 'a'}}}), subscribe: () => () => {}};
  const scope = createOnboardingSession(store);
  const result = await scope.run(() => ({unwrap: () => new Promise(() => {}), abort: () => { aborted = true; }}), {}, 10);
  assert.equal(result, false);
  assert.equal(aborted, true);
  assert.equal(scope.current(), true);
  scope.dispose();
});
