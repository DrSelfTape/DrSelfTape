import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrubPostHogEvent, scrubTelemetry } from '../src/utils/telemetryPrivacy.js';

test('telemetry removes auth, scripts, identity and signed media links without mutating the event', () => {
  const original = {message:'Failed https://storage.example.test/private/secret.mp4?signature=abc for actor@example.test',
    request:{headers:{Authorization:'Bearer private-jwt',Cookie:'session=secret'},data:'password=private'},
    extra:{script_text:'Unreleased script',transcript:'Private audition',nested:{refresh:'refresh-secret'}},
    user:{id:'42',email:'actor@example.test'},tags:{feature:'reader'},level:'error'};
  const result = scrubTelemetry(original);
  const json = JSON.stringify(result);
  for (const value of ['private-jwt','session=secret','password=private','Unreleased script','Private audition','refresh-secret','actor@example.test','secret.mp4','signature=abc']) assert.ok(!json.includes(value),value);
  assert.equal(result.user.id,'42');
  assert.equal(result.tags.feature,'reader');
  assert.equal(result.level,'error');
  assert.equal(original.request.headers.Authorization,'Bearer private-jwt');
  assert.equal(scrubTelemetry({filename:'https://app.example.test/assets/index-abc.js?token=secret'}).filename,'https://app.example.test/assets/index-abc.js');
});

test('telemetry redacts bearer strings and terminates cyclic diagnostics safely', () => {
  const value = {message:'Failure using Bearer abcdef123'};
  value.self = value;
  const json = JSON.stringify(scrubTelemetry(value));
  assert.ok(!json.includes('abcdef123'));
  assert.ok(json.includes('[redacted nested value]'));
});

test('PostHog transport retains only the configured public project token', () => {
  const event = {event:'reader_started',timestamp:new Date('2026-10-07T12:00:00Z'),properties:{token:'untrusted-token',nested:{token:'private-token'},email:'actor@example.test',feature:'reader'}};
  const scrubbed = scrubPostHogEvent(event, 'phc_public_project_key');
  assert.equal(scrubbed.properties.token,'phc_public_project_key');
  assert.equal(scrubbed.properties.nested.token,'[redacted]');
  assert.equal(scrubbed.properties.email,'[redacted]');
  assert.equal(scrubbed.properties.feature,'reader');
  assert.ok(scrubbed.timestamp instanceof Date);
  assert.equal(scrubbed.timestamp.getTime(),event.timestamp.getTime());
  assert.notEqual(scrubbed.timestamp,event.timestamp);
  assert.equal(event.properties.token,'untrusted-token');
  assert.equal(scrubPostHogEvent(null,'phc_public_project_key'),null);
});
