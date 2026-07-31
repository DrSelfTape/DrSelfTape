// Honest activity + context signals for reader cards. Everything here maps
// 1:1 to real payload fields — no invented urgency (see the fake-gamification
// audit): a label renders only when the data supports it.

/** 'Online now' | 'Active today' | 'Active this week' | null (older = silence) */
export function lastSeenLabel(lastSeen) {
  if (!lastSeen) return null;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return null;
  const mins = (Date.now() - t) / 60000;
  if (mins < 0) return null;
  if (mins <= 10) return 'Online now';
  if (mins <= 60 * 24) return 'Active today';
  if (mins <= 60 * 24 * 7) return 'Active this week';
  return null;
}

/** Trimmed "what they're prepping" line, or null. */
export function workingOnLabel(workingOn) {
  const w = String(workingOn || '').trim();
  return w ? w : null;
}
