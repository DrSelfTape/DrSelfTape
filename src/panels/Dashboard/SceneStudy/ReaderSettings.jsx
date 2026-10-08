import { useEffect, useState } from 'react';
import { localReaderVoices } from '../../../utils/basicReader';

export default function ReaderSettings({ value, onChange }) {
  const [voices, setVoices] = useState(() => localReaderVoices());
  useEffect(() => {
    const update = () => setVoices(localReaderVoices());
    window.speechSynthesis?.addEventListener('voiceschanged', update);
    update();
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', update);
  }, []);
  const change = patch => onChange({ ...value, ...patch });
  return <fieldset className="rounded-xl border border-black/10 p-3 my-3 text-sm text-[#0A0A0A] text-left">
    <legend className="px-1 font-semibold">Reader setup</legend>
    <div className="flex gap-2 mb-3">
      <button type="button" aria-pressed={!value.hideActor} className="min-h-[44px] px-3 border rounded-lg" onClick={() => change({ hideActor: false, showDirections: true, speakDirections: false })}>Study</button>
      <button type="button" aria-pressed={value.hideActor} className="min-h-[44px] px-3 border rounded-lg" onClick={() => change({ hideActor: true, showDirections: true, speakDirections: false })}>Rehearse from memory</button>
    </div>
    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={value.showDirections} onChange={event => change({ showDirections: event.target.checked })}/>Show parenthetical directions</label>
    <label className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={value.speakDirections} onChange={event => change({ speakDirections: event.target.checked })}/>Speak partner’s parenthetical directions</label>
    <label className="block my-2">Reader voice
      <select className="block w-full min-h-[44px] border rounded-lg bg-white px-2" value={value.engine} onChange={event => change({ engine: event.target.value, voiceURI: value.voiceURI || voices[0]?.voiceURI || '' })}>
        <option value="premium">Premium · character voices</option>
        <option value="basic" disabled={!voices.length}>Basic · installed device voice{!voices.length ? ' (unavailable)' : ''}</option>
      </select>
    </label>
    {value.engine === 'basic' && <label className="block">Installed voice
      <select className="block w-full min-h-[44px] border rounded-lg bg-white px-2" value={value.voiceURI} onChange={event => change({ voiceURI: event.target.value })}>
        {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
      </select>
      <span className="text-xs">One device voice for all partners. No premium voice tokens used.</span>
    </label>}
  </fieldset>;
}
