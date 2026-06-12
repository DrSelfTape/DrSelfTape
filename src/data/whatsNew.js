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
