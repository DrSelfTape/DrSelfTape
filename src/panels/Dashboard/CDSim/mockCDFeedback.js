/**
 * Mock CD (Casting Director) feedback system.
 * All arrays contain realistic casting director notes.
 *
 * TODO: Replace with real OpenAI API integration when launching.
 */

const lineDeliveryNotes = [
  'Good instinct. Do it again, but pull back 20%.',
  'You are indicating. Trust the words — let them do the work.',
  'I love the energy. Can you find stillness inside it?',
  'Make a stronger choice. What does this character want right now?',
  'That felt real. Keep that.',
  'Too big for camera. Bring it in — we are on a close-up.',
  'Nice. Now try it like you already know the answer.',
  'The pause before that line was perfect. Own it.',
  'I need to believe it more. Where is this coming from for you?',
  'Great read. One more time — surprise me.',
  'Lose the result. Play the action, not the emotion.',
  'You rushed that. Breathe. Let it land.',
];

const redirectNotes = [
  'Try it softer. Almost a whisper.',
  'Now go the opposite direction — bigger, more desperate.',
  'Play it like you have a secret.',
  'What if you are about to cry but refusing to?',
  'Try it with pure anger underneath.',
  'Play the love, not the conflict.',
];

const sessionWrapNotes = [
  'Strong work today. You showed real range.',
  'Solid session. Focus on specificity next time.',
  'Good instincts throughout. Trust yourself more.',
  'You found some great moments. Keep exploring.',
];

let lastLineIdx = -1;
let lastRedirectIdx = -1;

/**
 * Get a random note by type, avoiding immediate repeats.
 * @param {'line' | 'redirect' | 'wrap'} type
 * @returns {string}
 */
export function getRandomNote(type) {
  let pool;
  let lastIdx;

  switch (type) {
    case 'redirect':
      pool = redirectNotes;
      lastIdx = lastRedirectIdx;
      break;
    case 'wrap':
      pool = sessionWrapNotes;
      return pool[Math.floor(Math.random() * pool.length)];
    case 'line':
    default:
      pool = lineDeliveryNotes;
      lastIdx = lastLineIdx;
      break;
  }

  let idx;
  do {
    idx = Math.floor(Math.random() * pool.length);
  } while (idx === lastIdx && pool.length > 1);

  if (type === 'redirect') lastRedirectIdx = idx;
  else lastLineIdx = idx;

  return pool[idx];
}

export { lineDeliveryNotes, redirectNotes, sessionWrapNotes };
