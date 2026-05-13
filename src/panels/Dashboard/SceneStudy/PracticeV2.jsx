import { useState } from 'react';
import { ArrowLeft, Mic, BookOpen, Video } from 'lucide-react';
import Teleprompter from './Teleprompter';

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
    <div className="flex flex-col aurora-orbs" style={{ height: 'calc(100dvh - 140px)', maxWidth: '44rem', margin: '0 auto', width: '100%' }}>
      {/* ── Top row: back + role pill ── */}
      <div className="flex items-center justify-between px-1 mb-3">
        <button
          onClick={onBack}
          className="aurora-mono flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--aurora-sub)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        {userRole && (
          <div className="aurora-mono flex items-center gap-1.5 px-3 py-1 rounded-full" style={{
            background: 'color-mix(in oklch, var(--aurora-accent) 18%, transparent)',
            color: 'var(--aurora-accent)',
            border: '1px solid color-mix(in oklch, var(--aurora-accent) 40%, transparent)',
            fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(12px)',
          }}>
            Playing <span style={{ fontWeight: 700 }}>{userRole}</span>
          </div>
        )}
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex items-stretch gap-1 mb-3 px-1">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTab(t.id)}
              className="aurora-mono flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all cursor-pointer"
              style={{
                background: active ? 'var(--aurora-accent)' : 'var(--aurora-glass)',
                color: active ? '#fff' : 'var(--aurora-sub)',
                border: active ? 'none' : '1px solid var(--aurora-glass-border)',
                backdropFilter: active ? 'none' : 'blur(12px)',
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                boxShadow: active ? 'var(--aurora-shadow-coral)' : 'none',
              }}
            >
              <div className="relative">
                <t.icon size={15} />
                {t.badge && !active && (
                  <span className="aurora-mono absolute -top-1.5 -right-3 px-1 rounded-full leading-tight" style={{
                    background: 'var(--aurora-accent)', color: '#fff', fontSize: 8, fontWeight: 700,
                  }}>
                    {t.badge}
                  </span>
                )}
              </div>
              <span>{t.label}</span>
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
