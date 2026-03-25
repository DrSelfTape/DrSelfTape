import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../redux/http';
import endPoints from '../../../redux/constant';

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — matches CD AI Studio
   ═══════════════════════════════════════════════════ */
const MINT       = '#A7ECDA';
const MINT_DIM   = 'rgba(167,236,218,0.10)';
const GOLD       = '#FCE072';
const GOLD_DIM   = 'rgba(252,224,114,0.10)';
const CORAL_SOFT = '#FFB49A';
const CORAL      = '#C855F0';
const CORAL_DIM  = 'rgba(200,85,240,0.10)';
const GREEN      = '#5ee6b8';
const BG_DEEP    = '#0c0e14';
const BG_CARD    = '#13151d';
const BG_ELEVATED= '#1a1c26';
const BG_INPUT   = '#1e1e30';
const BORDER     = 'rgba(167,236,218,0.06)';
const BORDER_ACT = 'rgba(167,236,218,0.15)';
const TEXT       = '#f2f0ed';
const TEXT2      = '#8a9a96';
const TEXT3      = '#4a5a56';
const PURPLE     = '#b89aff';

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */
const GENRES     = ['Drama', 'Comedy', 'Thriller', 'Romance', 'Horror', 'Sci-Fi', 'Period', 'Crime', 'Indie'];
const CHARACTERS = ['The Hero', 'The Villain', 'The Lover', 'The Rebel', 'The Mentor', 'The Comic Relief', 'The Detective', 'The Outsider'];
const TONES      = ['Intense', 'Heartbreaking', 'Funny', 'Mysterious', 'Hopeful', 'Angry', 'Vulnerable', 'Conflicted'];

const LOADING_MESSAGES = [
  'Writing your scene…',
  'Crafting the dialogue…',
  'Adding dramatic tension…',
  'Almost there…',
];

/* ═══════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════ */
function Ic({ d, size = 20, color = TEXT2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  star:     'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  generate: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  copy:     'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3',
  play:     'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  clapboard:'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
  check:    'M5 13l4 4L19 7',
  pen:      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
};

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
      background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.5px',
      display: 'inline-block',
    }}>
      {text}
    </span>
  );
}

