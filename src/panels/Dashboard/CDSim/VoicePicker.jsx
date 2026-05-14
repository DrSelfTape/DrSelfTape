import React from 'react';

const VOICES = [
  {
    key: 'classic_director',
    name: 'The Traditionalist',
    description: 'Technique-driven. Focuses on craft, precision, and hitting your marks.',
  },
  {
    key: 'method_coach',
    name: 'The Method Coach',
    description: 'Deep emotional work. Will push you to find the truth in every line.',
  },
  {
    key: 'commercial_queen',
    name: 'The Commercial Pro',
    description: 'Upbeat energy. Knows how to land the booking and deliver for clients.',
  },
  {
    key: 'the_auteur',
    name: 'The Artistic Eye',
    description: 'All about subtext, nuance, and finding the layers in your performance.',
  },
];

export default function VoicePicker({ selectedVoice, onSelect, onBack, onContinue }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">Choose Your Coach</h2>
      <p className="text-[rgba(10,10,10,0.62)] mb-8">
        Each coach brings a different approach to breaking down your scene.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {VOICES.map((v) => (
          <button
            key={v.key}
            onClick={() => onSelect(v.key)}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              selectedVoice === v.key
                ? 'border-[#D4A85F] bg-[#D4A85F]/5 shadow-md'
                : 'border-[rgba(10,10,10,0.14)] bg-[#1E1E1E] hover:border-[#D4A85F]'
            }`}
          >
            <div className="font-bold text-lg text-[#0A0A0A]">{v.name}</div>
            <div className="text-sm text-[rgba(10,10,10,0.62)] mt-2">{v.description}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-[rgba(10,10,10,0.14)] text-[rgba(10,10,10,0.62)] hover:bg-[#1E1E1E] font-medium"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedVoice}
          className="flex-1 px-6 py-3 rounded-xl bg-[#D4A85F] text-[#0A0A0A] font-semibold hover:bg-[#C09850] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
