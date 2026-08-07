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
    // Separate entry rather than edited into id 9, because anyone who has
    // already seen 9 would never be shown an edit to it. Version stays 1.0.25:
    // that IS the marketing version of the build carrying this.
    id: 10,
    version: '1.0.25',
    date: 'August 2026',
    title: 'Be seen without a headshot',
    intro: 'Match only deals cards that have a picture on them, so a lot of you were not being shown to anyone. Two ways to fix that now:',
    highlights: [
      { emoji: '🖼️', title: 'Add a photo in seconds', body: 'The prompt is right on your home screen if you need it, and we will tell you if the shot is too dark or too small to read on a card.' },
      { emoji: '🎭', title: 'Or pick an illustrated avatar', body: "Would rather not put your face on a swipe card? Choose one of fourteen drawings instead. It's clearly a drawing, so nobody is misled about who they matched with, and you still show up in decks." },
      { emoji: '🔁', title: 'Change your mind any time', body: 'Profile now has a "How you appear in Match" card. Switch between your photo and your avatar whenever you like. Switching never deletes the photo you uploaded.' },
      { emoji: '🔢', title: 'Honest reader counts', body: 'Every number about how many readers are around now comes from the same place the deck does, so what you see is what you get.' },
    ],
  },
  {
    id: 9,
    version: '1.0.25',
    date: 'August 2026',
    title: 'Nothing gets lost',
    intro: 'A quieter release than the last one. Mostly it fixes things that were costing you:',
    highlights: [
      { emoji: '🎭', title: 'The reader stops talking over you', body: 'When a scene had an interruption, your line could vanish and the reader would say it in the wrong voice. It also read the stage directions out loud and waited for you to say them back. Both fixed.' },
      { emoji: '🎯', title: 'Your notes wait for you', body: 'Finish a review, put your phone down for an hour, come back — your notes are still there. They used to disappear if you left for too long.' },
      { emoji: '🧾', title: 'Never charged twice', body: 'If a review failed to send and you tried again, that second try could cost you another token. It doesn\'t anymore.' },
      { emoji: '🔕', title: 'Reminders are optional', body: 'Turn off audition reminders in your profile. Alerts about your own tapes and messages keep working.' },
      { emoji: '📱', title: 'One reminder, not three', body: 'Some of you were getting the same nudge two or three times. Fixed.' },
      { emoji: '📈', title: 'Watch your score climb', body: 'Scene Coach and your score history are now in the app, so you can see whether the work is actually moving the line.' },
      { emoji: '🤝', title: 'Match keeps up with you', body: "The next reader comes up the moment you swipe instead of waiting on the network. The reader count is honest now too: it only counts people who've actually opened the app this month." },
    ],
  },
  {
    id: 8,
    version: '1.0.24',
    date: 'July 2026',
    title: 'Your phone rings. Your score reveals.',
    intro: 'The biggest update since launch — real calls, bigger moments, easier tools:',
    highlights: [
      { emoji: '📞', title: 'Scene reads ring like real calls', body: 'When a partner calls you for a live read, your phone rings like FaceTime — even locked, even with the app closed. Hang up, decline, and missed calls all work the way you expect.' },
      { emoji: '🎭', title: 'The reveal', body: 'Your Tape Review score now builds up on screen before the notes open, so the verdict lands like a callback, not a spreadsheet.' },
      { emoji: '🎬', title: 'Your takes, on Home', body: 'Home now shows where your latest tape stands the moment you open the app: notes ready, review in progress, or your next step.' },
      { emoji: '🧑‍🤝‍🧑', title: 'One Readers page', body: 'Browse scene partners and see who wants to read with you in one place, with honest live counts.' },
      { emoji: '🔊', title: 'The reader speaks up', body: 'Fixed a bug where the AI reader could go quiet after listening to your lines. It answers at full volume now.' },
    ],
  },
  {
    id: 7,
    version: '1.0.19',
    date: 'July 2026',
    title: 'Your first review, faster',
    intro: 'This round is all about getting eyes on your work sooner:',
    highlights: [
      { emoji: '🎬', title: 'A practice scene, on us', body: "New here and no tape handy? Record our 30-second practice scene and get real casting notes on it. We give you the lines." },
      { emoji: '📷', title: 'Smoother first recording', body: 'A quick heads-up screen before the camera asks for permission, so you know exactly what to tap.' },
      { emoji: '⭐', title: 'Tape Review front and center', body: 'Your first review is now the top item on the getting-started list, and the share card links to the right place.' },
    ],
  },
  {
    id: 6,
    version: '1.0.17',
    date: 'July 2026',
    title: 'You stay signed in now',
    intro: "One big quality-of-life fix this round:",
    highlights: [
      { emoji: '🔐', title: 'No more surprise sign-outs', body: 'The app used to quietly end your session after an hour and bounce you back to the login screen. Fixed. Sign in once and you stay signed in.' },
    ],
  },
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
    intro: "This one's about reliability. The app should now just work, everywhere:",
    highlights: [
      { emoji: '🧭', title: 'Navigation that never dead-ends', body: 'Fixed the taps that sometimes went nowhere: profiles, notifications, and deep links all land where they should.' },
      { emoji: '📤', title: 'Uploads that stick', body: 'Picking a tape from your camera roll is now dependable, even on older iPhones.' },
      { emoji: '💾', title: 'Profile edits that save', body: 'Your changes save the first time, every time.' },
      { emoji: '💳', title: 'Smoother upgrades', body: 'Going Premium kicks in instantly after purchase. No more waiting or restarting.' },
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
    intro: "We rebuilt the way you move through the app. Here's what's new:",
    highlights: [
      { emoji: '🎬', title: 'Tape Review, front and center', body: 'Your AI casting notes are now the first thing on Home, and your first review is free.' },
      { emoji: '📹', title: 'Record right in the app', body: 'Practice → Record a take, then send it straight to the AI for casting notes.' },
      { emoji: '⚖️', title: 'Compare Takes, easier to find', body: 'Filmed a few takes? The AI picks the winner. Now one tap from Home, More, or right after a review.' },
      { emoji: '🎧', title: 'A more reliable scene partner', body: "The AI reader's voice now recovers automatically after calls and interruptions, plus a sample scene to try it instantly." },
      { emoji: '🗂️', title: 'Your notes, forever', body: "Tap any past review in My Growth to reread its casting notes. If the app closes mid-analysis, it picks right back up." },
      { emoji: '🧭', title: 'A cleaner, clearer app', body: 'Five labeled tabs, a calmer Home, live progress while your notes are written, and an honest practice streak.' },
    ],
  },
  {
    id: 2,
    version: '1.0.10',
    date: 'June 2026',
    title: 'A smoother Dr Self Tape',
    intro: "We tightened things up across the app. Here's what's better:",
    highlights: [
      { emoji: '📞', title: 'Live scene reads that reach you', body: 'Scene-read calls now ring reliably, even when the app is fully closed.' },
      { emoji: '💳', title: 'More reliable subscriptions', body: 'Upgrades and Restore Purchases are steadier, with fewer silent hiccups.' },
      { emoji: '🎬', title: 'A faster first run', body: 'Getting started is quicker: your first free AI Tape Review is right up front.' },
      { emoji: '✨', title: 'Polish throughout', body: 'A livelier update screen plus dozens of fixes across the app.' },
    ],
  },
  {
    id: 1,
    version: '1.0.7',
    date: 'June 2026',
    title: 'Your sides. Your takes. Your notes.',
    intro: "A big one for actors. Here's everything new:",
    highlights: [
      { emoji: '🎬', title: 'AI Tape Review', body: 'Upload a self-tape and get instant casting-grade notes on your performance, framing and eyeline.' },
      { emoji: '🏆', title: 'Compare your takes', body: 'Shot a few? Drop in 2-4 takes and Jericho ranks them: which to submit, and why.' },
      { emoji: '📄', title: 'Bring your own sides', body: 'Upload a real Actors Access PDF and rehearse it with the AI reader. It reads the other part for you.' },
      { emoji: '🎙️', title: 'A reader that listens', body: 'The AI scene partner now waits for your beat instead of running on a timer.' },
      { emoji: '📞', title: 'Live scene reads', body: 'Get a FaceTime-style ring the moment a partner is ready to run lines.' },
      { emoji: '✨', title: 'A fresh notifications screen', body: 'Cleaner, grouped, and easier to act on, plus dozens of fixes.' },
    ],
  },
];
