import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Camera, Sparkles, Mic, Users2, Radio, MessageSquare, Target, Film,
  ChevronDown, ChevronUp, Check, ArrowRight, Trophy, Zap, X,
} from 'lucide-react';
import { store } from '../../redux/store';
import { patchUserSettings } from '../../redux/features/userSettings/userSettingsSlice';
import { useIsMobile } from '../../hooks/useIsMobile';

const STEP_COLORS = ['#FF8280', '#A7ECDA', '#FFB49A', '#3b82f6', '#22c55e', '#FCE072', '#ef4444'];

const STEPS = [
  // The activation aha — completed via markStep('first_review') when any
  // Tape Review result lands (TapeReview.jsx). Deliberately first: the top
  // unchecked row is the checklist's routing decision, and it must route to
  // the aha, never to a profile chore.
  { id: 'first_review', label: 'Get your first AI Tape Review', desc: 'Casting-grade notes on a self-tape', icon: Film, route: '/dashboard/jericho?tab=tape', mobileTab: 'tape-review' },
  { id: 'headshot', label: 'Upload a Headshot', desc: 'So scene partners can see you', icon: Camera, route: '/dashboard/profile', mobilePanel: 'dash-profile' },
  { id: 'generate_scene', label: 'Generate a Scene', desc: 'Create a custom practice scene with AI', icon: Sparkles, route: '/dashboard/generator', mobilePanel: 'generator' },
  { id: 'practice_ai', label: 'Practice with AI', desc: 'Rehearse your scene with the AI reader', icon: Mic, route: '/dashboard/scene-study', mobileTab: 'live' },
  { id: 'find_reader', label: 'Find a Reader', desc: 'Swipe to find a real scene partner', icon: Users2, route: '/dashboard/find-a-reader', mobileTab: 'find-a-reader' },
  { id: 'go_available', label: 'Go Available', desc: "Let others know you're ready to read", icon: Radio, action: 'toggle_available' },
  { id: 'green_room', label: 'Open the Green Room', desc: 'See your matches and chat', icon: MessageSquare, route: '/dashboard/green-room', mobileTab: 'green-room' },
  { id: 'track_audition', label: 'Track an Audition', desc: 'Log your first audition', icon: Target, route: '/dashboard/auditions', mobileTab: 'auditions' },
];

// Progress is now persisted server-side via UserSettings. We read the
// current snapshot from the Redux store so markStep can be called from
// anywhere (event handlers, async flows) without component plumbing.
function getProgress() {
  return store.getState()?.userSettings?.data?.tutorial_progress || {};
}

function markStep(stepId) {
  const current = getProgress();
  if (current[stepId]) return;
  const next = { ...current, [stepId]: true };
  store.dispatch(patchUserSettings({ tutorial_progress: next }));
  // Fire analytics for each tutorial milestone — lazy-import so this file
  // stays a tiny dependency-free helper for any panel that wants to mark.
  import('../../utils/analytics').then(({ trackEvent, Events }) => {
    trackEvent(Events.TUTORIAL_STEP, { step: stepId });
  }).catch(() => { /* swallow */ });
}

export { markStep };

