import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { createOnboardingSession } from '../src/panels/Onboarding/onboardingSession.js';

for (const boundary of ['logout and another account', 'logout and the same account', 'unmount then logout']) {
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
    if (boundary === 'unmount then logout') scope.dispose();
    store.dispatch({ type: 'account', payload: null });
    store.dispatch({ type: 'account', payload: { id: boundary === 'logout and another account' ? 99 : 42, token: 'b' } });
    resolve({ first_name: 'Actor A' });
    assert.equal(await pending, false);
    assert.equal(aborted, false);
    assert.equal(store.getState().profile, null);
    let dispatched = false;
    assert.equal(await scope.run(() => { dispatched = true; }, {}), false);
    assert.equal(dispatched, false);
    scope.dispose();
  });
}

for (const boundary of ['unmount', 'token rotation']) {
  test(`a same-account save completes after ${boundary}`, async () => {
    let resolve;
    let aborted = false;
    const save = createAsyncThunk('test/save', async (_, { signal }) => {
      signal.addEventListener('abort', () => { aborted = true; });
      return new Promise(done => { resolve = done; });
    });
    const store = configureStore({ reducer: (state = {auth: {user: {id: 42, token: 'a'}}, profile: null}, action) => {
      if (action.type === 'rotate') return {...state, auth: {user: {id: 42, token: 'b'}}};
      if (action.type === save.fulfilled.type) return {...state, profile: action.payload};
      return state;
    }});
    const scope = createOnboardingSession(store);
    const pending = scope.run(store.dispatch, save());
    if (boundary === 'unmount') scope.dispose();
    else store.dispatch({type: 'rotate'});
    resolve({first_name: 'Joseph'});
    assert.equal(await pending, true);
    assert.equal(aborted, false);
    assert.equal(store.getState().profile.first_name, 'Joseph');
    scope.dispose();
  });
}

test('a pending save has no eight-second deadline and waits for acknowledgment', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  let aborted = false;
  let resolve;
  const store = {getState: () => ({auth: {user: {id: 42, token: 'a'}}}), subscribe: () => () => {}};
  const scope = createOnboardingSession(store);
  let settled = false;
  const result = scope.run(() => ({unwrap: () => new Promise(done => {resolve = done;}), abort: () => { aborted = true; }}), {})
    .then(saved => {settled = true; return saved;});
  t.mock.timers.tick(9000);
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(aborted, false);
  assert.equal(scope.current(), true);
  resolve({});
  assert.equal(await result, true);
  scope.dispose();
});
