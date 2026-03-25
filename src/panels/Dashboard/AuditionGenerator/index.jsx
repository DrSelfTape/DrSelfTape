import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — matches screenshot exactly
   ═══════════════════════════════════════════════════ */
const BG          = '#0d0d0d';
const BG_CARD     = '#13151d';
const BG_CHIP     = '#1e1e2e';
const BG_ELEVATED = '#1a1c26';
const BORDER      = 'rgba(255,255,255,0.06)';
const BORDER_ACT  = 'rgba(255,255,255,0.15)';
const TEXT        = '#f2f0ed';
const TEXT2       = '#8a9a96';
const LABEL_COLOR = '#9b9b5a';   // olive/yellow-green — matches screenshot section labels
const SELECTED    = '#ddd040';   // yellow-gold — selected chip text/border
const SELECTED_BG = 'rgba(221,208,64,0.10)';
const SELECTED_BD = 'rgba(221,208,64,0.30)';
const MINT        = '#A7ECDA';
const MINT_BG     = 'rgba(167,236,218,0.10)';
const MINT_BD     = 'rgba(167,236,218,0.30)';

/* Button gradient: gold → coral → magenta, matching the screenshot */
const BTN_GRADIENT = 'linear-gradient(90deg, #F5D76E 0%, #FFB49A 50%, #C855F0 100%)';
const BTN_TEXT     = '#0d0d0d';

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */
const GENRES       = ['Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Romance', 'Horror'];
const TONES        = ['Intense', 'Tender', 'Dark', 'Playful', 'Urgent', 'Dry'];
const DIFFICULTIES = ['Cold read', 'Intermediate', 'Advanced'];

const LOADING_MSGS = [
  'Writing your scene…',
  'Crafting the dialogue…',
  'Adding dramatic tension…',
  'Almost there…',
];

/* ═══════════════════════════════════════════════════
   SHARED
   ═══════════════════════════════════════════════════ */
function SectionLabel({ text }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: LABEL_COLOR, margin: '0 0 10px',
      textTransform: 'uppercase', letterSpacing: '0.8px',
    }}>
      {text}
    </p>
  );
}

function Chip({ label, active, onClick, wide }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: wide ? '10px 0' : '8px 14px',
        flex: wide ? 1 : undefined,
        borderRadius: 20,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        transition: 'all 0.15s',
        background: active ? SELECTED_BG : BG_CHIP,
        color: active ? SELECTED : TEXT2,
        border: active ? `1px solid ${SELECTED_BD}` : `1px solid ${BORDER}`,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

/* Difficulty chips use MINT (white-ish) when selected per screenshot */
function DifficultyChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 0', textAlign: 'center',
        borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 500,
        transition: 'all 0.15s',
        background: active ? MINT_BG : BG_CHIP,
        color: active ? MINT : TEXT2,
        border: active ? `1px solid ${MINT_BD}` : `1px solid ${BORDER}`,
      }}
    >
      {label}
    </button>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
      background: `${color}15`, color, textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════ */
