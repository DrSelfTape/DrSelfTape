/**
 * Jericho — Tape Review
 * Submit an existing self-tape; Jericho returns structured acting notes
 * (verdict, what's working, prioritized adjustments, scores + Performance DNA),
 * grounded in the in-house coaching doctrine. Powered by /ai/jericho/tape-review/.
 */
import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Upload, Loader2, Film, CheckCircle2, Target, Sparkles,
  RotateCcw, ChevronDown, Eye, Frame, Lightbulb, Flame, Activity, Theater, Trophy, HelpCircle,
} from 'lucide-react';
import { reviewTape, clearTapeReview } from '../../../redux/features/jericho/jerichoSlice';
import CompareTakes from './CompareTakes';
import TapeAnalyzerTutorial, { TAPE_TUTORIAL_KEY } from './TapeAnalyzerTutorial';

const SURFACE = { background: 'var(--bg-surface, #1A1A2E)' };

const TECH_SCORES = [
  { key: 'framing', label: 'Framing', icon: Frame },
  { key: 'eyeline', label: 'Eyeline', icon: Eye },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb },
  { key: 'energy_commitment', label: 'Energy & Commitment', icon: Flame },
  { key: 'dynamic_range', label: 'Dynamic Range', icon: Activity },
];

const DNA = [
  { key: 'emotional_range', label: 'Emotional Range', color: '#D4A85F' },
  { key: 'cold_read', label: 'Cold Read', color: '#3b82f6' },
  { key: 'comedy_timing', label: 'Comedy Timing', color: '#FCE072' },
  { key: 'dramatic_depth', label: 'Dramatic Depth', color: '#ef4444' },
  { key: 'physicality', label: 'Physicality', color: '#22c55e' },
  { key: 'vocal_variety', label: 'Vocal Variety', color: '#A7ECDA' },
];

const PERF_FIELDS = [
  { key: 'emotional_arc', label: 'Emotional arc' },
  { key: 'strongest_beat', label: 'Strongest beat' },
  { key: 'choices', label: 'The choice' },
  { key: 'listening_presence', label: 'Listening & presence' },
  { key: 'truth_vs_indicated', label: 'Truth vs. indicated' },
];

function ScoreBar({ label, value, color = '#D4A85F' }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[rgba(10,10,10,0.62)] flex-1 truncate">{label}</span>
      <div className="w-28 h-2 rounded-full bg-[#F4F4EE] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v * 10}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-[#0A0A0A] w-5 text-right">{v}</span>
    </div>
  );
}

