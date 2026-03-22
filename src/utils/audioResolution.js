export const normalizeAudioUrl = (audioData) => {
  if (!audioData) return null;

  if (typeof audioData === 'string' && audioData.trim()) {
    return audioData.trim();
  }

  if (audioData?.audio_url && typeof audioData.audio_url === 'string' && audioData.audio_url.trim()) {
    return audioData.audio_url.trim();
  }

  return null;
};

export const extractToneValue = (tone, fallback = 'neutral') => {
  if (typeof tone === 'string' && tone.trim()) {
    return tone.trim().toLowerCase();
  }

  if (tone?.value && typeof tone.value === 'string') {
    return tone.value.trim().toLowerCase();
  }

  return fallback.toLowerCase();
};

export const resolveLineAudio = (line, tone, audioData = null) => {
  if (!line) return null;

  const toneValue = extractToneValue(tone);

  // Priority 1: Check audio_by_tone
  if (line.audio_by_tone && Object.keys(line.audio_by_tone).length > 0) {
    // Try exact match first
    let toneClip = line.audio_by_tone[toneValue];

    // Try case-insensitive match
    if (!toneClip) {
      const found = Object.entries(line.audio_by_tone).find(
        ([key]) => key.toLowerCase() === toneValue
      );
      toneClip = found?.[1];
    }

    if (toneClip) {
      const url = normalizeAudioUrl(toneClip);
      if (url) return url;
    }

    // Fallback: Try neutral tone
    const neutralClip = line.audio_by_tone.neutral || line.audio_by_tone.Neutral;
    if (neutralClip) {
      const url = normalizeAudioUrl(neutralClip);
      if (url) return url;
    }

    // Fallback: Get first available audio
    for (const [, value] of Object.entries(line.audio_by_tone)) {
      const url = normalizeAudioUrl(value);
      if (url) return url;
    }
  }

  // Priority 2: Check baseAudio
  if (line.baseAudio) {
    const url = normalizeAudioUrl(line.baseAudio);
    if (url) return url;
  }

  // Priority 3: Check audioData.clips (if provided)
  if (audioData?.clips?.length && line.lineId) {
    const clipsArray = audioData.clips || audioData.data?.clips || [];

    const lineClips = clipsArray.filter(
      (clip) =>
        clip.line_id === line.lineId &&
        clip.status === 'completed' &&
        clip.audio_url &&
        clip.audio_url.trim()
    );

    if (lineClips.length > 0) {
      // Try matching tone first
      if (toneValue) {
        const matchingClip = lineClips.find(
          (clip) => clip.tone && clip.tone.toLowerCase() === toneValue
        );
        if (matchingClip?.audio_url) {
          return matchingClip.audio_url.trim();
        }
      }

      // Return first available clip
      return lineClips[0].audio_url.trim();
    }
  }

  return null;
};

