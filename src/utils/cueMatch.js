/**
 * Cue endpointing for the listening AI reader. The actor's expected line is
 * KNOWN from the script, so we listen for them to reach the line's END — not a
 * silence timer (which steps on dramatic pauses).
 * See docs/ai-reader-listening-architecture.md.
 */

// Strip apostrophes FIRST so contractions collapse to one token that matches
// whatever the recognizer returns: "what'd"/"whatd"/"what" all compare cleanly.
// Then non-word chars → spaces.
export const norm = (s) => (s || '')
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^\w\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
export const tok = (s) => norm(s).split(' ').filter(Boolean);

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export const ratio = (a, b) => (!a && !b) ? 1 : 1 - lev(a, b) / Math.max(a.length, b.length, 1);

/** Fuzzy token equality (tolerant of small recognition errors). */
const eq = (a, b) => ratio(a, b) >= 0.7;

/**
 * Fuzzy Longest-Common-Subsequence length — how much of the line was spoken IN
 * ORDER, allowing skips on BOTH sides. Unlike a strict walk it never gets stuck
 * on one mis-heard word (the bug where "What'd" → "what" froze the whole scene).
 */
export function coverage(expectedToks, transToks) {
  const m = expectedToks.length, n = transToks.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = eq(expectedToks[i - 1], transToks[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

// Trailing tokens that aren't a reliable end-of-line cue — laughter + fillers.
const SKIP_TAIL = /^(ha|haha|hahaha|hah|heh|hehe|hehehe|lol|um|uh|uhh|ah|ahh|eh|mm|hm|hmm|er|oh)$/;

/** Index of the line's last meaningful word (skipping trailing laughter). */
export function anchorIndex(toks) {
  for (let i = toks.length - 1; i >= 0; i--) {
    if (!SKIP_TAIL.test(toks[i])) return i;
  }
  return toks.length - 1;
}

/** Does `phrase` appear as a fuzzy in-order subsequence inside `window`? */
function subseqMatch(phrase, window) {
  let i = 0;
  for (const w of window) {
    if (i < phrase.length && eq(w, phrase[i])) i++;
  }
  return phrase.length > 0 && i >= phrase.length;
}

/**
 * Progress of a live transcript against a KNOWN expected line.
 *  - anchorReached → the line's ENDING PHRASE (its last ~3 meaningful words) was
 *    just heard at the tail of the transcript → they're done → fire the reader.
 *    Robust to mis-heard middle words and trailing laughter.
 *  - complete / nearDone → fuzzy-LCS coverage of the whole line (deadlock backup).
 */
export function cueProgress(expected, transcript) {
  const et = tok(expected);
  const tt = tok(transcript);
  const covered = coverage(et, tt);
  const aIdx = anchorIndex(et);
  const endPhrase = et.slice(Math.max(0, aIdx - 2), aIdx + 1); // last ≤3 meaningful words
  const win = tt.slice(-(endPhrase.length + 4));               // recent tail only
  return {
    covered,
    total: et.length,
    complete: et.length > 0 && covered >= et.length,
    nearDone: et.length > 0 && covered >= et.length - 1,
    anchorReached: subseqMatch(endPhrase, win),
  };
}
