import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertApiDestination } from '../src/utils/apiDestination.js';

test('authenticated requests accept API-relative and same-origin endpoints only', () => {
  const api = 'https://api.example.test/api';
  for (const url of ['/v1/users/', 'v1/ai/tts/', 'https://api.example.test/api/v1/users/']) {
    assert.doesNotThrow(() => assertApiDestination(url, api, api));
  }
  assert.doesNotThrow(() => assertApiDestination('/v1/users/', undefined, 'http://localhost:8000/api'));
  for (const url of ['https://attacker.test/collect', '//attacker.test/collect', 'https://api.example.test.attacker.test/', 'https://api.example.test@attacker.test/', 'https://name:password@api.example.test/', 'data:text/plain,hello']) {
    assert.throws(() => assertApiDestination(url, api, api), {code:'ERR_UNTRUSTED_API_DESTINATION'});
  }
  assert.throws(() => assertApiDestination('/v1/users/', 'https://attacker.test/', api), {code:'ERR_UNTRUSTED_API_DESTINATION'});
});
