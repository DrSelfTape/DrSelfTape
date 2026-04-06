import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Camera, Sparkles, Mic, Users2, Radio, MessageSquare, Target,
  ChevronDown, ChevronUp, Check, ArrowRight, Trophy, Zap,
} from 'lucide-react';

const STEP_COLORS = ['#C855F0', '#A7ECDA', '#FFB49A', '#3b82f6', '#22c55e', '#FCE072', '#ef4444'];

const STEPS = [
  { id: 'headshot', label: 'Upload a Headshot', desc: 'So scene partners can see you', icon: Camera, route: '/dashboard/profile', mobilePanel: 'dash-profile' },
  { id: 'generate_scene', label: 'Generate a Scene', desc: 'Create a custom practice scene with AI', icon: Sparkles, route: '/dashboard/generator', mobilePanel: 'generator' },
  { id: 'practice_ai', label: 'Practice with AI', desc: 'Rehearse your scene with the AI reader', icon: Mic, route: '/dashboard/scene-study', mobileTab: 'live' },
  { id: 'find_reader', label: 'Find a Reader', desc: 'Swipe to find a real scene partner', icon: Users2, route: '/dashboard/find-a-reader', mobileTab: 'find-a-reader' },
  { id: 'go_available', label: 'Go Available', desc: "Let others know you're ready to read", icon: Radio, action: 'toggle_available' },
  { id: 'green_room', label: 'Open the Green Room', desc: 'See your matches and chat', icon: MessageSquare, route: '/dashboard/green-room', mobileTab: 'green-room' },
  { id: 'track_audition', label: 'Track an Audition', desc: 'Log your first audition', icon: Target, route: '/dashboard/auditions', mobileTab: 'auditions' },
];

const STORAGE_KEY = 'drst-tutorial';
const COMPLETE_KEY = 'drst-tutorial-complete';

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function markStep(stepId) {
  const progress = getProgress();
  if (!progress[stepId]) {
    progress[stepId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent('drst-tutorial-update'));
  }
}

export { markStep };

export default function TutorialChecklist({ onNavigate }) {
  const navigate = useNavigate();
  const profile = useSelector((s) => s.profile?.profile);
  const auditions = useSelector((s) => s.auditions?.data || []);
  const isAvailable = useSelector((s) => s.readersMatch?.isAvailable);
  const [progress, setProgress] = useState(getProgress());
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(!!localStorage.getItem(COMPLETE_KEY));
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    const handler = () => setProgress(getProgress());
    window.addEventListener('drst-tutorial-update', handler);
    return () => window.removeEventListener('drst-tutorial-update', handler);
  }, []);

  useEffect(() => {
    const p = getProgress();
    let changed = false;
    if (!p.headshot && (profile?.actor_profile?.headshot || profile?.user_image)) { p.headshot = true; changed = true; }
    if (!p.track_audition && auditions.length > 0) { p.track_audition = true; changed = true; }
    if (!p.go_available && isAvailable) { p.go_available = true; changed = true; }
    if (changed) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); setProgress({ ...p }); }
  }, [profile, auditions, isAvailable]);

  const completedCount = STEPS.filter((s) => progress[s.id]).length;
  const totalSteps = STEPS.length;
  const percent = Math.round((completedCount / totalSteps) * 100);
  const allComplete = completedCount === totalSteps;

  const handleGo = useCallback((step) => {
    if (step.action === 'toggle_available') {
      window.dispatchEvent(new CustomEvent('drst-tutorial-toggle-available'));
      return;
    }
    if (isMobile && onNavigate) {
      if (step.mobileTab) onNavigate({ tab: step.mobileTab });
      else if (step.mobilePanel) onNavigate({ panel: step.mobilePanel });
    } else if (step.route) {
      navigate(step.route);
    }
  }, [isMobile, onNavigate, navigate]);

  if (dismissed) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C855F0]/20" style={{
      background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-input) 40%, var(--bg-deepest) 100%)',
    }}>
      {/* Subtle glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at top left, rgba(200,85,240,0.08), transparent 60%)',
      }} />

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative w-full flex items-center justify-between px-5 py-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #C855F0, #7B2FBE)',
              boxShadow: '0 4px 15px rgba(200,85,240,0.3)',
            }}>
              {allComplete ? <Trophy className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />}
            </div>
            {!allComplete && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FCE072] text-[10px] font-bold flex items-center justify-center shadow-md" style={{ color: 'var(--bg-deep)' }}>
                {totalSteps - completedCount}
              </span>
            )}
          </div>
          <div className="text-left">
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {allComplete ? 'Tutorial Complete!' : 'Your Setup Checklist'}
            </p>
            <p className="text-xs text-[#A7ECDA] font-medium">
              {completedCount} of {totalSteps} done
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-default)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none"
                stroke={allComplete ? '#22c55e' : '#C855F0'}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${percent} 100`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {percent}%
            </span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
        </div>
      </button>

      {/* Steps */}
      {expanded && (
        <div className="relative px-4 pb-4 space-y-2">
          {/* Progress track line */}
          <div className="absolute left-[2.15rem] top-0 bottom-4 w-[2px]" style={{ background: 'var(--border-default)' }} />

          {STEPS.map((step, i) => {
            const done = progress[step.id];
            const Icon = step.icon;
            const color = STEP_COLORS[i];
            const isNext = !done && STEPS.slice(0, i).every((s) => progress[s.id]);

            return (
              <div
                key={step.id}
                className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  done ? '' : isNext ? 'bg-[#C855F0]/5 border border-[#C855F0]/20' : 'hover:bg-[#ffffff05]'
                }`}
              >
                {/* Step circle */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  done
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                    : isNext
                      ? 'border-2 border-[#C855F0] bg-[#C855F0]/10'
                      : ''
                }`} style={!done && !isNext ? { border: '1px solid var(--border-active)', background: 'var(--bg-surface)' } : {}}>
                  {done ? (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  ) : (
                    <Icon className="w-3.5 h-3.5" style={{ color: isNext ? '#C855F0' : 'var(--text-muted)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${done ? 'text-emerald-400' : ''}`} style={!done ? { color: 'var(--text-primary)' } : {}}>
                    {step.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${done ? 'text-emerald-400/60' : ''}`} style={!done ? { color: 'var(--text-secondary)' } : {}}>
                    {done ? 'Completed' : step.desc}
                  </p>
                </div>

                {/* Action */}
                {!done && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleGo(step); }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      isNext
                        ? 'bg-[#C855F0] text-white hover:bg-[#A040C8] shadow-[0_2px_10px_rgba(200,85,240,0.3)]'
                        : 'hover:border-[#C855F0]/50 hover:text-white'
                    }`}
                    style={!isNext ? { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-active)' } : {}}
                  >
                    {isNext ? 'Start' : 'Go'} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {done && (
                  <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Claim button */}
          {allComplete && (
            <button
              onClick={() => {
                localStorage.setItem(COMPLETE_KEY, 'true');
                setDismissed(true);
                window.dispatchEvent(new CustomEvent('drst-tutorial-complete'));
              }}
              className="w-full mt-3 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #C855F0 0%, #A7ECDA 50%, #22c55e 100%)',
                boxShadow: '0 4px 20px rgba(200,85,240,0.3)',
              }}
            >
              Claim Achievement
            </button>
          )}
        </div>
      )}
    </div>
  );
}
