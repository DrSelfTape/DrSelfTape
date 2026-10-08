import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localReaderVoices, speakBasic } from '../src/utils/basicReader.js';

test('basic reader accepts installed voices only and settles on cancellation and failure', async () => {
  const local = { voiceURI: 'local', lang: 'en-US', localService: true };
  let utterance;
  let canceled = 0;
  const env = {
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: {
      getVoices: () => [local, { voiceURI: 'remote', localService: false }],
      speak: item => { utterance = item; },
      cancel: () => { canceled++; },
    },
  };
  assert.deepEqual(localReaderVoices(env.speechSynthesis), [local]);
  assert.throws(() => speakBasic('hello', 'remote', env), /no selected installed voice/);
  const first = speakBasic('Stay here.', 'local', env);
  assert.equal(utterance.text, 'Stay here.');
  assert.equal(utterance.voice, local);
  first.stop();
  await first.promise;
  assert.equal(canceled, 1);
  const second = speakBasic('Try again.', 'local', env);
  utterance.onerror({ error: 'audio-busy' });
  await assert.rejects(second.promise, /audio-busy/);
  const third = speakBasic('Finished.', 'local', env);
  utterance.onend();
  await third.promise;
});
