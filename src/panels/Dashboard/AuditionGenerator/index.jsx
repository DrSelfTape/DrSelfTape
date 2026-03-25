import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — matches CD AI Studio exactly
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

function Ic({ d, size = 20, color = TEXT2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
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

const GENRES       = ['Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Romance', 'Horror'];
const TONES        = ['Intense', 'Tender', 'Dark', 'Playful', 'Urgent', 'Dry'];
const DIFFICULTIES = ['Cold read', 'Intermediate', 'Advanced'];

export default function AuditionGenerator() {
  const navigate = useNavigate();
  const [genre, setGenre]             = useState('drama');
  const [tone, setTone]               = useState('intense');
  const [difficulty, setDifficulty]   = useState('Cold read');
  const [generated, setGenerated]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [sceneText, setSceneText]     = useState('');
  const [error, setError]             = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(endPoints.generateScene || endPoints.cdFeedback, {
        line: `Write a 1-page dramatic ${genre} scene with ${tone} tone. Format as screenplay with character names in CAPS. Make it emotionally rich. 2 characters, 6-8 lines each.`,
        type: 'scene_gen',
        character: genre,
        script_context: tone,
        genre,
        tone,
        difficulty,
      });
      const text =
        response.data?.data?.scene ||
        response.data?.scene ||
        response.data?.data?.feedback ||
        response.data?.feedback || '';
      if (!text) throw new Error('No scene returned');
      setSceneText(text);
      setGenerated(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const launchCDSim = () => {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: sceneText }));
    navigate('/dashboard/cd-sim');
  };

  const launchSceneStudy = () => {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: sceneText }));
    navigate('/dashboard/scene-study');
  };

  return (
    <div style={{ background: BG_DEEP, minHeight: 0, fontFamily: "'Poppins', sans-serif", color: TEXT }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 48px' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0, fontFamily: "'Playfair Display', serif" }}>
            Scene generator
          </h2>
          <p style={{ fontSize: 13, color: TEXT2, margin: '6px 0 0' }}>
            Generate a custom practice scene with AI
          </p>
        </div>

        {!generated ? (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.25s ease both' }}>

            {/* Genre */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Genre
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GENRES.map((g) => {
                  const active = genre === g.toLowerCase();
                  return (
                    <button key={g} onClick={() => setGenre(g.toLowerCase())} style={{
                      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                      background: active ? CORAL_DIM : BG_CARD,
                      color: active ? CORAL : TEXT2,
                      fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                      border: active ? `1px solid ${CORAL}30` : `1px solid ${BORDER}`,
                    }}>{g}</button>
                  );
                })}
              </div>
            </div>

            {/* Tone */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Tone
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TONES.map((t) => {
                  const active = tone === t.toLowerCase();
                  return (
                    <button key={t} onClick={() => setTone(t.toLowerCase())} style={{
                      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                      background: active ? GOLD_DIM : BG_CARD,
                      color: active ? GOLD : TEXT2,
                      fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                      border: active ? `1px solid ${GOLD}30` : `1px solid ${BORDER}`,
                    }}>{t}</button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Difficulty
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d;
                  return (
                    <button key={d} onClick={() => setDifficulty(d)} style={{
                      flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                      background: active ? MINT_DIM : BG_CARD,
                      border: active ? `1px solid ${MINT}30` : `1px solid ${BORDER}`,
                      color: active ? MINT : TEXT2,
                      fontSize: 12, fontWeight: 600, textAlign: 'center', transition: 'all 0.15s',
                    }}>{d}</button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(200,85,80,0.12)', border: '1px solid rgba(200,85,80,0.3)',
                color: '#f87171', borderRadius: 12, padding: '12px 16px', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading
                  ? `${CORAL}80`
                  : `linear-gradient(135deg, ${CORAL_SOFT}, ${CORAL})`,
                color: '#fff', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  Generating…
                </>
              ) : (
                'Generate scene'
              )}
            </button>

          </div>
        ) : (
          /* ── Result ── */
          <div style={{ marginTop: 24, animation: 'fadeIn 0.3s ease both' }}>
            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Badge text={genre} color={CORAL} />
              <Badge text={tone} color={GOLD} />
              <Badge text={difficulty} color={MINT} />
            </div>

            {/* Scene text */}
            <div style={{
              background: BG_CARD, borderRadius: 16, padding: '18px',
              border: `1px solid ${BORDER}`, marginBottom: 14,
            }}>
              <p style={{
                fontSize: 13, color: TEXT, margin: 0,
                lineHeight: 1.8, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
              }}>
                {sceneText}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setGenerated(false); setSceneText(''); setError(''); }}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${BORDER_ACT}`, background: BG_ELEVATED,
                    color: TEXT, fontSize: 13, fontWeight: 600,
                  }}
                >
                  Regenerate
                </button>
                <button
                  onClick={handleGenerate}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? `${CORAL}70` : `linear-gradient(135deg, ${CORAL_SOFT}, ${CORAL})`,
                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                        animation: 'spin 0.8s linear infinite', display: 'inline-block',
                      }} />
                      Writing…
                    </>
                  ) : 'New scene'}
                </button>
              </div>

              <button
                onClick={launchCDSim}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  cursor: 'pointer',
                  background: `linear-gradient(135deg, ${MINT}, ${GREEN})`,
                  color: '#0c0e14', fontSize: 14, fontWeight: 700,
                }}
              >
                Analyze this scene →
              </button>

              <button
                onClick={launchSceneStudy}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
                  background: BG_CARD, border: `1px solid ${BORDER_ACT}`,
                  color: TEXT2, fontSize: 13, fontWeight: 600,
                }}
              >
                Practice in Scene Study
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
