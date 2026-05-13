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
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 140px)', maxWidth: '44rem', margin: '0 auto', width: '100%' }}>
      {/* ── Top row: back + role pill ── */}
      <div className="flex items-center justify-between px-1 mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {userRole && (
          <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(255,130,128,0.10)', color: '#FF8280', border: '1px solid rgba(255,130,128,0.25)' }}>
            Playing <span className="font-semibold uppercase tracking-wider">{userRole}</span>
          </div>
        )}
      </div>

      {/* ── Mode tabs — replaces v1 promo banner + stepper + Self-Tape pill ── */}
      <div className="flex items-stretch gap-1 mb-3 px-1">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-[#FF8280] text-white'
                  : 'bg-[#1A1A1A] text-[#999999] hover:text-white'
              }`}
              style={!active ? { border: '1px solid #2A2A2A' } : undefined}
            >
              <div className="relative">
                <t.icon size={16} />
                {t.badge && !active && (
                  <span className="absolute -top-1.5 -right-3 bg-[#FF8280] text-white text-[8px] font-bold px-1 rounded-full leading-tight">
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
