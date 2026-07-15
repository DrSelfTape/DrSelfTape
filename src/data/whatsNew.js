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
    id: 5,
    version: '1.0.16',
    date: 'July 2026',
    title: 'Meet Slate, your on-set assistant',
    intro: "Say hi to Slate, the little clapperboard in the corner. Tap it any time you need a hand:",
    highlights: [
      { emoji: '🎬', title: 'Ask Slate anything', body: 'Notes on a tape, which take to send, running lines, calming nerves. Slate points you to the right tool in a tap.' },
      { emoji: '🎙️', title: 'Talk or type', body: 'Hold to talk or just type. Slate answers like a coach who actually knows the work.' },
      { emoji: '🧠', title: 'Knows what you are working on', body: 'Slate sees your current auditions and scenes, so its help is specific to you, not generic.' },
      { emoji: '📎', title: 'Reads your sides', body: 'Attach a saved scene or upload a PDF right in the chat, and Slate gives you a quick read: the spine, the want, one strong choice, and one trap to avoid.' },
      { emoji: '💛', title: 'Remembers you', body: 'Pick up where you left off. Slate remembers what you worked on last time.' },
    ],
  },
  {
    id: 4,
    version: '1.0.14',
    date: 'July 2026',
    title: 'Sturdier in all the right places',
    intro: "This one's about reliability — the app should now just work, everywhere:",
    highlights: [
      { emoji: '🧭', title: 'Navigation that never dead-ends', body: 'Fixed the taps that sometimes went nowhere — profiles, notifications, and deep links all land where they should.' },
      { emoji: '📤', title: 'Uploads that stick', body: 'Picking a tape from your camera roll is now dependable, even on older iPhones.' },
      { emoji: '💾', title: 'Profile edits that save', body: 'Your changes save the first time, every time.' },
      { emoji: '💳', title: 'Smoother upgrades', body: 'Going Premium unlocks instantly after purchase — no more waiting or restarting.' },
      { emoji: '🎭', title: 'Green Room, complete', body: 'Long conversations with your scene partners now load in full.' },
      { emoji: '🔒', title: 'Tighter account security', body: 'Signing out fully clears your tapes from the device, and deleting your account now confirms it’s really you.' },
    ],
  },
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
      { emoji: '🗂️', title: 'Your notes, forever', body: "Tap any past review in My Growth to reread its casting notes — and if the app closes mid-analysis, it picks right back up." },
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
