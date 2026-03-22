import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../redux/http';
import endPoints from '../../../redux/constant';

const GENRES = ['Drama', 'Comedy', 'Thriller', 'Romance', 'Horror', 'Sci-Fi'];
const CHARACTERS = ['The Hero', 'The Villain', 'The Lover', 'The Rebel', 'The Mentor', 'The Comic Relief'];
const TONES = ['Intense', 'Heartbreaking', 'Funny', 'Mysterious', 'Hopeful', 'Angry'];

const LOADING_MESSAGES = [
  'Writing your scene...',
  'Crafting the dialogue...',
  'Adding dramatic tension...',
  'Almost there...',
];

function PillGroup({ label, options, selected, onSelect }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5 flex flex-col gap-3">
      <h3 className="text-white font-semibold text-sm tracking-wide uppercase">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              selected === opt
                ? 'bg-[#C855F0] text-white shadow-lg shadow-[#C855F0]/30'
                : 'bg-[#0f0f23] text-[#666666] border border-[#2a2a4a] hover:border-[#C855F0]/50 hover:text-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScriptDisplay({ script, onLaunch, onCopy, copied }) {
  const lines = script.split('\n');

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-[#C855F0]/10 to-transparent border-b border-[#2a2a4a] px-6 py-4">
        <h3 className="text-white font-semibold text-lg">Your Generated Scene</h3>
        <p className="text-[#999999] text-sm mt-1">Ready to perform</p>
      </div>

      <div className="p-6 font-mono text-sm leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          // Scene headers like FADE IN, INT., EXT.
          if (/^(FADE IN|FADE OUT|INT\.|EXT\.|CUT TO|SMASH CUT|END SCENE)/i.test(trimmed)) {
            return <p key={i} className="text-[#C855F0] font-bold uppercase my-3">{trimmed}</p>;
          }
          // Character names (ALL CAPS lines that aren't stage directions)
          if (trimmed === trimmed.toUpperCase() && trimmed.length > 1 && /^[A-Z\s]+$/.test(trimmed)) {
            return <p key={i} className="text-[#5eead4] font-bold mt-4 mb-1">{trimmed}</p>;
          }
          // Stage directions in parentheses
          if (/^\(.*\)$/.test(trimmed)) {
            return <p key={i} className="text-[#999999] italic ml-8">{trimmed}</p>;
          }
          // Empty lines
          if (!trimmed) {
            return <div key={i} className="h-2" />;
          }
          // Regular dialogue / description
          return <p key={i} className="text-gray-300 ml-4">{trimmed}</p>;
        })}
      </div>

      <div className="border-t border-[#2a2a4a] px-6 py-4 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onLaunch}
          className="flex-1 bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#C855F0]/30 cursor-pointer text-center"
        >
          Launch in CD Sim
        </button>
        <button
          onClick={onCopy}
          className="flex-1 bg-[#0f0f23] border border-[#2a2a4a] hover:border-[#C855F0]/50 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer text-center"
        >
          {copied ? 'Copied!' : 'Copy Script'}
        </button>
      </div>
    </div>
  );
}

export default function AuditionGenerator() {
  const navigate = useNavigate();
  const [genre, setGenre] = useState('Drama');
  const [character, setCharacter] = useState('The Hero');
  const [tone, setTone] = useState('Intense');
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [script, setScript] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  // Cycle loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setScript('');
    setLoadingMsgIndex(0);

    try {
      const prompt = `Write a 1-page dramatic audition scene for a ${character} character in a ${genre} ${tone} scene. Format it as a proper screenplay with FADE IN, character names in CAPS, dialogue, and stage directions. Include 2 characters. Make it emotionally compelling and performance-rich. The main character should have 6-8 lines.`;

      const { data } = await axiosInstance.post(endPoints.cdFeedback, {
        line: prompt,
        type: 'scene_gen',
        character: character,
        script_context: `${genre} ${tone}`,
      });

      setScript(data?.data?.feedback || data?.feedback || 'No scene was generated. Please try again.');
    } catch (err) {
      setError('Failed to generate scene. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll to result when script arrives
  useEffect(() => {
    if (script && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [script]);

  const handleLaunchCDSim = () => {
    sessionStorage.setItem(
      'preloadedScript',
      JSON.stringify({ scriptContent: script })
    );
    navigate('/dashboard/cd-sim');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] rounded-2xl p-8 border border-[#2a2a4a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,107,53,0.08),_transparent_60%)]" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Instant Audition Generator
          </h1>
          <p className="text-[#666666] mt-2 text-lg">
            Powered by AI — get a custom scene in seconds
          </p>
        </div>
      </div>

      {/* Input Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PillGroup label="Genre" options={GENRES} selected={genre} onSelect={setGenre} />
        <PillGroup label="Character Type" options={CHARACTERS} selected={character} onSelect={setCharacter} />
        <PillGroup label="Emotional Tone" options={TONES} selected={tone} onSelect={setTone} />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-300 cursor-pointer ${
          loading
            ? 'bg-[#C855F0]/60 text-white/80 cursor-wait'
            : 'bg-[#C855F0] text-white hover:bg-[#A040C8] hover:shadow-xl hover:shadow-[#C855F0]/25 active:scale-[0.99]'
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span key={loadingMsgIndex} className="animate-pulse">
              {LOADING_MESSAGES[loadingMsgIndex]}
            </span>
          </span>
        ) : (
          'Generate My Scene \u2192'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/50 text-red-400 rounded-xl px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {script && (
        <div ref={resultRef}>
          <ScriptDisplay
            script={script}
            onLaunch={handleLaunchCDSim}
            onCopy={handleCopy}
            copied={copied}
          />
        </div>
      )}
    </div>
  );
}
