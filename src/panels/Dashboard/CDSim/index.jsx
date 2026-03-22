import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidesUpload from './SidesUpload';
import RoleSelect from './RoleSelect';
import CDSession from './CDSession';
import SessionWrap from './SessionWrap';

const STEPS = ['upload', 'pick-role', 'pick-voice', 'session', 'wrap'];
const STEP_LABELS = ['Upload Sides', 'Pick Role', 'CD Voice', 'CD Session', 'Session Wrap'];

const CD_VOICES = [
  { key: 'cd_female', name: 'Sarah', description: 'Mature, Confident', gender: 'Female', accent: 'American', emoji: '👩' },
  { key: 'cd_male',   name: 'Daniel', description: 'Steady Broadcaster', gender: 'Male', accent: 'British', emoji: '👨' },
];

function VoicePicker({ selectedVoice, onSelect, onStart, onBack }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Casting Director</h2>
      <p className="text-gray-500 mb-8">Pick the voice that will give you feedback during your session.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {CD_VOICES.map((v) => (
          <button
            key={v.key}
            onClick={() => onSelect(v.key)}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              selectedVoice === v.key
                ? 'border-[#ff6b35] bg-orange-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-4xl mb-3">{v.emoji}</div>
            <div className="font-bold text-lg text-gray-900">{v.name}</div>
            <div className="text-sm text-gray-500 mt-1">{v.description}</div>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">{v.gender}</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">{v.accent}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
          Back
        </button>
        <button
          onClick={onStart}
          disabled={!selectedVoice}
          className="flex-1 px-6 py-3 rounded-xl bg-[#ff6b35] text-white font-semibold hover:bg-[#e55a25] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Start Session →
        </button>
      </div>
    </div>
  );
}

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

    const colonMatch = trimmed.match(/^([A-Z][A-Z\s.''-]{0,40}):\s*(.*)$/);
    if (colonMatch) {
      flush();
      currentChar = colonMatch[1].trim();
      if (colonMatch[2]) currentDialogue.push(colonMatch[2]);
      continue;
    }

    if (/^[A-Z][A-Z\s.''-]{0,40}$/.test(trimmed) && !currentDialogue.length) {
      flush();
      currentChar = trimmed;
      continue;
    }

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

export default function CDSim() {
  const navigate = useNavigate();
  const [step, setStep] = useState('upload');
  const [scriptText, setScriptText] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('cd_female');
  const [sessionStats, setSessionStats] = useState(null);

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Step Indicator — hidden during live session */}
      {step !== 'session' && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= currentStepIdx
                    ? 'bg-[#ff6b35] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  i <= currentStepIdx ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {STEP_LABELS[i]}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < currentStepIdx ? 'bg-[#ff6b35]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step Content */}
      {step === 'upload' && (
        <SidesUpload
          onSubmit={(text) => {
            setScriptText(text);
            setStep('pick-role');
          }}
        />
      )}

      {step === 'pick-role' && (
        <RoleSelect
          characters={characters}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          onStart={() => setStep('pick-voice')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'pick-voice' && (
        <VoicePicker
          selectedVoice={selectedVoice}
          onSelect={setSelectedVoice}
          onStart={() => setStep('session')}
          onBack={() => setStep('pick-role')}
        />
      )}

      {step === 'session' && (
        <CDSession
          lines={parsedLines}
          userRole={selectedRole}
          cdVoice={selectedVoice}
          onEnd={(stats) => {
            setSessionStats(stats);
            setStep('wrap');
          }}
          onRestart={() => setStep('session')}
        />
      )}

      {step === 'wrap' && sessionStats && (
        <SessionWrap
          stats={sessionStats}
          onRunAgain={() => setStep('session')}
          onDone={() => navigate('/dashboard')}
        />
      )}
    </div>
  );
}
