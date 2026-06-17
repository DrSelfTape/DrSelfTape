import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import SidesUpload from './SidesUpload';
import RoleSelect from './RoleSelect';
import VoicePicker from './VoicePicker';
import CDReport from './CDReport';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { logSession } from '../../../redux/features/jericho/jerichoSlice';
import { completeCraftNode } from '../../../redux/features/craftJourney/craftJourneySlice';
import useAIGate from '../../../components/AIConsent/useAIGate';

const STEPS = ['upload', 'role', 'voice', 'analyzing', 'report'];
const STEP_LABELS = ['Upload Sides', 'Pick Role', 'Coach Style', 'Analyzing', 'Feedback'];

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

/**
 * AnalyzingPhase — Aurora Processing visual (handoff §6 V1SProcessing).
 * 3 stacked status rows that cascade through pending → active → done.
 * Active rows show a 3-dot typing animation with a 16px gold glow;
 * done rows get a mint check; pending rows show a faded step number.
 */
function AnalyzingPhase({ error, onRetry }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (error) return;
    const timers = [
      setTimeout(() => setStep(1), 1100),
      setTimeout(() => setStep(2), 2300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [error]);

  const stages = [
    { k: 0, label: 'Transcribing scene', detail: 'SPEECH-TO-TEXT · 16kHz' },
    { k: 1, label: 'Comparing to sides', detail: 'WORD-LEVEL DIFF' },
    { k: 2, label: 'Jericho is listening', detail: 'ACTING NOTES INCOMING' },
  ];

  return (
    <div className="aurora-page-in" style={{ paddingTop: 40, maxWidth: 360, margin: '0 auto' }}>
      <style>{`
        @keyframes cdsim-typedot { 0%,80%,100% { opacity: 0.25; } 40% { opacity: 1; } }
        .cdsim-typedot { animation: cdsim-typedot 1.2s ease-in-out infinite; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stages.map((s) => {
          const done = s.k < step;
          const active = s.k === step;
          return (
            <div
              key={s.k}
              className="aurora-card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: s.k > step ? 0.42 : 1,
                transition: 'opacity 0.3s',
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#9FE6B4' : active ? '#D4A85F' : 'rgba(10,10,10,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0E0D0A',
                  boxShadow: active ? '0 0 16px rgba(212,168,95,0.55)' : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }}
              >
                {done && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {active && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <div className="cdsim-typedot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#0E0D0A' }} />
                    <div className="cdsim-typedot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#0E0D0A', animationDelay: '0.2s' }} />
                    <div className="cdsim-typedot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#0E0D0A', animationDelay: '0.4s' }} />
                  </div>
                )}
                {!done && !active && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--aurora-dim)' }}>{s.k + 1}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', color: 'var(--aurora-text)' }}>{s.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--aurora-dim)', letterSpacing: '0.12em', marginTop: 2 }}>
                  {s.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ color: 'var(--aurora-coral-deep, #C05957)', marginBottom: 14 }}>{error}</p>
          <button
            onClick={onRetry}
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
              color: '#FFF',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(212,168,95,0.25)',
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default function CDSim() {
  // Apple Guideline 5.1.1(i) — gate the entire panel behind the AI
  // consent modal. Bounces back to /dashboard if the user declines.
  useAIGate();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const sessionStartRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [scriptText, setScriptText] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Bumped by the Retry button to force the coach-request effect to re-run
  // even though `step` is already 'analyzing' (otherwise Retry was a no-op
  // and the error screen stranded the user).
  const [retryNonce, setRetryNonce] = useState(0);
  // Set when this session was launched from a Craft Journey node — used
  // to dispatch completeCraftNode when the CD report finishes generating.
  const [craftSkill, setCraftSkill] = useState('');

  // Check for preloaded script from route state or sessionStorage
  useEffect(() => {
    const routeScript = location?.state?.scriptContent;
    const routeCraftSkill = location?.state?.craft_skill;
    if (routeScript) {
      setScriptText(routeScript);
      if (routeCraftSkill) setCraftSkill(routeCraftSkill);
      setStep('role');
      sessionStorage.removeItem('preloadedScript');
      return;
    }

    const raw = sessionStorage.getItem('preloadedScript');
    if (raw) {
      try {
        const { scriptContent, craft_skill } = JSON.parse(raw);
        if (scriptContent) {
          setScriptText(scriptContent);
          if (craft_skill) setCraftSkill(craft_skill);
          setStep('role');
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem('preloadedScript');
    }
  }, [location?.state]);

  const parsedLines = useMemo(() => parseScript(scriptText), [scriptText]);
  const characters = useMemo(() => extractCharacters(parsedLines), [parsedLines]);

  // Trigger API call when entering the analyzing step
  useEffect(() => {
    if (step !== 'analyzing') return;

    let cancelled = false;
    setLoading(true);
    setError('');
    sessionStartRef.current = Date.now();

    const payload = { script: scriptText, role: selectedRole, voice: selectedVoice };
    const AI_TIMEOUT_MS = 90000;

    // Jericho enriched endpoint is the ONLY charged path for a CD coach
    // session. We deliberately do NOT fall back to /v1/ai/cd-feedback/ on a
    // generic Jericho failure: cd-feedback charges a SECOND token for the
    // same Analyze, and the BE now refunds a failed Jericho call's token —
    // so a fallback here would double-charge the user for one action.
    // Surface the error instead and let the user Retry (one charge each).
    // 402 (no credits) still propagates so the outer handler shows the
    // upgrade path.
    const tryJericho = axios
      .post(`${baseURL}/v1/ai/jericho/coach/`, { ...payload, session_type: 'cd_coach' }, { timeout: AI_TIMEOUT_MS });

    tryJericho
      .then((res) => {
        if (!cancelled) {
          const reportData = res.data?.data || res.data;
          // Don't log / show a partial or fallback payload as a real coach
          // report — strand it on the error screen (Retry) instead of saving
          // a junk session to Jericho memory.
          const isValidReport = reportData && typeof reportData === 'object'
            && (reportData.interpretation || reportData.performance);
          if (!isValidReport) {
            setError("The coach didn't return a complete report. Please try again.");
            return;
          }
          setReport(reportData);
          setStep('report');
          // If this session was launched from a Craft Journey node, mark
          // that node done on the BE — unlocks the next one in the path.
          if (craftSkill) {
            dispatch(completeCraftNode({ node: craftSkill, stars: 2 }));
          }
          // Log session to Jericho memory (fire and forget)
          const duration = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000);
          dispatch(logSession({
            session_type: 'cd_coach',
            script_text: scriptText.slice(0, 2000),
            role_played: selectedRole,
            ai_feedback: reportData,
            duration_seconds: duration,
          }));
          import('../../../utils/analytics').then(({ trackEvent, Events }) => {
            trackEvent(Events.ACTING_COACH, {
              role: selectedRole,
              voice: selectedVoice,
              duration_seconds: duration,
              script_length: scriptText.length,
            });
          }).catch(() => { /* swallow */ });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const status = err?.response?.status;
          if (status === 402) {
            setStep('voice');
          } else {
            const msg = err?.response?.data?.message || err?.response?.data?.detail;
            setError(msg || err?.message || 'Something went wrong. Please try again.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, scriptText, selectedRole, selectedVoice, retryNonce]);

  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-full bg-transparent">
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Step Indicator — hidden during analyzing */}
      {step !== 'analyzing' && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= currentStepIdx
                    ? 'bg-[#D4A85F] text-[#0A0A0A]'
                    : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.4)]'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  i <= currentStepIdx ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.4)]'
                }`}
              >
                {STEP_LABELS[i]}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < currentStepIdx ? 'bg-[#D4A85F]' : 'bg-[#F4F4EE]'
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
        <AnalyzingPhase error={error} onRetry={() => { setError(''); setRetryNonce((n) => n + 1); }} />
      )}

      {step === 'report' && report && (
        <CDReport
          report={report}
          selectedVoice={selectedVoice}
          onRunAgain={() => {
            setReport(null);
            setStep('upload');
          }}
        />
      )}
    </div>
    </div>
  );
}
