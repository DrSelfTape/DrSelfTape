import { ArrowRight, Mic, Pause, Play, Square, X } from 'lucide-react';

export function StudioRehearsalHeader({ role, lineIndex, lineCount, onEnd }) {
  return <header className="studio-rehearsal-header">
    <div className="studio-rehearsal-title"><div><h1>Scene study</h1><p>{role} · Live rehearsal</p></div>
      <button type="button" onClick={onEnd} aria-label="End scene"><X size={22} strokeWidth={1.5} /></button>
    </div>
    <div className="studio-scene-progress"><div role="progressbar" aria-label="Scene progress" aria-valuemin={0} aria-valuemax={lineCount} aria-valuenow={Math.min(lineIndex + 1, lineCount)}><span style={{ width: `${lineCount ? Math.min(1, (lineIndex + 1) / lineCount) * 100 : 0}%` }} /></div>
      <span>Line {Math.min(lineIndex + 1, lineCount)} of {lineCount}</span>
    </div>
  </header>;
}

export function StudioRehearsalControls({ status, paused, actorTurn, readerMode, transcript, complete, onNext, onPause, onResume, onEnd, onTimed }) {
  // The stage/quote area is hidden on phones once the scene starts, so completion
  // has to surface here or the actor is left on "Preparing your next line" forever.
  const heading = complete ? 'Scene complete' : paused ? 'Scene paused' : actorTurn ? 'Your turn' : status === 'playing' ? 'Your scene partner' : status === 'error' ? 'Let’s try again' : 'Preparing your next line';
  const detail = complete ? 'That was the last line. Finish to save your progress.' : paused ? 'Take a moment. Resume when you’re ready.' : actorTurn ? readerMode === 'listen' ? 'Listening to your line…' : 'Say your line, then tap Next line.' : status === 'playing' ? 'Listen. Let their words land.' : 'Stay in the scene.';
  return <footer className="studio-rehearsal-controls">
    <div className="studio-listening" role="status"><span className="studio-mic"><Mic size={23} strokeWidth={1.5} /></span><div><h2><span className="studio-status-dot" data-active={complete || (!paused && actorTurn)} />{heading}</h2><p>{detail}</p></div></div>
    {transcript && actorTurn && <p className="studio-transcript">“{transcript}”</p>}
    <button type="button" className="studio-primary" onClick={complete ? onEnd : paused ? onResume : onNext} disabled={!complete && !paused && !actorTurn}>
      {complete ? 'Finish scene' : paused ? 'Resume scene' : 'Next line'}<ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
    </button>
    {readerMode === 'listen' && !complete && <button type="button" className="studio-text-button" onClick={onTimed}>Switch to timed mode</button>}
    <div className="studio-session-toolbar"><button type="button" onClick={paused ? onResume : onPause}>
      <span>{paused ? <Play size={14} /> : <Pause size={14} />}</span>{paused ? 'Resume' : 'Pause'}</button>
      <button type="button" onClick={onEnd}><span><Square size={12} fill="currentColor" /></span>End scene</button></div>
  </footer>;
}
