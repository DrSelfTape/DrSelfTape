/**
 * Regression tests for the script/cast parser.
 *
 * Every case here is taken from REAL production rows in the `scripts` table on
 * 2026-09-30, after Scene Study and the acting coach started producing wrong or
 * empty role pickers on the phone.
 *
 * Cause: there were TWO parsers. src/utils/scriptParse.js carried documented
 * fixes (slug/transition guards, the flattened-sides fallback, the tight
 * interruption case), while src/utils/scriptParser.js was the pre-fix version
 * from May — and MobileApp.jsx, the one place sides are actually uploaded, was
 * the only importer of the old one. So every fix shipped to desktop and none of
 * it ever reached the phone. 22 of 51 stored scripts had an empty cast; others
 * had scene headings and camera transitions stored as characters.
 *
 * The fork is deleted. These tests exist so it cannot come back quietly.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseScript, extractCharacters, parseInlineCharacters, spokenText} from '../src/utils/scriptParse.js';

test('scene headings never become characters (prod ids 107, 108, 110)', () => {
  // id=107 stored: ["INT.GRAND HIGHLANDER - DAY","PRIYA","EXT.HOTEL CAR PARK - DAY"]
  const sides = [
    'INT.GRAND HIGHLANDER - DAY',
    '',
    'PRIYA',
    'I told you I would drive.',
    '',
    'EXT.HOTEL CAR PARK - DAY',
    '',
    'MARCUS',
    'And I told you I would be late.',
  ].join('\n');

  const cast = extractCharacters(parseScript(sides));
  assert.deepEqual(cast, ['PRIYA', 'MARCUS']);
  for (const slug of cast) assert.ok(!/^(INT|EXT)\./.test(slug), `slug leaked into cast: ${slug}`);
});

test('camera transitions never become characters (prod id 109)', () => {
  // id=109 stored: ["LENNY","MUSIC OVER","TRACI","MATCH CUT TO","PETE","CHAD"]
  const sides = [
    'MUSIC OVER',
    '',
    'LENNY',
    'You said eight.',
    '',
    'MATCH CUT TO',
    '',
    'TRACI',
    'I said around eight.',
    '',
    'SMASH CUT TO',
    '',
    'PETE',
    'Nobody says around.',
  ].join('\n');

  const cast = extractCharacters(parseScript(sides));
  assert.deepEqual(cast, ['LENNY', 'TRACI', 'PETE']);
  for (const bad of ['MUSIC OVER', 'MATCH CUT TO', 'SMASH CUT TO']) {
    assert.ok(!cast.includes(bad), `transition leaked into cast: ${bad}`);
  }
});

test('KNOWN LIMITATION: a non-script document still yields a junk cast (prod id 97)', () => {
  // id=97 was a retail PDF and stored: ["COLLECTION","CLICK HERE","BACK OF LEGS","TUTU TIES"].
  // This is NOT fixed, deliberately. A cue is "short, ALL-CAPS, followed by
  // prose, not a slug or transition" — and marketing copy satisfies that just as
  // well as a screenplay does. The only robust discriminator is to require that
  // a cue RECUR, which would drop legitimate single-line roles (WAITER, GUARD,
  // RECEPTIONIST) that appear constantly in real sides. Losing a real role to
  // reject a wrong-file upload is the worse trade.
  //
  // This test pins the CURRENT behaviour so the limitation is visible and
  // intentional rather than a surprise. If it ever starts failing, someone has
  // tightened cue detection — check single-line roles still survive before
  // celebrating.
  const notAScript = [
    'COLLECTION',
    'Shop the new arrivals for spring.',
    '',
    'CLICK HERE',
    'Free shipping on orders over fifty dollars.',
  ].join('\n');

  const cast = extractCharacters(parseScript(notAScript));
  assert.ok(cast.includes('CLICK HERE'),
    'cue detection changed — re-verify that single-line roles (WAITER, GUARD) still parse');
});

test('single-line roles survive — why cue recurrence is NOT required (prod id 100)', () => {
  // id=100 stored ["GUY","RECEPTIONIST"]. RECEPTIONIST speaks once. Any fix for
  // the limitation above must keep this passing.
  const sides = 'GUY\nIs this the right floor?\n\nRECEPTIONIST\nDepends who you are.';
  assert.deepEqual(extractCharacters(parseScript(sides)), ['GUY', 'RECEPTIONIST']);
});

test('flattened sides still produce a cast — the empty-cast bug (22 of 51 prod rows)', () => {
  // PDF text extraction routinely loses line breaks, which left the old parser
  // with nothing to anchor on and stored characters: []. The inline fallback is
  // what recovers the cast here.
  const flattened = 'GLORIA Hey. You are late again. REUBEN Told you, the bridge was closed. '
    + 'GLORIA Oh my God, the bridge. REUBEN It was actually closed. '
    + 'GLORIA It is always actually closed.';

  const cast = extractCharacters(parseScript(flattened));
  assert.ok(cast.includes('GLORIA'), 'GLORIA missing from flattened sides');
  assert.ok(cast.includes('REUBEN'), 'REUBEN missing from flattened sides');
  assert.ok(cast.length >= 2, `expected a real cast, got ${JSON.stringify(cast)}`);
});

test('extractCharacters accepts raw text, not just parsed lines', () => {
  // THE FORK GUARD. MobileApp called extractCharacters(content) with a string.
  // The old module auto-parsed strings; this one did not, so repointing the
  // import without this would have thrown on every phone upload.
  const text = 'MIDGE\nI am not going in there.\n\nARNOLD\nYou absolutely are.';
  assert.deepEqual(extractCharacters(text), ['MIDGE', 'ARNOLD']);
  assert.deepEqual(extractCharacters(parseScript(text)), ['MIDGE', 'ARNOLD']);
  // Hostile inputs must not throw — this runs during an upload.
  for (const junk of [null, undefined, '', 42, {}]) {
    assert.deepEqual(extractCharacters(junk), [], `threw or mis-parsed: ${String(junk)}`);
  }
});

test('a tight interruption keeps the second speaker (BUG 18 regression)', () => {
  // No blank line before CLAIRE. The old parser appended it to MARA's dialogue,
  // so the actor's own line vanished and the reader spoke it as MARA.
  const scene = ['MARA', 'Claire—', 'CLAIRE', "(cutting her off) I said I'd call him back."].join('\n');
  const cast = extractCharacters(parseScript(scene));
  assert.ok(cast.includes('CLAIRE'), `CLAIRE was swallowed: ${JSON.stringify(cast)}`);
});

test('CHARACTER: dialogue on one line still parses', () => {
  const scene = 'GUY: Is this the right floor?\nRECEPTIONIST: Depends who you are.';
  assert.deepEqual(extractCharacters(parseScript(scene)), ['GUY', 'RECEPTIONIST']);
});

test('a known cast list constrains inline splitting (BUG 5)', () => {
  // Actors address each other in caps; those mentions must not become speakers.
  const flat = 'GLORIA Hey REUBEN how are you. REUBEN Fine. GLORIA Good. REUBEN Great.';
  const lines = parseInlineCharacters(flat, ['Gloria', 'Reuben']);
  for (const l of lines) {
    assert.ok(['GLORIA', 'REUBEN'].includes(l.character), `unexpected speaker ${l.character}`);
  }
});

test('spokenText strips directions the reader must not say aloud', () => {
  assert.equal(spokenText("(cutting her off) I said I'd call him back."), "I said I'd call him back.");
  assert.equal(spokenText('[beat] Fine.'), 'Fine.');
});

/**
 * Watermark-only PDFs. ARNOLD_9.29.pdf (prod scripts 111 and 112, both stored
 * characters: []) is a SCANNED IMAGE with an Actors Access watermark stamped
 * diagonally across it. pdffonts shows only non-embedded Helvetica-Bold — the
 * watermark — while the script itself is a 1275x1650 JPEG plus CCITT stencils.
 * pdfjs therefore returns ~1,100 characters of watermark fragments, which beat
 * the old `length < 40` gate, skipped the vision fallback, and got stored.
 */
