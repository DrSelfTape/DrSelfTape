import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Camera, Sparkles, Mic, Users2, Radio, MessageSquare, Target,
  ChevronDown, ChevronUp, Check, ArrowRight, Trophy,
} from 'lucide-react';

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

// Export for other components to call
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

  // Listen for updates from other components
  useEffect(() => {
    const handler = () => setProgress(getProgress());
    window.addEventListener('drst-tutorial-update', handler);
    return () => window.removeEventListener('drst-tutorial-update', handler);
  }, []);

  // Auto-detect completed steps
  useEffect(() => {
    const p = getProgress();
    let changed = false;

    if (!p.headshot && (profile?.actor_profile?.headshot || profile?.user_image)) {
      p.headshot = true; changed = true;
    }
    if (!p.track_audition && auditions.length > 0) {
      p.track_audition = true; changed = true;
    }
    if (!p.go_available && isAvailable) {
      p.go_available = true; changed = true;
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      setProgress({ ...p });
    }
  }, [profile, auditions, isAvailable]);

  const completedCount = STEPS.filter((s) => progress[s.id]).length;
  const totalSteps = STEPS.length;
  const percent = Math.round((completedCount / totalSteps) * 100);
  const allComplete = completedCount === totalSteps;

  const handleGo = useCallback((step) => {
    if (step.action === 'toggle_available') {
      // Trigger the availability toggle via custom event
      window.dispatchEvent(new CustomEvent('drst-tutorial-toggle-available'));
      return;
    }
    if (isMobile && onNavigate) {
      if (step.mobileTab) {
        onNavigate({ tab: step.mobileTab });
      } else if (step.mobilePanel) {
        onNavigate({ panel: step.mobilePanel });
      }
    } else if (step.route) {
      navigate(step.route);
    }
  }, [isMobile, onNavigate, navigate]);

  if (dismissed) return null;

  return (
    <div className="bg-[#111318] border border-[#2A2A2A] rounded-2xl overflow-hidden">
      {/* Header with progress */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#1A1A2E]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C855F0]/15 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-[#C855F0]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">
              {allComplete ? 'Tutorial Complete!' : 'Get Started'}
            </p>
            <p className="text-xs text-[#888]">
              {completedCount} of {totalSteps} complete ({percent}%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="w-24 h-2 bg-[#2A2A2A] rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percent}%`,
                background: allComplete
                  ? 'linear-gradient(90deg, #22c55e, #A7ECDA)'
                  : 'linear-gradient(90deg, #C855F0, #E88BF5)',
              }}
            />
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#666]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#666]" />
          )}
        </div>
      </button>

      {/* Full progress bar (mobile) */}
      <div className="px-5 pb-1 sm:hidden">
        <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: allComplete
                ? 'linear-gradient(90deg, #22c55e, #A7ECDA)'
                : 'linear-gradient(90deg, #C855F0, #E88BF5)',
            }}
          />
        </div>
      </div>

      {/* Steps list */}
      {expanded && (
        <div className="px-3 pb-3">
          {STEPS.map((step) => {
            const done = progress[step.id];
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  done ? 'opacity-60' : 'hover:bg-[#1E1E1E]'
                }`}
              >
                {/* Status icon */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-emerald-500/20' : 'bg-[#2A2A2A]'
                }`}>
                  {done ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-[#888]" />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-[#888] line-through' : 'text-white'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-[#555] truncate">{step.desc}</p>
                </div>

                {/* Action */}
                {!done && (
                  <button
                    onClick={() => handleGo(step)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C855F0]/10 text-[#C855F0] text-xs font-semibold hover:bg-[#C855F0]/20 transition-colors"
                  >
                    Go <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {done && (
                  <span className="text-xs text-emerald-400 font-medium shrink-0">Done</span>
                )}
              </div>
            );
          })}

          {/* Complete button */}
          {allComplete && (
            <button
              onClick={() => {
                localStorage.setItem(COMPLETE_KEY, 'true');
                setDismissed(true);
                window.dispatchEvent(new CustomEvent('drst-tutorial-complete'));
              }}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#C855F0] to-[#22c55e] text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#C855F0]/20"
            >
              Claim Achievement
            </button>
          )}
        </div>
      )}
    </div>
  );
}
