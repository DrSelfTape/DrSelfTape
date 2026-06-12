import { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ScriptUpload from './ScriptUpload';
import SidesUpload from './SidesUpload';
import RolePicker from './RolePicker';
import Teleprompter from './Teleprompter';
import PracticeV2 from './PracticeV2';
import RecordTake from './RecordTake';
import LiveSceneMode from './LiveSceneMode';
import SelfTapeRecorder from './SelfTapeRecorder';
import PostSessionJournal from '../../../components/Shared/PostSessionJournal';
import FocusMode from '../../../components/Shared/FocusMode';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';
import useAIGate from '../../../components/AIConsent/useAIGate';

const STEPS = ['upload', 'pick-role', 'practice'];
const STEP_LABELS = ['Upload Script', 'Pick Role', 'Practice'];

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
  // Apple Guideline 5.1.1(i) — Practice mode pipes script text through
  // Claude / GPT for scene partner replies + script formatting.
  useAIGate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // v2 is now the default; ?layout=v1 falls back to the legacy chrome.
  const useV2 = searchParams.get('layout') !== 'v1';
  const [step, setStep] = useState('upload');
  const [scriptText, setScriptText] = useState('');
  const [cachedCharacters, setCachedCharacters] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('partner_male');
  const [showJournal, setShowJournal] = useState(null); // null or session type string
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [pendingStep, setPendingStep] = useState(null); // step to go to after focus mode
  // Set when entering from Craft Journey — passed to LiveSceneMode so the
  // session-complete handler can dispatch completeCraftNode and unlock
  // the next node on the path.
  const [craftSkill, setCraftSkill] = useState('');

  // Check for preloaded script from route state or sessionStorage
  useEffect(() => {
    // Priority 1: route state (passed via navigate)
    const routeScript = location?.state?.scriptContent;
    const routeCharacters = location?.state?.characters;
    const routeCraftSkill = location?.state?.craft_skill;
    const routeRole = location?.state?.role;
    if (routeScript) {
      setScriptText(routeScript);
      if (Array.isArray(routeCharacters) && routeCharacters.length) {
        setCachedCharacters(routeCharacters);
      }
      if (routeCraftSkill) setCraftSkill(routeCraftSkill);
      if (routeRole) setSelectedRole(routeRole);
      setStep('pick-role');
      // Clear sessionStorage if it was also set
      sessionStorage.removeItem('preloadedScript');
      return;
    }

    // Priority 2: sessionStorage (fallback for mobile tab navigation)
    const raw = sessionStorage.getItem('preloadedScript');
    if (raw) {
      try {
        const { scriptContent, characters: preloadedCharacters, craft_skill, role } = JSON.parse(raw);
        if (scriptContent) {
          setScriptText(scriptContent);
          if (Array.isArray(preloadedCharacters) && preloadedCharacters.length) {
            setCachedCharacters(preloadedCharacters);
          }
          if (craft_skill) setCraftSkill(craft_skill);
          if (role) setSelectedRole(role);
          setStep('pick-role');
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem('preloadedScript');
    }
  }, [location?.state]);

  // Parse lines (always — Teleprompter / PracticeV2 need the dialogue
  // structure, not just the cast list). For the character list itself
  // we prefer the BE-cached value when available and fall back to the
  // parser, so legacy scripts saved before the `characters` field
  // landed still work.
  const parsedLines = useMemo(() => parseScript(scriptText), [scriptText]);
  const parsedCharacters = useMemo(() => extractCharacters(parsedLines), [parsedLines]);
  const characters = cachedCharacters && cachedCharacters.length
    ? cachedCharacters
    : parsedCharacters;

  const currentStepIdx = STEPS.indexOf(step);

  // Mark tutorial step when user starts practicing
  useEffect(() => {
    if (step === 'practice' || step === 'live') {
      markStep('practice_ai');
    }
  }, [step]);

  // Focus mode — breathing exercise before recording
  if (showFocusMode) {
    return (
      <FocusMode
        onComplete={() => {
          setShowFocusMode(false);
          if (pendingStep) { setStep(pendingStep); setPendingStep(null); }
        }}
      />
    );
  }

  // Self-tape recording mode — full screen camera overlay
  if (step === 'self-tape') {
    return (
      <>
        <SelfTapeRecorder
          lines={parsedLines}
          userRole={selectedRole}
          onClose={() => { setShowJournal('self-tape'); setStep('practice'); }}
        />
      </>
    );
  }

  // Live scene mode — full screen overlay
  if (step === 'live') {
    return (
      <LiveSceneMode
        lines={parsedLines}
        userRole={selectedRole}
        characters={characters}
        initialVoice={selectedVoice}
        craftSkill={craftSkill}
        onExit={() => { setShowJournal('live-scene'); setStep('practice'); }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2">
      {/* Live Study Mode Banner — hidden in v2 layout (tabs replace it) */}
      {!useV2 && (step === 'practice' || step === 'pick-role') && selectedRole && (
        <div className="mb-4 sm:mb-6 bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f0f23] rounded-2xl p-5 border border-[#2a2a4a] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(255,107,53,0.12),_transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#D4A85F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                <h3 className="text-white font-bold text-base">Live Study Mode</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Hands-free real-time AI scene partner. Say your lines — the AI responds with voice instantly.
              </p>
            </div>
            <button
              onClick={() => setStep('live')}
              className="bg-[#D4A85F] hover:bg-[#C09850] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#FF8280]/30 whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Study with AI
            </button>
          </div>
        </div>
      )}

      {/* Step Indicator — hidden in v2 practice view (tabs replace it) */}
      {!(useV2 && step === 'practice') && <div className="flex items-center gap-2 mb-4 sm:mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= currentStepIdx
                  ? 'bg-[#D4A85F] text-white'
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
                  i < currentStepIdx ? 'bg-[#D4A85F]' : 'bg-[#2A2A2A]'
                }`}
              />
            )}
          </div>
        ))}
      </div>}

      {/* Step Content */}
      {step === 'upload' && (
        <div className="max-w-2xl mx-auto">
          <SidesUpload
            onReady={({ scriptContent, characters, role }) => {
              setScriptText(scriptContent);
              if (Array.isArray(characters) && characters.length) setCachedCharacters(characters);
              if (role) setSelectedRole(role);
              setStep('pick-role');
            }}
          />
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#F4F4EE]" />
            <span className="text-[11px] text-[rgba(10,10,10,0.4)] font-semibold uppercase tracking-wide">or a plain script</span>
            <div className="flex-1 h-px bg-[#F4F4EE]" />
          </div>
          <ScriptUpload
            onSubmit={(text) => {
              setScriptText(text);
              setStep('pick-role');
            }}
          />
        </div>
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

      {step === 'practice' && !useV2 && (
        <Teleprompter
          lines={parsedLines}
          userRole={selectedRole}
          onRecord={() => setStep('record')}
          onBack={() => setStep('pick-role')}
          onGoLive={() => setStep('live')}
          /* Self-Tape removed per product call — the recorder UX wasn't
             strong enough to ship alongside Practice + AI Reader. */
        />
      )}

      {step === 'practice' && useV2 && (
        <PracticeV2
          lines={parsedLines}
          userRole={selectedRole}
          onBack={() => setStep('pick-role')}
          onGoLive={() => setStep('live')}
        />
      )}

      {step === 'record' && (
        <RecordTake
          lines={parsedLines}
          userRole={selectedRole}
          onBack={() => { setShowJournal('scene-study'); setStep('practice'); }}
        />
      )}

      {/* Post-session journal modal */}
      {showJournal && (
        <PostSessionJournal
          sessionType={showJournal}
          scriptTitle={selectedRole ? `${selectedRole}'s scene` : ''}
          onClose={() => setShowJournal(null)}
        />
      )}
    </div>
  );
}
