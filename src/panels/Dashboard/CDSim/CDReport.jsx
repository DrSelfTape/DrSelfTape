import { useRef, useState } from 'react';
import { Volume2, Download, RotateCcw, Square, Loader2 } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

const SECTIONS = [
  { key: 'interpretation', label: 'Scene Interpretation & Tone' },
  { key: 'performance', label: 'Performance Direction' },
  { key: 'wardrobe', label: 'Wardrobe Recommendations' },
  { key: 'lighting', label: 'Lighting Recommendations' },
  { key: 'framing', label: 'Framing & Camera Recommendations' },
];

// Map voice picker names to backend voice keys
const VOICE_KEY_MAP = {
  'Classic Director': 'cd_male',
  'The Method Coach': 'cd_male',
  'Commercial Queen': 'cd_female',
  'The Auteur': 'cd_male',
};

function sectionToText(label, data) {
  if (!data || typeof data !== 'object') return '';
  const lines = [`${label}:`];
  Object.entries(data).forEach(([k, v]) => {
    if (v) {
      const key = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`${key}: ${v}`);
    }
  });
  return lines.join('. ');
}

function SectionCard({ label, data, voiceKey, isPlayingKey, onPlayToggle, playingSection }) {
  const isLoading = isPlayingKey === label && playingSection === 'loading';
  const isPlaying = isPlayingKey === label && playingSection === 'playing';

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-serif text-xl font-bold text-white">{label}</h3>
        <button
          onClick={() => onPlayToggle(label, data)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-sm font-medium shrink-0 ml-4 transition-colors disabled:opacity-50"
          style={{ color: isPlaying ? '#E88BF5' : '#C855F0' }}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isPlaying ? (
            <Square size={16} fill="currentColor" />
          ) : (
            <Volume2 size={16} />
          )}
          {isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Listen'}
        </button>
      </div>

      {data && typeof data === 'object' && (
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => {
            if (!value) return null;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-1">
                  {label}
                </p>
                <p className="text-[#999999] text-sm leading-relaxed">{value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CDReport({ report, onRunAgain, selectedVoice }) {
  const audioRef = useRef(null);
  const [playingSection, setPlayingSection] = useState(null); // null | 'loading' | 'playing'
  const [playingLabel, setPlayingLabel] = useState(null);

  const voiceKey = VOICE_KEY_MAP[selectedVoice] || 'cd_female';

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayingSection(null);
    setPlayingLabel(null);
  };

  const handlePlayToggle = async (label, data) => {
    // Stop if already playing this section
    if (playingLabel === label) {
      stopAudio();
      return;
    }

    // Stop any current audio
    stopAudio();

    const text = sectionToText(label, data);
    if (!text) return;

    setPlayingLabel(label);
    setPlayingSection('loading');

    try {
      const response = await axios.post(
        `${baseURL}/v1/ai/tts/`,
        { text, voice: voiceKey },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setPlayingSection('playing');
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingSection(null);
        setPlayingLabel(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlayingSection(null);
        setPlayingLabel(null);
      };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setPlayingSection(null);
      setPlayingLabel(null);
    }
  };

  const handleListenAll = async () => {
    if (playingLabel === 'ALL') {
      stopAudio();
      return;
    }

    stopAudio();

    // Concatenate all sections into one text
    const fullText = SECTIONS.map((s) =>
      sectionToText(s.label, report?.[s.key])
    ).filter(Boolean).join('. ');

    if (!fullText) return;

    setPlayingLabel('ALL');
    setPlayingSection('loading');

    try {
      const response = await axios.post(
        `${baseURL}/v1/ai/tts/`,
        { text: fullText, voice: voiceKey },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setPlayingSection('playing');
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingSection(null);
        setPlayingLabel(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlayingSection(null);
        setPlayingLabel(null);
      };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setPlayingSection(null);
      setPlayingLabel(null);
    }
  };

  const isAllLoading = playingLabel === 'ALL' && playingSection === 'loading';
  const isAllPlaying = playingLabel === 'ALL' && playingSection === 'playing';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">
            Your CD Direction Report
          </h2>
          <p className="text-[#999999] mt-1 text-sm">
            AI-generated direction based on your scene and role.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Listen to full report */}
          <button
            onClick={handleListenAll}
            disabled={isAllLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: isAllPlaying
                ? 'linear-gradient(135deg,#9B30FF,#C855F0)'
                : 'linear-gradient(135deg,#C855F0,#E88BF5)',
              boxShadow: '0 4px 15px rgba(200,85,240,0.35)',
            }}
          >
            {isAllLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isAllPlaying ? (
              <Square size={16} fill="white" />
            ) : (
              <Volume2 size={16} />
            )}
            {isAllLoading ? 'Preparing...' : isAllPlaying ? 'Stop Reading' : 'Listen to Full Report'}
          </button>

          <button
            onClick={onRunAgain}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#3A3A3A] text-[#999999] hover:bg-[#1E1E1E] font-medium text-sm transition-colors"
          >
            <RotateCcw size={16} />
            Run Again
          </button>
        </div>
      </div>

      {/* Section cards */}
      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <SectionCard
            key={section.key}
            label={section.label}
            data={report?.[section.key]}
            voiceKey={voiceKey}
            isPlayingKey={playingLabel}
            playingSection={playingSection}
            onPlayToggle={handlePlayToggle}
          />
        ))}
      </div>
    </div>
  );
}
