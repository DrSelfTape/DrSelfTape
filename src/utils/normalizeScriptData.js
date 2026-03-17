import { normalizeAudioUrl } from './audioResolution';

export const normalizeScriptLine = (line, audioClips = []) => {
  if (!line) return null;

  const normalized = {
    lineId: line.id || line.lineId,
    character: typeof line.character === 'string'
      ? line.character
      : (line.character?.name || 'Character'),
    line: line.text || line.line || '',
    audio_by_tone: {},
    baseAudio: null,
  };

  // Normalize audio_by_tone from line data (if already present)
  if (line.audio_by_tone && typeof line.audio_by_tone === 'object') {
    Object.entries(line.audio_by_tone).forEach(([tone, audio]) => {
      const url = normalizeAudioUrl(audio);
      if (url) {
        normalized.audio_by_tone[tone] = url;
      }
    });
  }

  // Build audio_by_tone from clips if not present or empty
  if (audioClips.length > 0 && Object.keys(normalized.audio_by_tone).length === 0) {
    const lineClips = audioClips.filter(
      (clip) =>
        (clip.line_id === normalized.lineId || clip.lineId === normalized.lineId) &&
        clip.status === 'completed' &&
        clip.audio_url &&
        clip.audio_url.trim()
    );

    lineClips.forEach((clip) => {
      if (clip.tone && clip.audio_url) {
        normalized.audio_by_tone[clip.tone] = clip.audio_url.trim();
      }
    });
  }

  // Set baseAudio (prefer neutral, then first available)
  normalized.baseAudio = normalized.audio_by_tone.neutral ||
    normalized.audio_by_tone[Object.keys(normalized.audio_by_tone)[0]] ||
    line.baseAudio ||
    line.audio_url ||
    null;

  // Normalize baseAudio if it's an object
  if (normalized.baseAudio && typeof normalized.baseAudio === 'object') {
    normalized.baseAudio = normalizeAudioUrl(normalized.baseAudio);
  }

  return normalized;
};

export const normalizeScriptLines = (lines = [], audioClips = []) => {
  if (!Array.isArray(lines)) return [];

  return lines
    .map((line) => normalizeScriptLine(line, audioClips))
    .filter((line) => line !== null);
};

export const extractAudioClips = (audioData) => {
  if (!audioData) return [];

  // Handle different API response formats
  if (Array.isArray(audioData.clips)) {
    return audioData.clips;
  }

  if (audioData.data && Array.isArray(audioData.data.clips)) {
    return audioData.data.clips;
  }

  return [];
};

