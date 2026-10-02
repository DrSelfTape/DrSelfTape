import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const destination = '../../output/qa/ai/negative-control.json';
const r = spawnSync('./node_modules/.bin/promptfoo', ['eval','-c','promptfoo-negative.yaml','--no-cache','--output',destination], {
  cwd: new URL('.',import.meta.url), encoding:'utf8',
  env: {...process.env, DST_REVIEW_EVAL_INPUT:'', PROMPTFOO_DISABLE_TELEMETRY:'1', PROMPTFOO_DISABLE_UPDATE:'1'},
});
assert.equal(r.status,100,'Expected an assertion failure, not a passing eval or runtime error: '+r.stderr);
const result=JSON.parse(readFileSync(new URL(destination,import.meta.url)));
assert.equal(result.results.stats.failures,1);
assert.equal(result.results.stats.errors,0);
assert.ok(result.results.results[0].gradingResult.reason.includes('invalid-timestamp'));
console.log('Promptfoo rejected the deliberately invalid timestamp as expected.');