function PillGroup({ label, options, selected, onSelect, activeColor = CORAL }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = selected === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                fontWeight: 600, transition: 'all 0.15s',
                background: active ? `${activeColor}18` : BG_CARD,
                color: active ? activeColor : TEXT2,
                border: active ? `1px solid ${activeColor}35` : `1px solid ${BORDER}`,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCRIPT DISPLAY — screenplay-formatted dark card
   ═══════════════════════════════════════════════════ */
function ScriptDisplay({ script, genre, tone, onRegenerate, onLaunchCDSim, onLaunchSceneStudy, onCopy, copied }) {
  const lines = script.split('\n');

  const renderLine = (line, i) => {
    const trimmed = line.trim();
    if (/^(FADE IN|FADE OUT|INT\.|EXT\.|CUT TO|SMASH CUT|END SCENE)/i.test(trimmed)) {
      return <p key={i} style={{ color: CORAL, fontWeight: 700, textTransform: 'uppercase', margin: '10px 0 4px' }}>{trimmed}</p>;
    }
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 1 && /^[A-Z\s()]+$/.test(trimmed) && !trimmed.startsWith('(')) {
      return <p key={i} style={{ color: MINT, fontWeight: 700, marginTop: 14, marginBottom: 2 }}>{trimmed}</p>;
    }
    if (/^\(.*\)$/.test(trimmed)) {
      return <p key={i} style={{ color: TEXT3, fontStyle: 'italic', marginLeft: 24, marginBottom: 2 }}>{trimmed}</p>;
    }
    if (!trimmed) return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ color: TEXT2, marginLeft: 12, marginBottom: 2, lineHeight: 1.65 }}>{trimmed}</p>;
  };

  return (
    <div style={{ background: BG_CARD, borderRadius: 18, overflow: 'hidden', border: `1px solid ${BORDER}`, animation: 'fadeIn 0.35s ease both' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0, fontFamily: "'Playfair Display', serif" }}>Generated Scene</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <Badge text={genre} color={CORAL} />
            <Badge text={tone} color={GOLD} />
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: CORAL_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic d={ICONS.clapboard} size={18} color={CORAL} />
        </div>
      </div>

      {/* Script body */}
      <div style={{
        padding: '18px 20px', maxHeight: 420, overflowY: 'auto',
        fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
      }}>
        {lines.map(renderLine)}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onLaunchCDSim} style={{
          flex: '1 1 auto', padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${CORAL}, #e06eef)`, color: '#fff',
          fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          <Ic d={ICONS.play} size={15} color="#fff" /> Launch in CD Sim
        </button>
        <button onClick={onLaunchSceneStudy} style={{
          flex: '1 1 auto', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
          background: MINT_DIM, border: `1px solid ${MINT}25`,
          color: MINT, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          <Ic d={ICONS.clapboard} size={15} color={MINT} /> Scene Study
        </button>
        <button onClick={onRegenerate} style={{
          flex: '0 1 auto', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
          background: BG_ELEVATED, border: `1px solid ${BORDER_ACT}`,
          color: TEXT2, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          <Ic d={ICONS.refresh} size={15} color={TEXT2} /> Regenerate
        </button>
        <button onClick={onCopy} style={{
          flex: '0 1 auto', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
          background: copied ? `${MINT}15` : BG_ELEVATED,
          border: `1px solid ${copied ? MINT + '35' : BORDER_ACT}`,
          color: copied ? MINT : TEXT2, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'all 0.2s',
        }}>
          <Ic d={copied ? ICONS.check : ICONS.copy} size={15} color={copied ? MINT : TEXT2} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function AuditionGenerator() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('guided');
  const [genre, setGenre] = useState('Drama');
  const [character, setCharacter] = useState('The Hero');
  const [tone, setTone] = useState('Intense');
  const [customNotes, setCustomNotes] = useState('');
  const [freePrompt, setFreePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [script, setScript] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setScript('');
    setLoadingMsgIndex(0);

    try {
      const payload = mode === 'prompt'
        ? { free_prompt: freePrompt.trim() }
        : { genre, character_type: character, tone, custom_notes: customNotes.trim() };

      const { data } = await axiosInstance.post(endPoints.generateScene, payload);
      const scene = data?.data?.scene || data?.scene;
      if (!scene) throw new Error('No scene returned');
      setScript(scene);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Failed to generate scene. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (script && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [script]);

  const handleLaunchCDSim = () => {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: script }));
    navigate('/dashboard/cd-sim');
  };

  const handleLaunchSceneStudy = () => {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: script }));
    navigate('/dashboard/scene-study');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = script;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = loading ? false : mode === 'prompt' ? !!freePrompt.trim() : true;

  return (
    <div style={{ background: BG_DEEP, minHeight: 0, fontFamily: "'Poppins', sans-serif", color: TEXT }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(167,236,218,0.15); border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 48px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: CORAL_DIM,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', border: `1px solid ${CORAL}20`,
          }}>
            <Ic d={ICONS.generate} size={28} color={CORAL} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0, fontFamily: "'Playfair Display', serif" }}>
            Scene Generator
          </h1>
          <p style={{ fontSize: 13, color: TEXT2, margin: '6px 0 0', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Generate a custom practice scene with AI — ready to perform in seconds
          </p>
        </div>

        {/* ── Mode Toggle ── */}
        <div style={{ display: 'flex', gap: 6, padding: 4, background: BG_CARD, borderRadius: 14, border: `1px solid ${BORDER}`, margin: '24px 0 20px' }}>
          {[
            { id: 'guided', label: '🎛️ Guided', desc: 'Pick genre, tone & character' },
            { id: 'prompt', label: '✍️ Prompt It', desc: 'Describe your scene freely' },
          ].map((m) => {
            const active = mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: active ? `${CORAL}18` : 'transparent',
                border: active ? `1px solid ${CORAL}30` : '1px solid transparent',
                transition: 'all 0.15s', textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: active ? CORAL : TEXT2, margin: 0 }}>{m.label}</p>
                <p style={{ fontSize: 11, color: active ? `${CORAL}99` : TEXT3, margin: '2px 0 0' }}>{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* ── Guided Mode ── */}
        {mode === 'guided' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.25s ease both' }}>
            <div style={{ background: BG_CARD, borderRadius: 16, padding: '18px', border: `1px solid ${BORDER}` }}>
              <PillGroup label="Genre" options={GENRES} selected={genre} onSelect={setGenre} activeColor={CORAL} />
            </div>

            <div style={{ background: BG_CARD, borderRadius: 16, padding: '18px', border: `1px solid ${BORDER}` }}>
              <PillGroup label="Character Type" options={CHARACTERS} selected={character} onSelect={setCharacter} activeColor={MINT} />
            </div>

            <div style={{ background: BG_CARD, borderRadius: 16, padding: '18px', border: `1px solid ${BORDER}` }}>
              <PillGroup label="Emotional Tone" options={TONES} selected={tone} onSelect={setTone} activeColor={GOLD} />
            </div>

            {/* Optional notes */}
            <div style={{ background: BG_CARD, borderRadius: 16, padding: '18px', border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Extra details <span style={{ fontWeight: 400, textTransform: 'none', color: TEXT3 }}>(optional)</span>
              </p>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. 'Set in a hospital waiting room', 'One character is hiding a secret', 'Inspired by The Wire'…"
                rows={3}
                style={{
                  width: '100%', background: BG_INPUT, border: `1px solid ${BORDER_ACT}`,
                  borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 13,
                  resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: "'Poppins', sans-serif",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Prompt Mode ── */}
        {mode === 'prompt' && (
          <div style={{ background: BG_CARD, borderRadius: 16, padding: '20px', border: `1px solid ${BORDER}`, animation: 'fadeIn 0.25s ease both' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: TEXT, margin: '0 0 4px' }}>Describe your scene</p>
            <p style={{ fontSize: 12, color: TEXT2, margin: '0 0 14px' }}>
              Write anything — a premise, characters, a feeling. The AI writes the full scene.
            </p>
            <textarea
              value={freePrompt}
              onChange={(e) => setFreePrompt(e.target.value)}
              placeholder={"Examples:\n• "Two estranged sisters meet at their father's funeral"\n• "A cop realizes mid-interrogation that the suspect is innocent"\n• "Write me something like a Breaking Bad scene — tense, morally grey""}
              rows={7}
              style={{
                width: '100%', background: BG_INPUT, border: `1px solid ${BORDER_ACT}`,
                borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 13,
                resize: 'none', outline: 'none', lineHeight: 1.65, fontFamily: "'Poppins', sans-serif",
              }}
            />
            <p style={{ fontSize: 11, color: TEXT3, margin: '8px 0 0' }}>
              {freePrompt.length} characters · be as specific or as vague as you like
            </p>
          </div>
        )}

        {/* ── Generate Button ── */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none', marginTop: 20,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            background: loading
              ? `${CORAL}70`
              : !canGenerate
              ? BG_ELEVATED
              : `linear-gradient(135deg, ${CORAL_SOFT}, ${CORAL})`,
            color: !canGenerate ? TEXT3 : '#fff',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: loading ? 0.8 : 1, transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              <span key={loadingMsgIndex}>{LOADING_MESSAGES[loadingMsgIndex]}</span>
            </>
          ) : (
            <>
              <Ic d={ICONS.generate} size={18} color={canGenerate ? '#fff' : TEXT3} />
              Generate scene
            </>
          )}
        </button>

        {/* ── Error ── */}
        {error && (
          <div style={{
            marginTop: 16, background: 'rgba(200,85,80,0.12)', border: '1px solid rgba(200,85,80,0.3)',
            color: '#f87171', borderRadius: 12, padding: '14px 18px', fontSize: 13, lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* ── Result ── */}
        {script && (
          <div ref={resultRef} style={{ marginTop: 24 }}>
            <ScriptDisplay
              script={script}
              genre={genre}
              tone={tone}
              onRegenerate={handleGenerate}
              onLaunchCDSim={handleLaunchCDSim}
              onLaunchSceneStudy={handleLaunchSceneStudy}
              onCopy={handleCopy}
              copied={copied}
            />
          </div>
        )}
      </div>
    </div>
  );
}