export default function TutorialChecklist({ onNavigate }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.profile?.profile);
  const auditions = useSelector((s) => s.auditions?.data || []);
  const isAvailable = useSelector((s) => s.readersMatch?.isAvailable);
  const progress = useSelector((s) => s.userSettings?.data?.tutorial_progress || {});
  const dismissed = useSelector((s) => !!s.userSettings?.data?.tutorial_complete);
  const settingsLoaded = useSelector((s) => !!s.userSettings?.loaded);
  const [expanded, setExpanded] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!settingsLoaded) return;
    const p = progress;
    const patch = {};
    if (!p.headshot && (profile?.actor_profile?.headshot || profile?.user_image)) patch.headshot = true;
    if (!p.track_audition && auditions.length > 0) patch.track_audition = true;
    if (!p.go_available && isAvailable) patch.go_available = true;
    if (Object.keys(patch).length) {
      dispatch(patchUserSettings({ tutorial_progress: { ...p, ...patch } }));
    }
  }, [profile, auditions, isAvailable, progress, settingsLoaded, dispatch]);

  const completedCount = STEPS.filter((s) => progress[s.id]).length;
  const totalSteps = STEPS.length;
  const percent = Math.round((completedCount / totalSteps) * 100);
  const allComplete = completedCount === totalSteps;
  const remainingSteps = STEPS.filter((s) => !progress[s.id]);

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

  // Don't render anything until userSettings has loaded from the server.
  // Otherwise the checklist briefly flashes on every reload because the
  // tutorial_complete flag reads as `false` during the loading window.
  if (!settingsLoaded) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    // Persist the dismissal server-side so it sticks across devices and
    // doesn't come back on next login.
    dispatch(patchUserSettings({ tutorial_complete: true }));
    window.dispatchEvent(new CustomEvent('drst-tutorial-complete'));
    import('../../utils/analytics').then(({ trackEvent, Events }) => {
      trackEvent(Events.TUTORIAL_COMPLETE, { steps_done: completedCount, total: totalSteps });
    }).catch(() => { /* swallow */ });
  };

  return (
    <div style={{
      borderRadius: 22,
      overflow: 'hidden',
      border: '1px solid rgba(255, 130, 128,0.12)',
      background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-input) 40%, var(--bg-deepest) 100%)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
      position: 'relative',
    }}>
      {/* Dismiss (X) — top-right of the card. Sits above the expand
          button via z-index. Persists server-side so it stays dismissed. */}
      <button
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        aria-label="Dismiss checklist"
        title="Dismiss"
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(10,10,10,0.04)', color: 'var(--text-secondary)',
        }}
      >
        <X size={14} />
      </button>

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'relative', width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '16px 44px 16px 20px', cursor: 'pointer',
          background: 'none', border: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Progress ring */}
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-default)" strokeWidth="3" />
              <circle cx="22" cy="22" r="18" fill="none"
                stroke={allComplete ? '#22c55e' : '#FF8280'}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${percent * 1.13} 113`}
                style={{ transition: 'stroke-dasharray 0.7s ease' }}
              />
            </svg>
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
            }}>
              {allComplete ? <Trophy size={16} color="#22c55e" /> : `${percent}%`}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {allComplete ? 'All done!' : 'Get Started'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {allComplete ? 'You explored everything' : `${remainingSteps.length} step${remainingSteps.length !== 1 ? 's' : ''} left`}
            </p>
          </div>
        </div>

        {expanded
          ? <ChevronUp size={18} color="var(--text-secondary)" />
          : <ChevronDown size={18} color="var(--text-secondary)" />
        }
      </button>

      {/* Steps — only show incomplete */}
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {remainingSteps.length > 0 ? remainingSteps.map((step, i) => {
            const Icon = step.icon;
            const isNext = i === 0;

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 14, marginBottom: 6,
                  background: isNext ? 'rgba(255, 130, 128,0.06)' : 'transparent',
                  border: isNext ? '1px solid rgba(255, 130, 128,0.15)' : '1px solid transparent',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isNext ? 'rgba(255, 130, 128,0.12)' : 'var(--bg-surface, rgba(255,255,255,0.04))',
                  border: isNext ? '1px solid rgba(255, 130, 128,0.25)' : '1px solid var(--border-default, rgba(255,255,255,0.06))',
                }}>
                  <Icon size={16} color={isNext ? '#FF8280' : 'var(--text-muted)'} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{step.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '1px 0 0' }}>{step.desc}</p>
                </div>

                {/* Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleGo(step); }}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: isNext ? '8px 16px' : '8px 12px', borderRadius: 10,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: isNext ? '#FF8280' : 'var(--bg-surface, rgba(255,255,255,0.04))',
                    color: isNext ? '#fff' : 'var(--text-secondary)',
                    boxShadow: isNext ? '0 2px 8px rgba(255, 130, 128,0.25)' : 'none',
                  }}
                >
                  {isNext ? 'Start' : 'Go'} <ArrowRight size={12} />
                </button>
              </div>
            );
          }) : null}

          {/* Completed count summary */}
          {completedCount > 0 && !allComplete && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              borderRadius: 10, marginTop: 4,
              background: 'rgba(34,197,94,0.06)',
            }}>
              <Check size={14} color="#22c55e" />
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                {completedCount} completed
              </span>
            </div>
          )}

          {/* Claim button */}
          {allComplete && (
            <button
              onClick={handleDismiss}
              style={{
                width: '100%', marginTop: 8, padding: '14px', borderRadius: 14,
                color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #D4A85F, #9FE6B4)',
                boxShadow: '0 4px 16px rgba(255, 130, 128,0.25)',
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