export default function AuditionGenerator() {
  const navigate = useNavigate();

  const [genre,      setGenre]      = useState('Drama');
  const [tone,       setTone]       = useState('Intense');
  const [difficulty, setDifficulty] = useState('Cold read');
  const [loading,    setLoading]    = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [scene,      setScene]      = useState('');
  const [error,      setError]      = useState('');
  const [generated,  setGenerated]  = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setLoadingIdx(0);

    const interval = setInterval(() =>
      setLoadingIdx((i) => (i + 1) % LOADING_MSGS.length), 2200);

    try {
      const { data } = await axios.post(endPoints.generateScene || endPoints.cdFeedback, {
        genre: genre.toLowerCase(),
        tone: tone.toLowerCase(),
        difficulty,
        character_type: 'actor',
        free_prompt: `Write a 1-page ${genre} scene with ${tone} tone, difficulty: ${difficulty}. 2 characters, 6-8 lines each. Proper screenplay format, character names in CAPS.`,
      });

      const text =
        data?.data?.scene || data?.scene ||
        data?.data?.feedback || data?.feedback || '';

      if (!text) throw new Error('No scene returned');
      setScene(text);
      setGenerated(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate. Try again.');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const launchCDSim = () => {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: scene }));
    navigate('/dashboard/cd-sim');
  };

  const launchSceneStudy = () => {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: scene }));
    navigate('/dashboard/scene-study');
  };

  return (
    <div style={{ background: BG, minHeight: '100%', fontFamily: "'Poppins', sans-serif", color: TEXT }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: '0 20px 48px' }}>

        {/* ── Title ── */}
        <div style={{ padding: '28px 0 24px' }}>
          <h2 style={{
            fontSize: 28, fontWeight: 700, color: TEXT, margin: '0 0 6px',
            fontFamily: "'Playfair Display', serif",
          }}>
            Scene generator
          </h2>
          <p style={{ fontSize: 14, color: TEXT2, margin: 0 }}>
            Generate a custom practice scene with AI
          </p>
        </div>

        {!generated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.25s ease both' }}>

            {/* ── Genre ── */}
            <div>
              <SectionLabel text="Genre" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {GENRES.map((g) => (
                  <Chip key={g} label={g} active={genre === g} onClick={() => setGenre(g)} />
                ))}
              </div>
            </div>

            {/* ── Tone ── */}
            <div>
              <SectionLabel text="Tone" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {TONES.map((t) => (
                  <Chip key={t} label={t} active={tone === t} onClick={() => setTone(t)} />
                ))}
              </div>
            </div>

            {/* ── Difficulty ── */}
            <div>
              <SectionLabel text="Difficulty" />
              <div style={{ display: 'flex', gap: 10 }}>
                {DIFFICULTIES.map((d) => (
                  <DifficultyChip key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />
                ))}
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div style={{
                background: 'rgba(200,50,50,0.12)', border: '1px solid rgba(200,50,50,0.3)',
                color: '#f87171', borderRadius: 12, padding: '12px 16px', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* ── Generate Button ── */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: '100%', padding: '17px', borderRadius: 14, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(245,215,110,0.5)' : BTN_GRADIENT,
                color: BTN_TEXT, fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? 0.75 : 1, transition: 'opacity 0.2s',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(200,85,240,0.25)',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0d0d0d',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0,
                  }} />
                  {LOADING_MSGS[loadingIdx]}
                </>
              ) : (
                'Generate scene'
              )}
            </button>

          </div>
        ) : (
          /* ── Result ── */
          <div style={{ animation: 'fadeIn 0.3s ease both' }}>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Badge text={genre} color={SELECTED} />
              <Badge text={tone} color={SELECTED} />
              <Badge text={difficulty} color={MINT} />
            </div>

            {/* Scene */}
            <div style={{
              background: BG_CARD, borderRadius: 16, padding: '18px',
              border: `1px solid ${BORDER}`, marginBottom: 16,
              maxHeight: 420, overflowY: 'auto',
            }}>
              <p style={{
                fontSize: 13, color: TEXT, margin: 0,
                lineHeight: 1.8, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
              }}>
                {scene}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Primary CTA */}
              <button
                onClick={launchCDSim}
                style={{
                  width: '100%', padding: '17px', borderRadius: 14, border: 'none',
                  cursor: 'pointer', background: BTN_GRADIENT,
                  color: BTN_TEXT, fontSize: 16, fontWeight: 700,
                  boxShadow: '0 4px 24px rgba(200,85,240,0.25)',
                }}
              >
                🎬 Launch in CD Sim
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setGenerated(false); setScene(''); setError(''); }}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${BORDER_ACT}`, background: BG_ELEVATED,
                    color: TEXT, fontSize: 13, fontWeight: 600,
                  }}
                >
                  New options
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? 'rgba(245,215,110,0.4)' : BTN_GRADIENT,
                    border: 'none', color: BTN_TEXT, fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0d0d0d',
                      animation: 'spin 0.8s linear infinite', display: 'inline-block',
                    }} />
                  ) : 'Regenerate'}
                </button>
              </div>

              <button
                onClick={launchSceneStudy}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
                  background: BG_CHIP, border: `1px solid ${BORDER_ACT}`,
                  color: TEXT2, fontSize: 13, fontWeight: 500,
                }}
              >
                🎭 Practice in Scene Study
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
