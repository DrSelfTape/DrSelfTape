import { useState } from 'react';
import { ArrowLeft, Mic, BookOpen, Video } from 'lucide-react';
import Teleprompter from './Teleprompter';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';

/**
 * Scene Study Practice — V2 layout (preview behind ?layout=v2).
 *
 * Replaces the cluttered v1 chrome (giant Live Study promo banner + 1-2-3
 * stepper + redundant "Rehearse with your AI..." subtitle + floating Self-Tape
 * pill + bottom action buttons) with a single tab row that surfaces the three
 * rehearsal modes (Live Study / Practice / Self-Tape) as the primary action.
 *
 * Script rendering is unchanged — we reuse Teleprompter with hideHeader so the
 * script + auto-scroll controls + progress bar all behave the same. Only the
 * surrounding chrome is redesigned.
 */
export default function PracticeV2({
  lines,
  userRole,
  onBack,
  onGoLive,
  onSelfTape,
}) {
  // Hide MobileApp's persistent top bar + bottom tab pill — Practice
  // owns its own back button + role pill + mode tabs, the persistent
  // chrome was eating the breathing room above the script.
  useHideMobileHeader(true);
  // Active tab — Practice is the default since this is the Teleprompter view.
  // Live Study and Self-Tape tabs trigger their step transitions immediately.
  const [activeTab, setActiveTab] = useState('practice');

  const handleTab = (id) => {
    if (id === 'practice') return setActiveTab('practice');
    if (id === 'live' && onGoLive) return onGoLive();
    if (id === 'self-tape' && onSelfTape) return onSelfTape();
  };

  const TABS = [
    { id: 'live', label: 'Live Study', icon: Mic, badge: 'NEW' },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'self-tape', label: 'Self-Tape', icon: Video },
  ];

  return (
    <div className="flex flex-col aurora-orbs" style={{ height: '100dvh', maxWidth: '44rem', margin: '0 auto', width: '100%', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
      {/* ── Row 1: BACK on its own line, with the Playing role pill
            tucked right. Generous padding so neither feels crowded. ── */}
      <div className="flex items-center justify-between px-4 pb-3">
        <button
          onClick={onBack}
          className="aurora-mono flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          style={{ color: 'var(--aurora-sub)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {userRole && (
          <div className="aurora-mono flex items-center gap-1.5 px-3.5 py-1.5 rounded-full" style={{
            background: 'color-mix(in oklch, var(--aurora-accent) 18%, transparent)',
            color: 'var(--aurora-accent)',
            border: '1px solid color-mix(in oklch, var(--aurora-accent) 40%, transparent)',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            backdropFilter: 'blur(12px)',
          }}>
            Playing <span style={{ fontWeight: 700 }}>{userRole}</span>
          </div>
        )}
      </div>

      {/* ── Row 2: Mode tabs with proper breathing room. Each tab is
            a comfortable touch target with the icon + label centered
            and the NEW badge sitting cleanly above-right of the icon
            (no longer overlapping the next tab). ── */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTab(t.id)}
              className="aurora-mono relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl transition-all cursor-pointer"
              style={{
                background: active ? 'var(--aurora-accent)' : 'var(--aurora-glass)',
                color: active ? '#fff' : 'var(--aurora-sub)',
                border: active ? 'none' : '1px solid var(--aurora-glass-border)',
                backdropFilter: active ? 'none' : 'blur(12px)',
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                boxShadow: active ? 'var(--aurora-shadow-coral)' : 'none',
                minHeight: 64,
              }}
            >
              {t.badge && !active && (
                <span className="aurora-mono absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full leading-none" style={{
                  background: 'var(--aurora-accent)', color: '#fff', fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
                }}>
                  {t.badge}
                </span>
              )}
              <t.icon size={18} />
              <span style={{ whiteSpace: 'nowrap' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Script (Teleprompter with header suppressed) ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Teleprompter
          lines={lines}
          userRole={userRole}
          onBack={onBack}
          onGoLive={onGoLive}
          onSelfTape={onSelfTape}
          hideHeader
        />
      </div>
    </div>
  );
}
