import { useState } from 'react';

const VOICES = [
  { id: 'partner_male',    label: 'George',  desc: 'Warm & Captivating',    accent: 'British',   gender: 'Male',    emoji: '👨' },
  { id: 'partner_female',  label: 'Lily',    desc: 'Velvety Actress',       accent: 'British',   gender: 'Female',  emoji: '👩' },
  { id: 'partner_neutral', label: 'River',   desc: 'Calm & Neutral',        accent: 'American',  gender: 'Neutral', emoji: '🧑' },
  { id: 'cd_female',       label: 'Sarah',   desc: 'Mature & Confident',    accent: 'American',  gender: 'Female',  emoji: '👩‍💼' },
  { id: 'cd_male',         label: 'Daniel',  desc: 'Steady Broadcaster',    accent: 'British',   gender: 'Male',    emoji: '👨‍💼' },
];

export default function RolePicker({
  characters,
  selectedRole,
  onSelectRole,
  selectedVoice,
  onSelectVoice,
  onStart,
  onBack,
}) {
  const internalVoice = selectedVoice || 'partner_male';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Role selection */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0A0A0A]">Pick Your Role</h2>
        <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">
          Select the character you'll be reading for
        </p>
      </div>

      {characters.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          No characters detected. Make sure your script uses the format{' '}
          <code className="bg-yellow-100 px-1 rounded">CHARACTER: dialogue</code>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {characters.map((name) => {
            const isSelected = selectedRole === name;
            return (
              <button
                key={name}
                onClick={() => onSelectRole(name)}
                className={`p-4 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#D4A85F] bg-[#D4A85F]/10 text-[#7A5A18] shadow-sm'
                    : 'border-[rgba(10,10,10,0.14)] bg-[#1E1E1E] text-[rgba(10,10,10,0.62)] hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className={`w-5 h-5 ${isSelected ? 'text-[#7A5A18]' : 'text-[rgba(10,10,10,0.4)]'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  {name}
                </div>
                {isSelected && (
                  <p className="text-[10px] mt-1 text-[#7A5A18] font-normal">Your role</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div className="mt-8 mb-6 border-t border-[rgba(10,10,10,0.08)]" />

      {/* AI Voice selection */}
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#0A0A0A] mb-1">Choose Your AI Scene Partner's Voice</h3>
        <p className="text-[rgba(10,10,10,0.62)] text-sm">
          This voice will read the other character's lines during practice and Live Study Mode.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {VOICES.map((v) => {
          const isSelected = internalVoice === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onSelectVoice && onSelectVoice(v.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#D4A85F] bg-[#D4A85F]/10 shadow-sm'
                  : 'border-[rgba(10,10,10,0.14)] bg-[#1E1E1E] hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{v.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${isSelected ? 'text-[#7A5A18]' : 'text-[#0A0A0A]'}`}>
                  {v.label}
                </div>
                <div className="text-xs text-[rgba(10,10,10,0.62)] truncate">{v.desc}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-[#F4F4EE] text-[10px] text-[rgba(10,10,10,0.62)]">{v.gender}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#F4F4EE] text-[10px] text-[rgba(10,10,10,0.62)]">{v.accent}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-3 text-sm font-semibold text-[rgba(10,10,10,0.62)] bg-[#F4F4EE] hover:bg-[#F4F4EE] rounded-lg transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onStart}
          disabled={!selectedRole}
          className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start Practice
        </button>
      </div>
    </div>
  );
}
