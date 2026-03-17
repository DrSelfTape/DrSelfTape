import { useState } from 'react';

const AIScenePartner = () => {
  const [emotionalRange, setEmotionalRange] = useState(50);
  const [pacing, setPacing] = useState(50);
  const [naturalPauses, setNaturalPauses] = useState(true);
  const [wordEmphasis, setWordEmphasis] = useState(true);
  const [liveCoaching, setLiveCoaching] = useState(false);
  const [lineCues, setLineCues] = useState(false);

  return (
    <div className="rounded-lg border bg-white text-secondary shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="text-2xl font-semibold leading-none tracking-tight text-secondary-dark">AI Scene Partner</div>
        <div className="text-sm text-secondary">Customize your virtual reader</div>
      </div>
      <div className="p-3 sm:p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark" htmlFor="emotional-range">Emotional Range</label>
            <span className="text-sm text-secondary">Medium</span>
          </div>
          <div className="relative flex w-full touch-none select-none items-center">
            <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary-light">
              <div className="absolute h-full bg-primary" style={{ left: '0%', right: `${100 - emotionalRange}%` }}></div>
            </div>
            <div style={{ position: 'absolute', left: `calc(${emotionalRange}% - 10px)` }}>
              <div role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow={emotionalRange} className="block h-5 w-5 rounded-full border-2 border-primary bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onMouseDown={(e) => {
                const handleMouseMove = (moveE) => {
                  const rect = e.target.parentElement.getBoundingClientRect();
                  let newValue = ((moveE.clientX - rect.left) / rect.width) * 100;
                  newValue = Math.max(0, Math.min(100, newValue));
                  setEmotionalRange(newValue);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', () => document.removeEventListener('mousemove', handleMouseMove), { once: true });
              }}></div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark" htmlFor="pacing">Pacing</label>
            <span className="text-sm text-secondary">Natural</span>
          </div>
          <div className="relative flex w-full touch-none select-none items-center">
            <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary-light">
              <div className="absolute h-full bg-primary" style={{ left: '0%', right: `${100 - pacing}%` }}></div>
            </div>
            <div style={{ position: 'absolute', left: `calc(${pacing}% - 10px)` }}>
              <div role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pacing} className="block h-5 w-5 rounded-full border-2 border-primary bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onMouseDown={(e) => {
                const handleMouseMove = (moveE) => {
                  const rect = e.target.parentElement.getBoundingClientRect();
                  let newValue = ((moveE.clientX - rect.left) / rect.width) * 100;
                  newValue = Math.max(0, Math.min(100, newValue));
                  setPacing(newValue);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', () => document.removeEventListener('mousemove', handleMouseMove), { once: true });
              }}></div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark">Voice Features</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <button
                role="switch"
                aria-checked={naturalPauses}
                onClick={() => setNaturalPauses(!naturalPauses)}
                className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${naturalPauses ? 'bg-primary' : 'bg-secondary-light'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${naturalPauses ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark">Natural Pauses</label>
            </div>
            <div className="flex items-center space-x-2">
              <button
                role="switch"
                aria-checked={wordEmphasis}
                onClick={() => setWordEmphasis(!wordEmphasis)}
                className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${wordEmphasis ? 'bg-primary' : 'bg-secondary-light'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${wordEmphasis ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark">Word Emphasis</label>
            </div>
            <div className="flex items-center space-x-2">
              <button
                role="switch"
                aria-checked={liveCoaching}
                onClick={() => setLiveCoaching(!liveCoaching)}
                className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${liveCoaching ? 'bg-primary' : 'bg-secondary-light'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${liveCoaching ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark">Live Coaching</label>
            </div>
            <div className="flex items-center space-x-2">
              <button
                role="switch"
                aria-checked={lineCues}
                onClick={() => setLineCues(!lineCues)}
                className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${lineCues ? 'bg-primary' : 'bg-secondary-light'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${lineCues ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-secondary-dark">Line Cues</label>
            </div>
          </div>
        </div>
        <div className="pt-2">
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-secondary-light bg-white hover:bg-secondary-light hover:text-secondary-dark h-10 px-4 py-2 w-full gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic h-4 w-4">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
            <span>Test Voice</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIScenePartner;