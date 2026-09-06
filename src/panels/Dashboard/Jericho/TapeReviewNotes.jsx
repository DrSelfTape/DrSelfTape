import { CheckCircle2, Target, Sparkles, Flame, Theater } from 'lucide-react';
import { TECH_SCORES, DNA } from './reviewResultFields';

const SURFACE = { background: 'var(--bg-surface, #1A1A2E)' };

const PERF_FIELDS = [
  { key: 'emotional_arc', label: 'Emotional arc' },
  { key: 'strongest_beat', label: 'Strongest beat' },
  { key: 'choices', label: 'The choice' },
  { key: 'listening_presence', label: 'Listening & presence' },
  { key: 'truth_vs_indicated', label: 'Truth vs. indicated' },
];

// Verdict chip for a rubric row — the score in the language of the room.
function scoreChip(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n >= 8) return { text: 'Casting-ready', color: '#15803d', bg: 'rgba(34,197,94,0.12)' };
  if (n >= 6) return { text: 'Solid', color: '#7A5A18', bg: 'rgba(212,168,95,0.14)' };
  return { text: 'Needs work', color: '#b91c1c', bg: 'rgba(255,130,128,0.14)' };
}

function ScoreBar({ label, value, color = '#D4A85F', chip = null }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[rgba(10,10,10,0.62)] flex-1 truncate">{label}</span>
      {chip && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: chip.color, background: chip.bg }}>
          {chip.text}
        </span>
      )}
      <div className="w-28 h-2 rounded-full bg-[#F4F4EE] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v * 10}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-[#0A0A0A] w-5 text-right">{v}</span>
    </div>
  );
}

// Presentation only: callers supply the already-trimmed review. Never fetch,
// recover cached notes, check entitlements, or record review activity here.
// The onboarding sample and live results deliberately share this renderer.
export default function TapeReviewNotes({ review: r, revealStage = 3, afterNotes = null }) {
  const working = Array.isArray(r.whats_working) ? r.whats_working : [];
  const adjustments = Array.isArray(r.adjustments) ? r.adjustments : [];
  const scores = r.scores || {};
  const dna = r.performance_dna || {};
  const tags = Array.isArray(r.tone_tags) ? r.tone_tags : [];
  const hasScores = TECH_SCORES.some((s) => scores[s.key] != null);
  const hasDna = DNA.some((d) => dna[d.key] != null);

  return (
    <>
        {/* Verdict */}
        {r.verdict && (
          <div className="rounded-2xl border border-[#D4A85F]/25 p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 1, background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
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

        {/* What's working — reveal stage 1 */}
        {revealStage >= 1 && working.length > 0 && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 0, ...SURFACE }}>
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

        {/* Performance read — the deep craft analysis (reveal stage 2) */}
        {revealStage >= 2 && r.performance && Object.values(r.performance).some(Boolean) && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 0, ...SURFACE }}>
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

        {/* Adjustments (reveal stage 2) */}
        {revealStage >= 2 && adjustments.length > 0 && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 1, ...SURFACE }}>
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

        {/* The one thing (reveal stage 2) */}
        {revealStage >= 2 && r.the_one_thing && (
          <div className="rounded-2xl border border-[#FF8280]/25 p-4 tr-reveal" style={{ '--tr-i': 2, background: 'rgba(255,130,128,0.06)' }}>
            <h3 className="text-xs font-bold text-[#FF8280] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Flame size={13} /> The one thing
            </h3>
            <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.the_one_thing}</p>
          </div>
        )}

        {afterNotes}
        {/* Scores — only render a card when its data actually came back, so an
            empty/partial result never shows a wall of clamped-to-0 bars. */}
        {revealStage >= 3 && (hasScores || hasDna) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 tr-reveal" style={{ '--tr-i': 0 }}>
            {hasScores && (
              <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={SURFACE}>
                <h3 className="text-xs font-bold text-[#0A0A0A] mb-3">Tape scores</h3>
                <div className="space-y-2.5">
                  {/* Only dimensions the server actually scored — a missing key
                      must never render as a 0 that reads as a terrible score. */}
                  {TECH_SCORES.filter((s) => scores[s.key] != null).map((s) => (
                    <ScoreBar key={s.key} label={s.label} value={scores[s.key]} chip={scoreChip(scores[s.key])} />
                  ))}
                </div>
              </div>
            )}
            {hasDna && (
              <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={SURFACE}>
                <h3 className="text-xs font-bold text-[#0A0A0A] mb-3">Performance DNA</h3>
                <div className="space-y-2.5">
                  {/* The BE now OMITS dimensions the tape gives no evidence for
                      (e.g. comedy_timing on a straight drama) instead of
                      guessing a middle number — skip them rather than render
                      a "0" bar that reads as a terrible score. */}
                  {DNA.filter((d) => dna[d.key] != null).map((d) => (
                    <ScoreBar key={d.key} label={d.label} value={dna[d.key]} color={d.color} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

    </>
  );
}
