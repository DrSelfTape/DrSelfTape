/**
 * Jericho — Compare Takes (Tape Review phase 2)
 * Upload 2-4 takes of the SAME audition; Jericho analyzes each and ranks them,
 * naming the strongest to submit and exactly why — beat for beat. Powered by
 * /ai/jericho/compare-takes/.
 */
import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTokenBalance } from '../../../hooks/useTokenBalance';
import {
  Upload, Loader2, Film, Trophy, Plus, X, RotateCcw, ChevronDown, Lock,
  Sparkles, Target, Theater, Scissors, Copy,
} from 'lucide-react';
import { compareTakes, clearCompare } from '../../../redux/features/jericho/jerichoSlice';
import { goUpgrade } from '../../../utils/goUpgrade';
import { tapSelect, cheer, warn } from '../../../utils/haptics';

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

export default function CompareTakes({ seed = null }) {
  const dispatch = useDispatch();
  const { compareLoading, compareResult, compareError, uploadProgress } = useSelector((s) => s.jericho);
  // Full-notes gate: Premium unlocks each take's deep breakdown; free users keep
  // the winner + ranked scores + per-take highlights. Fail-open (never gate a
  // paying user on loading/error) — mirrors the Tape Review gate.
  const { isPaid, loading: entitlementLoading, error: entitlementError, balance: tokenBalance } = useTokenBalance();
  const notesLocked = !entitlementLoading && !entitlementError && tokenBalance !== null && !isPaid;
  const goPremium = () => goUpgrade({ source: 'compare_full_notes', returnTo: 'jericho' });

  // Two slots to start; up to four.
  const [slots, setSlots] = useState([null, null]);
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [sides, setSides] = useState('');
  // Next Take Mission: seeded from a Tape Review — the original take pre-loads as
  // Take 1 and the casting note becomes the focus the comparison is judged on.
  const [focusNote, setFocusNote] = useState('');
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seed || seededRef.current) return;
    seededRef.current = true;
    if (seed.note) setFocusNote(seed.note);
    if (seed.file) setSlots((s) => { const n = [...s]; n[0] = seed.file; return n; });
  }, [seed]);
  const [showOptional, setShowOptional] = useState(false);
  const [expanded, setExpanded] = useState(null); // take number whose full notes are open
  const [sizeError, setSizeError] = useState('');
  const inputRefs = useRef({});
  // F2: one stable idempotency key per compare action, reused across a re-submit
  // of the same take set so the BE dedupes instead of double-charging the take
  // tokens; cleared when the set changes or the action resets.
  const idemKeyRef = useRef(null);

  // Success haptic the moment the ranked result lands.
  const cheeredRef = useRef(false);
  useEffect(() => {
    if (compareResult && !cheeredRef.current) { cheeredRef.current = true; cheer(); }
    if (!compareResult) cheeredRef.current = false;
  }, [compareResult]);

  // Identity signature — catches the same take picked into two slots (name +
  // size + last-modified match is a near-certain duplicate). Near-duplicates
  // (re-exports of the same performance) are caught by the analyzer itself.
  const takeSig = (f) => `${f.name}|${f.size}|${f.lastModified}`;

  const pickFile = (i, file) => {
    if (!file) return;
    if (file.size > MAX_TAKE_MB * 1024 * 1024) {
      warn();
      setSizeError(`Take ${i + 1} is ${(file.size / 1048576).toFixed(0)}MB — keep each take under ${MAX_TAKE_MB}MB (a single-scene take exports small).`);
      return;
    }
    if (slots.some((v, idx) => idx !== i && v && takeSig(v) === takeSig(file))) {
      warn();
      setSizeError(`That's the same file as another take — Compare needs different takes of the scene, not the same one twice.`);
      return;
    }
    setSizeError('');
    tapSelect();
    setSlot(i, file);
  };

  const setSlot = (i, file) => { idemKeyRef.current = null; setSlots((s) => s.map((v, idx) => (idx === i ? file : v))); };
  const addSlot = () => setSlots((s) => (s.length >= 4 ? s : [...s, null]));
  const removeSlot = (i) => { idemKeyRef.current = null; setSlots((s) => (s.length <= 2 ? s : s.filter((_, idx) => idx !== i))); };

  const files = slots.filter(Boolean);
  const canSubmit = files.length >= 2 && !compareLoading;

  const submit = async () => {
    if (!canSubmit) return;
    // Backstop: never send identical takes — the compare would otherwise "rank"
    // a performance against itself.
    const sigs = files.map(takeSig);
    if (new Set(sigs).size !== sigs.length) {
      setSizeError('Two of your takes are the same file — upload different takes of the scene to compare.');
      return;
    }
    if (!idemKeyRef.current) {
      idemKeyRef.current = (crypto?.randomUUID?.() || `cmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    // Fold the Next Take Mission focus into the sides context so the ranker
    // weighs whether the newer take actually addressed the note.
    const effectiveSides = focusNote
      ? `${sides ? sides + '\n\n' : ''}DIRECTOR'S NOTE THE ACTOR IS WORKING ON: ${focusNote}`.trim()
      : sides;
    const res = await dispatch(compareTakes({ takes: files, role, tone, sides: effectiveSides, idempotencyKey: idemKeyRef.current }));
    // Definitive server failure (BE already refunded) → retry must re-charge.
    if (compareTakes.rejected.match(res) && res.payload?.reuseKey === false) {
      idemKeyRef.current = null;
    }
  };

  const reset = () => {
    idemKeyRef.current = null; // next comparison is a new action
    setSlots([null, null]); setRole(''); setTone(''); setSides(''); setExpanded(null);
    setFocusNote('');
    dispatch(clearCompare());
  };

  // ─── Loading ───────────────────────────────────────────────────────
  if (compareLoading) {
    const uploading = uploadProgress < 100;
    return (
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-10 text-center" style={SURFACE}>
        <Loader2 className="w-9 h-9 animate-spin text-[#7A5A18] mx-auto mb-4" />
        <p className="text-sm font-bold text-[#0A0A0A]">
          {uploading ? `Uploading your takes… ${uploadProgress}%` : 'Jericho is comparing your takes…'}
        </p>
        <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1.5 max-w-xs mx-auto leading-relaxed">
          {uploading
            ? 'Several large takes can take a few minutes to upload on a mobile connection — keep the app open.'
            : 'Reading each take’s arc, choices and truth — then picking the one to submit. This takes ~1–2 minutes.'}
        </p>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────
  if (compareResult) {
    const r = compareResult;
    const takesByNum = Object.fromEntries((r.takes || []).map((t) => [t.take, t]));
    const order = (r.ranking || []).filter((n) => takesByNum[n]);
    // Duplicate/single: the takes are the SAME performance — there is no winner.
    // Suppress the medal hierarchy + "Winner" framing so we don't crown one copy
    // over its twin (which would flatly contradict the "same take" headline).
    const isDup = r.comparison_status === 'duplicate' || r.comparison_status === 'single';

    // Defense in depth (BUG 3, analogous): a 200 with an empty/near-empty body
    // charges tokens but has no ranking to show — the winner banner would read
    // "Take undefined is your strongest". If no real takes came back, show the
    // incomplete-result card instead of a hollow ranked result.
    if (order.length === 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#FF8280]/30 p-5 text-center" style={SURFACE}>
            <p className="text-sm font-bold text-[#0A0A0A]">This comparison came back incomplete — your tokens were refunded. Please try again.</p>
          </div>
          <button
            onClick={reset}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg dst-press"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #7A5A18)` }}
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Winner banner */}
        <div className="rounded-2xl border border-[#D4A85F]/35 p-5 text-center tr-reveal" style={{ '--tr-i': 0, background: 'linear-gradient(135deg, rgba(212,168,95,0.16), rgba(122,90,24,0.05))' }}>
          <div className="w-12 h-12 rounded-2xl bg-[#D4A85F]/20 flex items-center justify-center mx-auto mb-2.5">
            {isDup ? <Copy size={20} className="text-[#7A5A18]" /> : <Trophy size={22} className="text-[#7A5A18]" />}
          </div>
          <p className="text-[11px] font-bold text-[#7A5A18] uppercase tracking-widest mb-1">{isDup ? 'Same take' : 'Submit this one'}</p>
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
            const isWinner = n === r.winner && !isDup;
            const open = expanded === n;
            const a = t.analysis || {};
            return (
              <div
                key={n}
                className="rounded-2xl border p-4 sm:p-5 tr-reveal"
                style={{
                  '--tr-i': idx + 1,
                  ...SURFACE,
                  borderColor: isWinner ? 'rgba(212,168,95,0.5)' : 'rgba(10,10,10,0.08)',
                  boxShadow: isWinner ? '0 4px 24px rgba(212,168,95,0.18)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex items-center justify-center flex-shrink-0 text-2xl">
                    {isDup ? <Copy size={18} className="text-[#7A5A18]/60" /> : (MEDAL[idx] || idx + 1)}
                  </div>
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

                {/* Expand full analysis — the deep per-take notes are a paid unlock,
                    surfaced once as a single card below rather than a link per take. */}
                {!notesLocked && (
                <button
                  onClick={() => setExpanded(open ? null : n)}
                  className="w-full flex items-center justify-center gap-1.5 mt-3 py-1.5 text-xs font-semibold text-[#7A5A18]"
                >
                  {open ? 'Hide' : 'See full notes for this take'}
                  <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                )}

                {!notesLocked && open && (
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

        {/* One prominent unlock for the deep per-take notes — replaces the old
            per-take lock links so the total hidden value is sold once, clearly. */}
        {notesLocked && (
          <button
            type="button"
            onClick={goPremium}
            className="w-full text-left rounded-2xl p-4 sm:p-5 border border-[#D4A85F]/35 tr-reveal"
            style={{ '--tr-i': order.length + 1, background: 'linear-gradient(135deg, rgba(212,168,95,0.12), rgba(122,90,24,0.04))' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Lock size={14} className="text-[#7A5A18]" />
              <span className="text-sm font-bold text-[#0A0A0A]">Unlock the full read on all {order.length} takes — any plan</span>
            </div>
            <p className="text-xs text-[rgba(10,10,10,0.6)] leading-relaxed">
              The deep per-take breakdown — performance, what to fix, and what to steal from each.
            </p>
          </button>
        )}

        {/* What to do */}
        {r.what_to_do && (
          <div className="rounded-2xl border border-[#FF8280]/25 p-4 tr-reveal" style={{ '--tr-i': order.length + 1, background: 'rgba(255,130,128,0.06)' }}>
            <h3 className="text-xs font-bold text-[#FF8280] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Sparkles size={13} /> Your move
            </h3>
            <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.what_to_do}</p>
          </div>
        )}

        <button
          onClick={reset}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg tr-reveal dst-press"
          style={{ '--tr-i': order.length + 1, background: `linear-gradient(135deg, ${GOLD}, #7A5A18)` }}
        >
          <RotateCcw size={15} /> Compare another set
        </button>
      </div>
    );
  }

  // ─── Submit form ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Next Take Mission — carried in from a Tape Review note */}
      {focusNote && (
        <div className="rounded-2xl border border-[#FF8280]/30 p-4" style={{ background: 'rgba(255,130,128,0.06)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-[#FF8280]" />
            <span className="text-xs font-bold text-[#FF8280] uppercase tracking-wide">Next Take Mission</span>
          </div>
          <p className="text-sm text-[#0A0A0A] leading-relaxed">
            Re-record working on this note, then compare against your original take:
          </p>
          <p className="text-sm font-semibold text-[#0A0A0A] mt-1.5">“{focusNote}”</p>
          {slots[0] && (
            <p className="text-xs text-[rgba(10,10,10,0.5)] mt-2">Your original take is loaded as Take 1 — add your new take below.</p>
          )}
        </div>
      )}

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

        {files.reduce((s, f) => s + (f?.size || 0), 0) > 60 * 1024 * 1024 && (
          <p className="text-[11px] text-[#7A5A18] mt-3 text-center leading-relaxed">
            Heads up — these are large takes ({(files.reduce((s, f) => s + (f?.size || 0), 0) / (1024 * 1024)).toFixed(0)} MB total).
            On a slower connection the upload can take a few minutes; keep the app open and watch the progress.
          </p>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all enabled:hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed dst-press"
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