export default function TapeReview() {
  const dispatch = useDispatch();
  const { tapeReviewLoading, tapeReviewResult, tapeReviewError } = useSelector((s) => s.jericho);

  const [mode, setMode] = useState('single'); // 'single' | 'compare'
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [sides, setSides] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const inputRef = useRef(null);

  // First time an actor opens the analyzer → show the walkthrough.
  useEffect(() => {
    try {
      if (!localStorage.getItem(TAPE_TUTORIAL_KEY)) setShowTutorial(true);
    } catch { /* private mode — just skip */ }
  }, []);

  // A plain element (not an inline component) so re-renders reconcile it in
  // place — otherwise the tutorial overlay would remount + replay its
  // animation on every keystroke. Renders in both modes.
  const modeToggle = (
    <>
      {showTutorial && <TapeAnalyzerTutorial onClose={() => setShowTutorial(false)} />}
      <div className="flex items-center gap-1.5 mb-4">
        <div className="flex gap-1.5 p-1 rounded-xl bg-[#F4F4EE] flex-1">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'single' ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[rgba(10,10,10,0.5)]'}`}
          >
            <Sparkles size={13} /> Review a take
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'compare' ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[rgba(10,10,10,0.5)]'}`}
          >
            <Trophy size={13} /> Compare takes
          </button>
        </div>
        <button
          onClick={() => setShowTutorial(true)}
          aria-label="How the analyzer works"
          className="w-9 h-9 rounded-xl bg-[#F4F4EE] flex items-center justify-center text-[#7A5A18] flex-shrink-0 hover:bg-[#D4A85F]/15 transition-colors"
        >
          <HelpCircle size={17} />
        </button>
      </div>
    </>
  );

  // Compare mode owns its own screen (upload / loading / ranked result).
  if (mode === 'compare') {
    return (
      <div>
        {modeToggle}
        <CompareTakes />
      </div>
    );
  }

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const submit = () => {
    if (!file || tapeReviewLoading) return;
    dispatch(reviewTape({ video: file, role, tone, sides }));
  };

  const reset = () => {
    setFile(null); setRole(''); setTone(''); setSides('');
    dispatch(clearTapeReview());
  };

  // ─── Loading ───────────────────────────────────────────────────────
  if (tapeReviewLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-10 text-center" style={SURFACE}>
        <Loader2 className="w-9 h-9 animate-spin text-[#7A5A18] mx-auto mb-4" />
        <p className="text-sm font-bold text-[#0A0A0A]">Jericho is watching your tape…</p>
        <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1.5 max-w-xs mx-auto leading-relaxed">
          Reading your framing, eyeline, lighting, and the performance arc beat by beat. This takes ~30–60 seconds.
        </p>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────
  if (tapeReviewResult) {
    const r = tapeReviewResult;
    const working = Array.isArray(r.whats_working) ? r.whats_working : [];
    const adjustments = Array.isArray(r.adjustments) ? r.adjustments : [];
    const scores = r.scores || {};
    const dna = r.performance_dna || {};
    const tags = Array.isArray(r.tone_tags) ? r.tone_tags : [];

    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Verdict */}
        {r.verdict && (
          <div className="rounded-2xl border border-[#D4A85F]/25 p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4A85F]/15 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-[#7A5A18]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#7A5A18] uppercase tracking-wide mb-1">Quick read</h3>
                <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.verdict}</p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tags.map((t, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#D4A85F]/12 text-[#7A5A18] border border-[#D4A85F]/20">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* What's working */}
        {working.length > 0 && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={SURFACE}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> What&apos;s working
            </h3>
            <div className="space-y-3">
              {working.map((w, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    {w.title && <p className="text-xs font-bold text-[#0A0A0A]">{w.title}</p>}
                    <p className="text-sm text-[rgba(10,10,10,0.62)] leading-relaxed">{w.detail || w}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance read — the deep craft analysis */}
        {r.performance && Object.values(r.performance).some(Boolean) && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={SURFACE}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <Theater size={16} className="text-[#7A5A18]" /> Performance read
            </h3>
            <div className="space-y-3.5">
              {PERF_FIELDS.filter((f) => r.performance[f.key]).map((f) => (
                <div key={f.key}>
                  <p className="text-[11px] font-bold text-[#7A5A18] uppercase tracking-wide mb-1">{f.label}</p>
                  <p className="text-sm text-[rgba(10,10,10,0.72)] leading-relaxed">{r.performance[f.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adjustments */}
        {adjustments.length > 0 && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={SURFACE}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <Target size={16} className="text-[#7A5A18]" /> Your next take
            </h3>
            <div className="space-y-4">
              {adjustments.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4A85F]/15 text-[#7A5A18] flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</div>
                  <div className="min-w-0">
                    {a.title && <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">{a.title}</p>}
                    <p className="text-sm text-[rgba(10,10,10,0.78)] leading-relaxed">{a.note || a}</p>
                    {a.why && <p className="text-xs text-[rgba(10,10,10,0.45)] leading-relaxed mt-1 italic">{a.why}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The one thing */}
        {r.the_one_thing && (
          <div className="rounded-2xl border border-[#FF8280]/25 p-4" style={{ background: 'rgba(255,130,128,0.06)' }}>
            <h3 className="text-xs font-bold text-[#FF8280] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Flame size={13} /> The one thing
            </h3>
            <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.the_one_thing}</p>
          </div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={SURFACE}>
            <h3 className="text-xs font-bold text-[#0A0A0A] mb-3">Tape scores</h3>
            <div className="space-y-2.5">
              {TECH_SCORES.map((s) => (
                <ScoreBar key={s.key} label={s.label} value={scores[s.key]} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={SURFACE}>
            <h3 className="text-xs font-bold text-[#0A0A0A] mb-3">Performance DNA</h3>
            <div className="space-y-2.5">
              {DNA.map((d) => (
                <ScoreBar key={d.key} label={d.label} value={dna[d.key]} color={d.color} />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={reset}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
        >
          <RotateCcw size={15} /> Review another take
        </button>
      </div>
    );
  }

  // ─── Submit form ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {modeToggle}
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={SURFACE}>
        <h3 className="text-sm font-bold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <Film size={16} className="text-[#7A5A18]" /> Submit a self-tape
        </h3>
        <p className="text-xs text-[rgba(10,10,10,0.45)] mb-4 leading-relaxed">
          Upload a take and Jericho gives you real casting-grade notes — framing, eyeline, your choices, and the performance arc.
        </p>

        {/* Drop / pick */}
        <button
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 transition-colors ${
            file ? 'border-[#D4A85F]/50 bg-[#D4A85F]/5' : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F]/40'
          }`}
        >
          {file ? (
            <>
              <Film size={22} className="text-[#7A5A18]" />
              <span className="text-sm font-medium text-[#0A0A0A] truncate max-w-full px-2">{file.name}</span>
              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">{(file.size / (1024 * 1024)).toFixed(1)} MB · tap to change</span>
            </>
          ) : (
            <>
              <Upload size={22} className="text-[rgba(10,10,10,0.4)]" />
              <span className="text-sm font-medium text-[rgba(10,10,10,0.62)]">Choose a video</span>
              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">mp4, mov, or webm · up to 500 MB</span>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" accept="video/*" onChange={onPick} className="hidden" />

        {/* Optional context */}
        <button
          onClick={() => setShowOptional((v) => !v)}
          className="w-full flex items-center justify-between mt-3 px-1 py-2 text-xs font-medium text-[rgba(10,10,10,0.45)]"
        >
          <span>Add context for sharper notes (optional)</span>
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

        {tapeReviewError && (
          <p className="text-xs text-red-500 mt-3 text-center">{String(tapeReviewError)}</p>
        )}

        <button
          onClick={submit}
          disabled={!file}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all enabled:hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
        >
          <Sparkles size={15} /> Get my notes
        </button>
        <p className="text-[10px] text-[rgba(10,10,10,0.35)] text-center mt-2">Uses 1 token · your tape is analyzed, not stored for training</p>
      </div>
    </div>
  );
}
