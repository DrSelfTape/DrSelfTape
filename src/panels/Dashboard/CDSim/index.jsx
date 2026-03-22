import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidesUpload from './SidesUpload';
import RoleSelect from './RoleSelect';
import VoicePicker from './VoicePicker';
import CDReport from './CDReport';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

const STEPS = ['upload', 'role', 'voice', 'analyzing', 'report'];
const STEP_LABELS = ['Upload Sides', 'Pick Role', 'CD Voice', 'Analyzing', 'Report'];

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
  const [selectedVoice, setSelectedVoice] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for preloaded script from Scripts Library
  useEffect(() => {
    const raw = sessionStorage.getItem('preloadedScript');
    if (raw) {
      try {
        const { scriptContent } = JSON.parse(raw);
        if (scriptContent) {
          setScriptText(scriptContent);
          setStep('role');
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem('preloadedScript');
    }
  }, []);

  const parsedLines = useMemo(() => parseScript(scriptText), [scriptText]);
  const characters = useMemo(() => extractCharacters(parsedLines), [parsedLines]);

  // Trigger API call when entering the analyzing step
  useEffect(() => {
    if (step !== 'analyzing') return;

    let cancelled = false;
    setLoading(true);
    setError('');

    axios
      .post(`${baseURL}/v1/ai/cd-feedback/`, {
        script: scriptText,
        role: selectedRole,
        voice: selectedVoice,
      })
      .then((res) => {
        if (!cancelled) {
          setReport(res.data);
          setStep('report');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              err?.message ||
              'Something went wrong. Please try again.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, scriptText, selectedRole, selectedVoice]);

  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Step Indicator — hidden during analyzing */}
      {step !== 'analyzing' && (
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
      )}

      {/* Step Content */}
      {step === 'upload' && (
        <SidesUpload
          onSubmit={(text) => {
            setScriptText(text);
            setStep('role');
          }}
        />
      )}

      {step === 'role' && (
        <RoleSelect
          characters={characters}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          onStart={() => setStep('voice')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'voice' && (
        <VoicePicker
          selectedVoice={selectedVoice}
          onSelect={setSelectedVoice}
          onBack={() => setStep('role')}
          onContinue={() => setStep('analyzing')}
        />
      )}

      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-[#C855F0] border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Analyzing your scene...</h2>
          <p className="text-[#999999] text-sm">
            Your casting director is reviewing the script and preparing direction.
          </p>
          {error && (
            <div className="mt-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError('');
                  setStep('analyzing');
                }}
                className="px-6 py-3 rounded-xl bg-[#C855F0] text-white font-semibold hover:bg-[#A040C8] transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'report' && report && (
        <CDReport
          report={report}
          onRunAgain={() => {
            setReport(null);
            setStep('analyzing');
          }}
        />
      )}
    </div>
  );
}
