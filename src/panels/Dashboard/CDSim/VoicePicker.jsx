import React from 'react';

const VOICES = [
  {
    key: 'classic_director',
    name: 'Classic Director',
    description: 'Old-school Hollywood. Firm but fair. Expects precision.',
  },
  {
    key: 'method_coach',
    name: 'The Method Coach',
    description: 'Deep emotional work. Will push you to find the truth.',
  },
  {
    key: 'commercial_queen',
    name: 'Commercial Queen',
    description: 'Upbeat energy. Knows exactly what the client wants.',
  },
  {
    key: 'the_auteur',
    name: 'The Auteur',
    description: 'Visionary filmmaker. Cares about subtext and nuance.',
  },
];

export default function VoicePicker({ selectedVoice, onSelect, onBack, onContinue }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Choose Your Casting Director</h2>
      <p className="text-[#999999] mb-8">
        Each director brings a unique perspective to your scene.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {VOICES.map((v) => (
          <button
            key={v.key}
            onClick={() => onSelect(v.key)}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              selectedVoice === v.key
                ? 'border-[#C855F0] bg-[#C855F0]/5 shadow-md'
                : 'border-[#3A3A3A] bg-[#1E1E1E] hover:border-[#C855F0]'
            }`}
          >
            <div className="font-bold text-lg text-white">{v.name}</div>
            <div className="text-sm text-[#999999] mt-2">{v.description}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-[#3A3A3A] text-[#999999] hover:bg-[#1E1E1E] font-medium"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedVoice}
          className="flex-1 px-6 py-3 rounded-xl bg-[#C855F0] text-white font-semibold hover:bg-[#A040C8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
