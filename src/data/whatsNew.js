/**
 * What's New changelog.
 *
 * Newest release FIRST. Each release has a monotonically increasing `id` — the
 * WhatsNewModal shows every release the user hasn't seen yet (id > their stored
 * "seen" id), then records the latest id. To ship a new release note, PREPEND a
 * new object with the next id; that's the only step.
 */
export const WHATS_NEW = [
  {
    // 1.0.12 was superseded in review by 1.0.13 (Tier 2+3 folded in) — this
    // entry is the combined release note users actually get.
    id: 3,
    version: '1.0.13',
    date: 'July 2026',
    title: 'A home screen that works for you',
    intro: "We rebuilt the way you move through the app — here's what's new:",
    highlights: [
      { emoji: '🎬', title: 'Tape Review, front and center', body: 'Your AI casting notes are now the first thing on Home — and your first review is free.' },
      { emoji: '📹', title: 'Record right in the app', body: 'Practice → Record a take — then send it straight to the AI for casting notes.' },
      { emoji: '⚖️', title: 'Compare Takes, easier to find', body: 'Filmed a few takes? The AI picks the winner — now one tap from Home, More, or right after a review.' },
      { emoji: '🎧', title: 'A more reliable scene partner', body: "The AI reader's voice now recovers automatically after calls and interruptions — plus a sample scene to try it instantly." },
      { emoji: '🧭', title: 'A cleaner, clearer app', body: 'Five labeled tabs, a calmer Home, live progress while your notes are written, and an honest practice streak.' },
    ],
  },
  {
    id: 2,
    version: '1.0.10',
    date: 'June 2026',
    title: 'A smoother Dr Self Tape',
    intro: "We tightened things up across the app — here's what's better:",
    highlights: [
      { emoji: '📞', title: 'Live scene reads that reach you', body: 'Scene-read calls now ring reliably, even when the app is fully closed.' },
      { emoji: '💳', title: 'More reliable subscriptions', body: 'Upgrades and Restore Purchases are steadier, with fewer silent hiccups.' },
      { emoji: '🎬', title: 'A faster first run', body: 'Getting started is quicker — your first free AI Tape Review is right up front.' },
      { emoji: '✨', title: 'Polish throughout', body: 'A livelier update screen plus dozens of fixes across the app.' },
    ],
  },
  {
    id: 1,
    version: '1.0.7',
    date: 'June 2026',
    title: 'Your sides. Your takes. Your notes.',
    intro: "A big one for actors — here's everything new:",
    highlights: [
      { emoji: '🎬', title: 'AI Tape Review', body: 'Upload a self-tape and get instant casting-grade notes on your performance, framing and eyeline.' },
      { emoji: '🏆', title: 'Compare your takes', body: 'Shot a few? Drop in 2–4 takes and Jericho ranks them — telling you which to submit, and why.' },
      { emoji: '📄', title: 'Bring your own sides', body: 'Upload a real Actors Access PDF and rehearse it with the AI reader — it reads the other part for you.' },
      { emoji: '🎙️', title: 'A reader that listens', body: 'The AI scene partner now waits for your beat instead of running on a timer.' },
      { emoji: '📞', title: 'Live scene reads', body: 'Get a FaceTime-style ring the moment a partner is ready to run lines.' },
      { emoji: '✨', title: 'A fresh notifications screen', body: 'Cleaner, grouped, and easier to act on — plus dozens of fixes.' },
    ],
  },
];
