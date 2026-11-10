// What the tokens buy, by plan. Per-take full notes are stripped server-side
// for non-subscribers, so only a known subscriber is promised them; while the
// plan is unknown the line promises nothing.
export function compareNotesPromise(notesLocked, paidKnown) {
  if (notesLocked) return ' · you get the winner, the ranking and a highlight per take. Full notes on each take need a plan.';
  if (paidKnown) return ' · each take gets full notes too';
  return '';
}
