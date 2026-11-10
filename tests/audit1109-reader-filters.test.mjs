// 2026-11-09 audit leftovers, Find a Reader lane. Same approach as
// audit1109-match-fixes: Vite-only imports mean the components are pinned at
// source level, and the slice logic is evaluated and exercised directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const slice = read('src/redux/features/readers/readersMatchSlice.js');
const sheet = read('src/panels/Dashboard/FindAReader/ReaderFilters.jsx');
const deck = read('src/panels/Dashboard/FindAReader/index.jsx');
const chat = read('src/panels/Dashboard/FindAReader/GreenRoomChat.jsx');

const loadSlice = async (axios) => {
  const { createSlice, createAsyncThunk } = await import('@reduxjs/toolkit');
  const body = slice
    .replace(/^import .*$/gm, '')
    .replace(/export const/g, 'const')
    .replace(/export default readersMatchSlice\.reducer;/, '')
    + '\nreturn { reducer: readersMatchSlice.reducer, actions: readersMatchSlice.actions, deckFilterParams, fetchAvailableReaders, fetchMatchingStats };';
  return new Function('createSlice', 'createAsyncThunk', 'axios', 'baseURL', body)(
    createSlice, createAsyncThunk, axios, '',
  );
};

test('1: nothing PATCHes the filters route the server never had', () => {
  assert.doesNotMatch(slice, /readers\/filters/);
  assert.doesNotMatch(slice, /updateReaderFilters/);
  assert.doesNotMatch(sheet, /updateReaderFilters/);
});

test('1: saved filters become the query the deck endpoint understands', async () => {
  const { deckFilterParams } = await loadSlice({});
  assert.deepEqual(deckFilterParams({}), {});
  assert.deepEqual(deckFilterParams(undefined), {});
  assert.deepEqual(
    deckFilterParams({ genres: ['Drama', 'Sci-Fi'], union_status: 'SAG-AFTRA', availability: 'Online Now' }),
    { genres: 'Drama,Sci-Fi', union: 'sag-aftra', online: 1 },
  );
  assert.deepEqual(deckFilterParams({ union_status: 'Non-Union' }), { union: 'non-union' });
  // "No preference" values, and keys saved by the old sheet, send nothing.
  assert.deepEqual(
    deckFilterParams({ genres: [], union_status: 'Both', availability: 'Any', gender: 'Male', accent: 'Irish', age_range: '18-25', experience_level: 'Advanced' }),
    {},
  );
});

test('1: every deck and deck-count request carries the filters in state', async () => {
  const calls = [];
  const axios = { get: async (url, cfg) => { calls.push([url, cfg?.params]); return { data: { data: [] } }; } };
  const { reducer, actions, fetchAvailableReaders, fetchMatchingStats } = await loadSlice(axios);
  let state = reducer(undefined, { type: '@@init' });
  state = reducer(state, actions.setFiltersLocal({ genres: ['Comedy'], availability: 'Online Now' }));
  const getState = () => ({ readersMatch: state });
  // No argument: this is what Refresh / Try again / block-then-reload dispatch.
  await fetchAvailableReaders()(() => {}, getState, undefined);
  await fetchMatchingStats()(() => {}, getState, undefined);
  assert.deepEqual(calls, [
    ['/v1/matching/discover/', { genres: 'Comedy', online: 1 }],
    ['/v1/matching/stats/', { genres: 'Comedy', online: 1 }],
  ]);
});

test('1: the sheet offers only what a reader can be filtered on', () => {
  for (const gone of ['Experience Level', 'Accent', 'Age Range', 'Gender', 'EXPERIENCE_LEVELS', 'ACCENT_OPTIONS', 'AGE_RANGE_OPTIONS', 'GENDER_OPTIONS']) {
    assert.doesNotMatch(sheet, new RegExp(gone), `${gone} cannot be honoured and must not be offered`);
  }
  const apply = sheet.match(/const handleApply = [\s\S]*?\n {2}\};/)?.[0] || '';
  assert.match(apply, /genres,\s*union_status: unionStatus,\s*availability,\s*\};/);
});

test('1: clearing the saved filters clears the ones the deck fetch uses', () => {
  const effect = deck.match(/\/\/ Hydrate saved filters[\s\S]*?\}, \[settingsLoaded/)?.[0] || '';
  assert.ok(effect.length > 0);
  // Unconditional: an `if (has filters)` here left the old ones in state after Reset.
  assert.match(effect, /dispatch\(setFiltersLocal\(savedFilters && typeof savedFilters === 'object' \? savedFilters : \{\}\)\);\s*dispatch\(fetchAvailableReaders\(\)\);\s*dispatch\(fetchMatchingStats\(\)\);/);
});

test('2: a query parameter cannot mark a session as paid', () => {
  assert.doesNotMatch(chat, /setSessionBooked/);
  assert.match(chat, /const sessionBooked = Boolean\(otherActor\.session_booked\);/);
  const effect = chat.match(/if \(searchParams\.get\('booking'\) === 'success'\) \{[\s\S]*?\n {4}\}/)?.[0] || '';
  assert.match(effect, /setBookingReturn\(true\)/);
});

test('2: starting a call always asks the server, and 402 opens the booking sheet', () => {
  const fn = chat.match(/const handleStartRehearsal = async[\s\S]*?\n {2}\};/)?.[0] || '';
  assert.ok(fn.length > 0);
  assert.doesNotMatch(fn, /isPaidReader/);
  const catchBlock = fn.slice(fn.indexOf('} catch (err) {'));
  const paywall = catchBlock.indexOf('err?.response?.status === 402');
  const failure = catchBlock.indexOf("Couldn't start the call");
  assert.ok(paywall > -1 && paywall < failure, '402 is handled before the generic failure message');
  assert.match(catchBlock.slice(paywall, failure), /setShowBooking\(true\);[\s\S]*?return;/);
});
