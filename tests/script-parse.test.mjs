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

test('a SHORT real scene is not sent to vision — the review counterexample', async () => {
  const {isEmptyScript, parseScript, extractCharacters} = await import('../src/utils/scriptParse.js');
  // This exact scene broke my first two attempts at the gate. It has only two
  // distinct 4+ letter words ("alice", "love"), so a vocabulary-richness
  // threshold called it empty — while it parses into both speakers perfectly.
  // Every false positive here spends a PAID vision call on an upload that
  // needed nothing.
  const scene = 'ALICE\nI love you.\n\nBOB\nI love you too.\n\nALICE\nDo you?\n\nBOB\nYes. I do.';
  assert.deepEqual(extractCharacters(parseScript(scene)), ['ALICE', 'BOB']);
  assert.equal(isEmptyScript(scene), false, 'a readable short scene must never be sent to vision');
});

test('a monologue keeps its real speaker — inline inference must not override it', async () => {
  const {parseScript, extractCharacters} = await import('../src/utils/scriptParse.js');
  // The fallback used to run whenever fewer than two speakers were found, so a
  // one-hander with recurring shouted words lost its actual role: this returned
  // ["PLEASE","NEVER"] and dropped ALICE entirely. One-hander sides are common.
  const mono = 'ALICE\nPlease say PLEASE to me. Say PLEASE again. You said NEVER yesterday. You said NEVER again.';
  assert.deepEqual(extractCharacters(parseScript(mono)), ['ALICE']);
});

test('flattened sides still recover their cast after the fallback was narrowed', async () => {
  const {parseScript, extractCharacters} = await import('../src/utils/scriptParse.js');
  const flat = 'GLORIA Hey you are late again. REUBEN Told you the bridge was closed. '
    + 'GLORIA Oh the bridge. REUBEN It was actually closed.';
  const cast = extractCharacters(parseScript(flat));
  assert.ok(cast.includes('GLORIA') && cast.includes('REUBEN'),
    `narrowing the fallback must not break flattened sides: ${JSON.stringify(cast)}`);
});

test('accented non-English sides are not forced to vision', async () => {
  const {isEmptyScript} = await import('../src/utils/scriptParse.js');
  // Production already contains a Hungarian sides PDF. Accents split words under
  // a Latin-only word test, which is why the ratio is measured over token SHAPE
  // rather than distinct vocabulary.
  const hu = 'ANNA\nKérlek, gyere közelebb hozzám most.\n\nPÉTER\nNem akarok közelebb menni hozzád.';
  assert.equal(isEmptyScript(hu), false, 'an accented-language side must not cost a vision call');
});

test('KNOWN LIMITATION: wholly non-Latin text routes to vision', async () => {
  const {isEmptyScript} = await import('../src/utils/scriptParse.js');
  // Accepted, not a bug: cue detection is built on Latin capitals and could not
  // parse these anyway, so vision is the right destination. What MUST hold is
  // that callers never re-apply this gate to vision output — otherwise a paid
  // transcription is thrown away. Scripts/index.jsx was doing exactly that.
  const ko = '민준\n너 늦었어 또. 어제도 늦었잖아 그렇지.\n\n지우\n다리가 막혔다고 말했잖아 분명히.';
  assert.equal(isEmptyScript(ko), true);
});

test('spokenText strips directions the reader must not say aloud', async () => {
  const {spokenText} = await import('../src/utils/scriptParse.js');
  assert.equal(spokenText("(cutting her off) I said I'd call him back."), "I said I'd call him back.");
  assert.equal(spokenText('[beat] Fine.'), 'Fine.');
});
