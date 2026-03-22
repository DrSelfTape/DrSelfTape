/**
 * Format seconds into MM:SS format
 * @param {number} secs - Seconds to format
 * @returns {string} Formatted duration string (MM:SS)
 */
export const formatDuration = (secs) => {
  const s = Math.max(0, Math.floor(secs || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

