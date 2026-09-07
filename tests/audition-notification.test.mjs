import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  auditionNotificationDestination, clearAuditionNotification,
  findNotifiedAudition, getPendingAuditionNotification,
  queueAuditionNotification, subscribeAuditionNotification,
} from '../src/utils/auditionNotification.js';

afterEach(() => clearAuditionNotification(getPendingAuditionNotification()));

test('slot reminders route to the audition tracker TAB on mobile (a registered screen, not a panel)', () => {
  assert.deepEqual(auditionNotificationDestination({ type: 'audition_update', audition_id: 42 }), {
    panel: 'auditions', id: '42', web: '/dashboard/auditions', mobile: { tab: 'auditions' },
  });
});

test('standalone submission reminders open their own tracker', () => {
  assert.deepEqual(auditionNotificationDestination({ type: 'audition_update', submission_id: '7' }), {
    panel: 'submissions', id: '7', web: '/dashboard/submissions', mobile: { panel: 'submissions' },
  });
});

test('slot ID wins on a linked record and invalid IDs cannot become a target', () => {
  assert.equal(auditionNotificationDestination({ type: 'audition_update', audition_id: 8, submission_id: 9 }).panel, 'auditions');
  for (const id of [0, -1, '1/other', 'NaN', {}, null]) {
    assert.equal(auditionNotificationDestination({ type: 'audition_update', audition_id: id }).id, null);
  }
});

test('old reminder types still open the tracker without requiring a record ID', () => {
  for (const type of ['audition_reminder', 'audition-reminder', 'callback_reminder', 'callback-reminder']) {
    assert.equal(auditionNotificationDestination({ type }).panel, 'auditions');
  }
  assert.equal(auditionNotificationDestination({ type: 'new_message' }), null);
});

test('a queued target survives delayed mounting and notifies current listeners', () => {
  const calls = [];
  const stop = subscribeAuditionNotification(() => calls.push(getPendingAuditionNotification()));
  const target = queueAuditionNotification({ type: 'audition_update', audition_id: 42 });
  assert.equal(getPendingAuditionNotification(), target);
  assert.equal(calls[0], target);
  clearAuditionNotification(target);
  assert.equal(getPendingAuditionNotification(), null);
  stop();
  queueAuditionNotification({ type: 'audition_update', audition_id: 43 });
  assert.equal(calls.length, 2);
});

test('late completion cannot consume a newer push and the same ID can be opened again', () => {
  const first = queueAuditionNotification({ type: 'audition_update', audition_id: 42 });
  const second = queueAuditionNotification({ type: 'audition_update', audition_id: 42 });
  assert.notEqual(first, second);
  clearAuditionNotification(first);
  assert.equal(getPendingAuditionNotification(), second);
});

test('detail selection uses only the fetched tracker and preserves its column', () => {
  const tracker = { data: { submitted: [{ id: 1, project_title: 'Other' }], callback: [{ id: 42, project_title: 'OUTPOST' }] } };
  assert.deepEqual(findNotifiedAudition(tracker, '42'), { id: 42, project_title: 'OUTPOST', _column: 'callback' });
  assert.equal(findNotifiedAudition(tracker, '99'), null);
  assert.equal(findNotifiedAudition(null, '42'), null);
});
