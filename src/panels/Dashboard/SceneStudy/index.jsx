import { useState, useMemo, useEffect } from 'react';
import ScriptUpload from './ScriptUpload';
import RolePicker from './RolePicker';
import Teleprompter from './Teleprompter';
import RecordTake from './RecordTake';
import LiveSceneMode from './LiveSceneMode';

const STEPS = ['upload', 'pick-role', 'practice', 'record'];
const STEP_LABELS = ['Upload Script', 'Pick Role', 'Practice', 'Record'];

/**
 * Parse script text into lines with character + dialogue.
 * Supports:
 *   CHARACTER NAME: dialogue text
 *   CHARACTER NAME
 *   dialogue text (indented or on next line)
 */
function parseScript(text) {
  const lines = [];
  const rawLines = text.split('\n');
  let currentChar = null;
  let currentDialogue = [];

  const flush = () => {
    if (currentChar && currentDialogue.length > 0) {
      lines.push({
        character: currentChar,
        dialogue: currentDialogue.join(' ').trim(),
      });
    }
    currentDialogue = [];
  };

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
      currentChar = null;
      continue;
    }

    // Match "CHARACTER: dialogue" or "CHARACTER NAME: dialogue"
    const colonMatch = trimmed.match(/^([A-Z][A-Z\s.''-]{0,40}):\s*(.*)$/);
    if (colonMatch) {
      flush();
      currentChar = colonMatch[1].trim();
      if (colonMatch[2]) currentDialogue.push(colonMatch[2]);
      continue;
    }

    // Match standalone uppercase name (next line is dialogue)
    if (/^[A-Z][A-Z\s.''-]{0,40}$/.test(trimmed) && !currentDialogue.length) {
      flush();
      currentChar = trimmed;
      continue;
    }

    // Otherwise it's dialogue continuation
    if (currentChar) {
      currentDialogue.push(trimmed);
    }
  }
  flush();
  return lines;
}

function extractCharacters(lines) {
  const seen = new Set();
  return lines
    .map((l) => l.character)
    .filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });
}

export default function SceneStudy() {
  const [step, setStep] = useState('upload');
  const [scriptText, setScriptText] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('partner_male');

  // Check for preloaded script from Scripts Library
  useEffect(() => {
    const raw = sessionStorage.getItem('preloadedScript');
    if (raw) {
      try {
        const { scriptContent } = JSON.parse(raw);
        if (scriptContent) {
          setScriptText(scriptContent);
          setStep('pick-role');
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem('preloadedScript');
    }
  }, []);

  const parsedLines = useMemo(() => parseScript(scriptText), [scriptText]);
  const characters = useMemo(() => extractCharacters(parsedLines), [parsedLines]);

  const currentStepIdx = STEPS.indexOf(step);

  // Live scene mode — full screen overlay
  if (step === 'live') {
    return (
      <LiveSceneMode
        lines={parsedLines}
        userRole={selectedRole}
        characters={characters}
        initialVoice={selectedVoice}
        onExit={() => setStep('practice')}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Live Scene Mode Banner */}
      {(step === 'practice' || step === 'pick-role') && selectedRole && (
        <div className="mb-6 bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f0f23] rounded-2xl p-5 border border-[#2a2a4a] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(255,107,53,0.12),_transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#C855F0] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                <h3 className="text-white font-bold text-base">Live Scene Mode</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Hands-free real-time AI scene partner. Say your lines — the AI responds with voice instantly.
              </p>
            </div>
            <button
              onClick={() => setStep('live')}
              className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#C855F0]/30 whitespace-nowrap cursor-pointer flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Go Live
            </button>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= currentStepIdx
                  ? 'bg-[#C855F0] text-white'
                  : 'bg-[#2A2A2A] text-[#666666]'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                i <= currentStepIdx ? 'text-white' : 'text-[#666666]'
              }`}
            >
              {STEP_LABELS[i]}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  i < currentStepIdx ? 'bg-[#C855F0]' : 'bg-[#2A2A2A]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <ScriptUpload
          onSubmit={(text) => {
            setScriptText(text);
            setStep('pick-role');
          }}
        />
      )}

      {step === 'pick-role' && (
        <RolePicker
          characters={characters}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          selectedVoice={selectedVoice}
          onSelectVoice={setSelectedVoice}
          onStart={() => setStep('practice')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'practice' && (
        <Teleprompter
          lines={parsedLines}
          userRole={selectedRole}
          onRecord={() => setStep('record')}
          onBack={() => setStep('pick-role')}
          onGoLive={() => setStep('live')}
        />
      )}

      {step === 'record' && (
        <RecordTake onBack={() => setStep('practice')} />
      )}
    </div>
  );
}
