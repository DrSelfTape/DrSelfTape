import test from 'node:test';
import assert from 'node:assert/strict';
import { plainBody } from '../src/utils/plainBody.js';

test('a FormData becomes a plain object with every field', () => {
  const fd = new FormData();
  fd.append('email', 'a@b.com');
  fd.append('password', 'pw');
  fd.append('first_name', 'Sabrina');
  fd.append('role', 'actor');
  fd.append('date_of_birth', '1992-03-12');
  const body = { ...plainBody(fd), ph_distinct_id: 'x' };
  assert.deepEqual(body, {
    email: 'a@b.com', password: 'pw', first_name: 'Sabrina', role: 'actor',
    date_of_birth: '1992-03-12', ph_distinct_id: 'x',
  });
});

test('the bug: spreading a FormData directly loses every field', () => {
  const fd = new FormData();
  fd.append('email', 'a@b.com');
  // Browsers give {} outright; Node's FormData carries only a symbol-keyed
  // state slot. Either way no field survives as a string key.
  assert.deepEqual(Object.keys({ ...fd }), []);
});

test('plain objects pass through, null becomes {}', () => {
  assert.deepEqual(plainBody({ email: 'a@b.com' }), { email: 'a@b.com' });
  assert.deepEqual(plainBody(null), {});
});
