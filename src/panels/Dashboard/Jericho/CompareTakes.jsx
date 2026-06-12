/**
 * Jericho — Compare Takes (Tape Review phase 2)
 * Upload 2-4 takes of the SAME audition; Jericho analyzes each and ranks them,
 * naming the strongest to submit and exactly why — beat for beat. Powered by
 * /ai/jericho/compare-takes/.
 */
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Upload, Loader2, Film, Trophy, Plus, X, RotateCcw, ChevronDown,
  Sparkles, Target, Theater, Scissors,
} from 'lucide-react';
import { compareTakes, clearCompare } from '../../../redux/features/jericho/jerichoSlice';

const SURFACE = { background: 'var(--bg-surface, #1A1A2E)' };
const GOLD = '#D4A85F';
// Keep each take phone-friendly to upload (the BE caps at 200MB/take too). A
// real self-tape of one scene exports well under this.
const MAX_TAKE_MB = 200;

const PERF_FIELDS = [
  { key: 'emotional_arc', label: 'Emotional arc' },
  { key: 'strongest_beat', label: 'Strongest beat' },
  { key: 'choices', label: 'The choice' },
  { key: 'listening_presence', label: 'Listening & presence' },
  { key: 'truth_vs_indicated', label: 'Truth vs. indicated' },
];

const MEDAL = ['🥇', '🥈', '🥉', '4'];

function ScoreBar100({ value, gold }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full h-2 rounded-full bg-[#F4F4EE] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${v}%`, background: gold ? `linear-gradient(90deg, ${GOLD}, #7A5A18)` : 'rgba(10,10,10,0.35)' }}
      />
    </div>
  );
}

