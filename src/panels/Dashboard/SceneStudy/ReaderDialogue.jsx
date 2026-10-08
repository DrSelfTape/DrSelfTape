import { useState } from 'react';
import { spokenText } from '../../../utils/scriptParse';

export default function ReaderDialogue({ text, hidden = false, showDirections = true }) {
  const [revealed, setRevealed] = useState(false);
  if (hidden && !revealed) return <button type="button" className="min-h-[44px] px-3 border rounded-lg text-sm" onClick={() => setRevealed(true)}>Reveal my line</button>;
  return <>{showDirections ? text : spokenText(text || '')}{hidden && <button type="button" className="block min-h-[44px] text-sm underline" onClick={() => setRevealed(false)}>Hide my line</button>}</>;
}