test('watermark-only extraction is treated as empty so vision runs', async () => {
  const {isEmptyScript} = await import('../src/utils/scriptParse.js');

  // Real shape of the ARNOLD_9.29 extraction: short repeated timestamp pieces.
  const watermark = Array.from({length: 120},
    () => 'PM 43 3: ep -S Se 30 ,2 02 6 -7 56 90 B9 T-').join(' ');
  assert.ok(watermark.replace(/\s+/g, '').length > 1000, 'fixture must exceed the old 40-char gate');
  assert.equal(isEmptyScript(watermark), true, 'watermark fragments must trigger the vision fallback');

  assert.equal(isEmptyScript(''), true);
  assert.equal(isEmptyScript(null), true);
});

test('a real script is NOT sent to vision — no needless AI spend', async () => {
  const {isEmptyScript} = await import('../src/utils/scriptParse.js');
  // A deliberately SHORT side: the gate must not push genuine text to vision,
  // because every false positive costs an AI call per upload.
  const side = [
    'INT. DINER - NIGHT', '',
    'ARNOLD', 'You order the same thing every single time we come here.', '',
    'MIDGE', 'Because it is the only thing worth ordering, Arnold.', '',
    'ARNOLD', 'That is not an answer, that is a position.', '',
    'MIDGE', 'Then consider it my position. Sit down and eat something.',
  ].join('\n');
  // 23 distinct 4+ letter words — the smallest thing we consider parseable, and
  // the upper bound on MIN_DISTINCT_WORDS. If someone raises that constant past
  // this, real sides start costing a vision call each.
  assert.equal(isEmptyScript(side), false, 'a genuine short side must not be sent to vision');
});