export default function CompareTakes() {
  const dispatch = useDispatch();
  const { compareLoading, compareResult, compareError } = useSelector((s) => s.jericho);

  // Two slots to start; up to four.
  const [slots, setSlots] = useState([null, null]);
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [sides, setSides] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [expanded, setExpanded] = useState(null); // take number whose full notes are open
  const [sizeError, setSizeError] = useState('');
  const inputRefs = useRef({});

  const pickFile = (i, file) => {
    if (!file) return;
    if (file.size > MAX_TAKE_MB * 1024 * 1024) {
      setSizeError(`Take ${i + 1} is ${(file.size / 1048576).toFixed(0)}MB — keep each take under ${MAX_TAKE_MB}MB (a single-scene take exports small).`);
      return;
    }
    setSizeError('');
    setSlot(i, file);
  };

  const setSlot = (i, file) => setSlots((s) => s.map((v, idx) => (idx === i ? file : v)));
  const addSlot = () => setSlots((s) => (s.length >= 4 ? s : [...s, null]));
  const removeSlot = (i) => setSlots((s) => (s.length <= 2 ? s : s.filter((_, idx) => idx !== i)));

  const files = slots.filter(Boolean);
  const canSubmit = files.length >= 2 && !compareLoading;

  const submit = () => {
    if (!canSubmit) return;
    dispatch(compareTakes({ takes: files, role, tone, sides }));
  };

  const reset = () => {
    setSlots([null, null]); setRole(''); setTone(''); setSides(''); setExpanded(null);
    dispatch(clearCompare());
  };

  // ─── Loading ───────────────────────────────────────────────────────
  if (compareLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-10 text-center" style={SURFACE}>
        <Loader2 className="w-9 h-9 animate-spin text-[#7A5A18] mx-auto mb-4" />
        <p className="text-sm font-bold text-[#0A0A0A]">Jericho is comparing your takes…</p>
        <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1.5 max-w-xs mx-auto leading-relaxed">
          Reading each take’s arc, choices and truth — then picking the one to submit. This takes ~1–2 minutes.
        </p>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────
  if (compareResult) {
    const r = compareResult;
    const takesByNum = Object.fromEntries((r.takes || []).map((t) => [t.take, t]));
    const order = (r.ranking || []).filter((n) => takesByNum[n]);

    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Winner banner */}
        <div className="rounded-2xl border border-[#D4A85F]/35 p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(212,168,95,0.16), rgba(122,90,24,0.05))' }}>
          <div className="w-12 h-12 rounded-2xl bg-[#D4A85F]/20 flex items-center justify-center mx-auto mb-2.5">
            <Trophy size={22} className="text-[#7A5A18]" />
          </div>
          <p className="text-[11px] font-bold text-[#7A5A18] uppercase tracking-widest mb-1">Submit this one</p>
          <h3 className="text-xl font-bold text-[#0A0A0A] leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
            {r.headline || `Take ${r.winner} is your strongest`}
          </h3>
          {r.why_winner && (
            <p className="text-sm text-[rgba(10,10,10,0.7)] leading-relaxed mt-2.5 max-w-md mx-auto">{r.why_winner}</p>
          )}
        </div>

        {/* Ranked takes */}
        <div className="space-y-3">
          {order.map((n, idx) => {
            const t = takesByNum[n];
            const isWinner = n === r.winner;
            const open = expanded === n;
            const a = t.analysis || {};
            return (
              <div
                key={n}
                className="rounded-2xl border p-4 sm:p-5"
                style={{
                  ...SURFACE,
                  borderColor: isWinner ? 'rgba(212,168,95,0.5)' : 'rgba(10,10,10,0.08)',
                  boxShadow: isWinner ? '0 4px 24px rgba(212,168,95,0.18)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl w-8 text-center flex-shrink-0">{MEDAL[idx] || idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#0A0A0A]">
                        Take {n}{isWinner && <span className="ml-2 text-[10px] font-bold text-[#7A5A18] uppercase tracking-wide">Winner</span>}
                      </p>
                      <span className="text-sm font-extrabold text-[#0A0A0A]">{t.score != null ? t.score : '—'}<span className="text-[10px] text-[rgba(10,10,10,0.4)] font-medium">/100</span></span>
                    </div>
                    <div className="mt-1.5"><ScoreBar100 value={t.score} gold={isWinner} /></div>
                    {t.one_line && <p className="text-xs text-[rgba(10,10,10,0.6)] italic mt-1.5">{t.one_line}</p>}
                  </div>
                </div>

                {t.best_moment && (
                  <p className="text-sm text-[rgba(10,10,10,0.72)] leading-relaxed mt-3">
                    <span className="font-semibold text-[#0A0A0A]">Best moment — </span>{t.best_moment}
                  </p>
                )}
                {t.steal && (
                  <div className="flex items-start gap-2 mt-2.5 rounded-xl bg-[#D4A85F]/8 border border-[#D4A85F]/20 px-3 py-2">
                    <Scissors size={13} className="text-[#7A5A18] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[rgba(10,10,10,0.72)] leading-relaxed">
                      <span className="font-semibold text-[#7A5A18]">Steal from this take: </span>{t.steal}
                    </p>
                  </div>
                )}

                {/* Expand full analysis */}
                <button
                  onClick={() => setExpanded(open ? null : n)}
                  className="w-full flex items-center justify-center gap-1.5 mt-3 py-1.5 text-xs font-semibold text-[#7A5A18]"
                >
                  {open ? 'Hide' : 'See full notes for this take'}
                  <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="mt-2 pt-3 border-t border-[rgba(10,10,10,0.06)] space-y-3">
                    {a.verdict && (
                      <p className="text-sm text-[#0A0A0A] font-medium leading-relaxed">{a.verdict}</p>
                    )}
                    {a.performance && PERF_FIELDS.filter((f) => a.performance[f.key]).map((f) => (
                      <div key={f.key}>
                        <p className="text-[11px] font-bold text-[#7A5A18] uppercase tracking-wide mb-0.5">{f.label}</p>
                        <p className="text-sm text-[rgba(10,10,10,0.7)] leading-relaxed">{a.performance[f.key]}</p>
                      </div>
                    ))}
                    {Array.isArray(a.adjustments) && a.adjustments.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[#7A5A18] uppercase tracking-wide mb-1 flex items-center gap-1"><Target size={12} /> Next take</p>
                        <div className="space-y-1.5">
                          {a.adjustments.slice(0, 3).map((adj, i) => (
                            <p key={i} className="text-sm text-[rgba(10,10,10,0.72)] leading-relaxed">• {adj.note || adj}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* What to do */}
        {r.what_to_do && (
          <div className="rounded-2xl border border-[#FF8280]/25 p-4" style={{ background: 'rgba(255,130,128,0.06)' }}>
            <h3 className="text-xs font-bold text-[#FF8280] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} /> Your move
            </h3>
            <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.what_to_do}</p>
          </div>
        )}

        <button
          onClick={reset}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #7A5A18)` }}
        >
          <RotateCcw size={15} /> Compare another set
        </button>
      </div>
    );
  }

  // ─── Submit form ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={SURFACE}>
        <h3 className="text-sm font-bold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <Trophy size={16} className="text-[#7A5A18]" /> Compare your takes
        </h3>
        <p className="text-xs text-[rgba(10,10,10,0.45)] mb-4 leading-relaxed">
          Upload 2–4 takes of the <span className="font-semibold">same</span> scene. Jericho ranks them and tells you which to submit — and why it beats the others.
        </p>

        {/* Take slots */}
        <div className="space-y-2.5">
          {slots.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => inputRefs.current[i]?.click()}
                className={`flex-1 rounded-xl border-2 border-dashed px-4 py-3.5 flex items-center gap-3 transition-colors ${
                  f ? 'border-[#D4A85F]/50 bg-[#D4A85F]/5' : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F]/40'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#D4A85F]/12 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#7A5A18]">{i + 1}</div>
                {f ? (
                  <>
                    <Film size={16} className="text-[#7A5A18] flex-shrink-0" />
                    <span className="text-sm font-medium text-[#0A0A0A] truncate flex-1 text-left">{f.name}</span>
                    <span className="text-[10px] text-[rgba(10,10,10,0.4)] flex-shrink-0">{(f.size / (1024 * 1024)).toFixed(0)}MB</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} className="text-[rgba(10,10,10,0.4)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[rgba(10,10,10,0.55)] flex-1 text-left">Take {i + 1} — choose a video</span>
                  </>
                )}
              </button>
              {slots.length > 2 && (
                <button onClick={() => removeSlot(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(10,10,10,0.4)] hover:text-red-500 flex-shrink-0">
                  <X size={16} />
                </button>
              )}
              <input
                ref={(el) => (inputRefs.current[i] = el)}
                type="file" accept="video/*" className="hidden"
                onChange={(e) => pickFile(i, e.target.files?.[0])}
              />
            </div>
          ))}
        </div>

        {slots.length < 4 && (
          <button onClick={addSlot} className="w-full mt-2.5 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#7A5A18] hover:bg-[#D4A85F]/5 rounded-lg transition-colors">
            <Plus size={14} /> Add another take
          </button>
        )}
        <p className="text-[11px] text-[rgba(10,10,10,0.4)] text-center mt-1.5">
          Best with short takes of one scene — they upload fast and compare cleanly.
        </p>
        {sizeError && (
          <p className="text-xs text-red-500 mt-2 text-center">{sizeError}</p>
        )}

        {/* Optional context (shared across takes) */}
        <button
          onClick={() => setShowOptional((v) => !v)}
          className="w-full flex items-center justify-between mt-3 px-1 py-2 text-xs font-medium text-[rgba(10,10,10,0.45)]"
        >
          <span>Add context for sharper ranking (optional)</span>
          <ChevronDown size={14} className={`transition-transform ${showOptional ? 'rotate-180' : ''}`} />
        </button>
        {showOptional && (
          <div className="space-y-2.5 mt-1">
            <input
              value={role} onChange={(e) => setRole(e.target.value)}
              placeholder="Character name (e.g. MaryBeth)"
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F4F4EE] border border-[rgba(10,10,10,0.08)] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.35)] outline-none focus:border-[#D4A85F]/50"
            />
            <input
              value={tone} onChange={(e) => setTone(e.target.value)}
              placeholder="Tone target from the brief (e.g. grounded and warm)"
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F4F4EE] border border-[rgba(10,10,10,0.08)] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.35)] outline-none focus:border-[#D4A85F]/50"
            />
            <textarea
              value={sides} onChange={(e) => setSides(e.target.value)}
              placeholder="Paste the sides / scene text…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F4F4EE] border border-[rgba(10,10,10,0.08)] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.35)] outline-none focus:border-[#D4A85F]/50 resize-none"
            />
          </div>
        )}

        {compareError && (
          <p className="text-xs text-red-500 mt-3 text-center">{String(compareError)}</p>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all enabled:hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #7A5A18)` }}
        >
          <Trophy size={15} /> {files.length >= 2 ? `Rank my ${files.length} takes` : 'Rank my takes'}
        </button>
        <p className="text-[10px] text-[rgba(10,10,10,0.35)] text-center mt-2">
          {files.length >= 2
            ? `Uses ${files.length} tokens (1 per take) · each take gets full notes too`
            : 'Uses 1 token per take · each take gets full notes too'}
        </p>
      </div>
    </div>
  );
}
