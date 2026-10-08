// Use only installed voices: never silently send a basic-reader line to a
// remote speech service. WKWebViews without this API keep the premium reader.
export function localReaderVoices(synth = globalThis.speechSynthesis) {
  return synth?.getVoices().filter(voice => voice.localService) || [];
}

export function speakBasic(text, voiceURI, env = globalThis) {
  const synth = env.speechSynthesis;
  const voice = localReaderVoices(synth).find(item => item.voiceURI === voiceURI);
  if (!voice || !env.SpeechSynthesisUtterance) {
    throw new Error('This device has no selected installed voice. Choose another voice or Premium.');
  }
  const utterance = new env.SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  let finish;
  let timer;
  const promise = new Promise((resolve, reject) => {
    finish = error => {
      clearTimeout(timer);
      utterance.onend = null;
      utterance.onerror = null;
      error ? reject(error) : resolve();
    };
    utterance.onend = () => finish();
    utterance.onerror = event => finish(new Error(`Basic voice could not play (${event.error}).`));
    // A stalled device must offer recovery rather than advance silently.
    timer = setTimeout(() => {
      finish(new Error('Basic voice timed out. Try the line again.'));
      synth.cancel();
    }, Math.max(60000, text.length * 200));
    try { synth.speak(utterance); } catch (error) { finish(error); }
  });
  return { promise, stop() { finish(); synth.cancel(); } };
}
