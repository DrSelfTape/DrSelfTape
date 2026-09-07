// Presentation helpers accept only the review the caller is allowed to show.
// No localStorage, actor-memory estimates, or reconstruction of gated fields.
export const PERFORMANCE_FIELDS = [
  ['emotional_arc', 'Emotional arc'], ['strongest_beat', 'Strongest beat'],
  ['choices', 'The choice'], ['listening_presence', 'Listening & presence'],
  ['truth_vs_indicated', 'Truth vs. indicated'],
];

export function scoreValue(value, max = 10) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
}

export function noteText(value) {
  if (typeof value === 'string') return value;
  return value?.detail || value?.note || '';
}

export function reviewMoments(review, duration) {
  const notes = [
    review.verdict,
    ...(Array.isArray(review.whats_working) ? review.whats_working.map(noteText) : []),
    ...PERFORMANCE_FIELDS.map(([key]) => review.performance?.[key]),
    ...(Array.isArray(review.adjustments) ? review.adjustments.map(noteText) : []),
    review.the_one_thing,
  ].filter(value => typeof value === 'string');
  const seen = new Set();
  return notes.flatMap(text => [...text.matchAll(/\b(\d{1,3}):([0-5]\d)\b/g)].flatMap(match => {
    const seconds = Number(match[1]) * 60 + Number(match[2]);
    const key = `${seconds}:${text}`;
    if (seen.has(key) || (Number.isFinite(duration) && seconds > duration)) return [];
    seen.add(key);
    return [{ seconds, stamp: `${Number(match[1])}:${match[2]}`, text }];
  })).sort((a, b) => a.seconds - b.seconds);
}

export function seekToMoment(video, seconds) {
  if (!video || !Number.isFinite(video.duration) || seconds < 0 || seconds > video.duration) return false;
  video.currentTime = seconds;
  // Seek only: pressing a note should never unexpectedly start sound.
  return true;
}
