/**
 * Shared script-parsing utilities for SceneStudy + CDSim.
 *
 * Extracted from the two panels (they were byte-identical and at risk of
 * drifting). Exports parseScript, extractCharacters, parseInlineCharacters.
 */

/**
 * Parse script text into lines with character + dialogue.
 * Supports:
 *   CHARACTER NAME: dialogue text
 *   CHARACTER NAME
 *   dialogue text (indented or on next line)
 *
 * @param {string} text - raw script text
 * @param {string[]} [knownCast] - optional BE/route cast list. When present and
 *   non-empty, the inline (flattened-sides) fallback only splits on these names.
 */
export function parseScript(text, knownCast) {
  const lines = [];
  const rawLines = String(text || '').split('\n');
  let currentChar = null;
  let currentDialogue = [];

  // Shape of a character cue, with the BUG 18 guards: short, all-caps, and not
  // a scene-heading slug ("INT. KITCHEN", "FADE IN", "CUT TO").
  const isCueShape = (s) =>
    /^[A-Z][A-Z\s.''-]{0,40}$/.test(s) &&
    s.split(/\s+/).length <= 4 &&
    !/^(INT\.|EXT\.|INT\/EXT|FADE\b|CUT\b|DISSOLVE\b|SMASH\b|MATCH\b)/.test(s);

  // BUG: an interruption written tight —
  //     MARA
  //     Claire—
  //     CLAIRE
  //     (cutting her off) I said I'd call him back.
  // — has no blank line before the second cue, so the `!currentDialogue.length`
  // guard below refused to promote CLAIRE and appended it to MARA's dialogue.
  // The actor's own line vanished from the scene and the reader spoke it as the
  // wrong character. Interruptions are common in generated scenes, so this hit
  // real sessions.
  //
  // Collect the names that appear UNAMBIGUOUSLY as cues (opening a block, i.e.
  // first non-empty line or right after a blank one) and let the main pass
  // recognise those same names later even when they're butted up against
  // dialogue. Seeded with the known cast when the caller supplies it.
  const knownCues = new Set(
    (Array.isArray(knownCast) ? knownCast : [])
      .filter(Boolean)
      .map((c) => String(c).trim().toUpperCase()),
  );
  let atBlockStart = true;
  for (const raw of rawLines) {
    const t = raw.trim();
    if (!t) {
      atBlockStart = true;
      continue;
    }
    if (atBlockStart && isCueShape(t)) knownCues.add(t.toUpperCase());
    atBlockStart = false;
  }

  const flush = () => {
    if (currentChar && currentDialogue.length > 0) {
      lines.push({
        character: currentChar,
        dialogue: currentDialogue.join(' ').trim(),
      });
    }
    currentDialogue = [];
  };

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
      currentChar = null;
      continue;
    }

    // Match "CHARACTER: dialogue" or "CHARACTER NAME: dialogue"
    const colonMatch = trimmed.match(/^([A-Z][A-Z\s.''-]{0,40}):\s*(.*)$/);
    if (colonMatch) {
      flush();
      currentChar = colonMatch[1].trim();
      if (colonMatch[2]) currentDialogue.push(colonMatch[2]);
      continue;
    }

    // Match standalone uppercase name (next line is dialogue).
    // BUG 18: tighten so a stray shouted word or a scene-heading slug line
    // ("INT. KITCHEN", "FADE IN", "CUT TO") is NOT promoted to a character.
    //
    // The cue is accepted when it opens a block (nothing accumulated yet — the
    // original rule), OR when it is a name we already saw used unambiguously as
    // a cue. That second case is what rescues a tight interruption without
    // reopening BUG 18: a shouted word still has to earn its place by appearing
    // as a real cue somewhere else in the scene.
    // A dash or ellipsis at the end of the previous line is how an interruption
    // is written, and it is the one place a cue legitimately butts straight up
    // against dialogue. `cachedCharacters` is null for any script saved before
    // the BE started caching the cast, so this cannot rely on knownCues alone.
    const prevLine = currentDialogue[currentDialogue.length - 1] || '';
    const wasInterrupted = /(?:[—–]|--|\.\.\.)\s*$/.test(prevLine);

    if (
      isCueShape(trimmed) &&
      (!currentDialogue.length || knownCues.has(trimmed.toUpperCase()) || wasInterrupted)
    ) {
      flush();
      currentChar = trimmed;
      continue;
    }

    // Otherwise it's dialogue continuation
    if (currentChar) {
      currentDialogue.push(trimmed);
    }
  }
  flush();

  // Fallback: flattened screenplay sides lose their line breaks, so the cues
  // end up INLINE ("GLORIA ... REUBEN ...") and the line-based pass above finds
  // no characters. Detect the recurring ALL-CAPS names and split on them.
  if (new Set(lines.map((l) => l.character)).size < 2) {
    const inline = parseInlineCharacters(text, knownCast);
    if (new Set(inline.map((l) => l.character)).size >= 2) return inline;
  }
  return lines;
}

// Recover character/dialogue structure from a flattened screenplay where the
// line breaks were lost: "GLORIA Hey. REUBEN Told you... GLORIA Oh my God...".
// Real cues are ALL-CAPS and RECUR, so we key on names that appear 2+ times.
//
// @param {string} text
// @param {string[]} [knownCast] - when present and non-empty, the detected
//   names are intersected with this cast list (case-insensitive) so stray
//   ALL-CAPS words / in-dialogue name mentions never become speakers (BUG 5).
export function parseInlineCharacters(text, knownCast) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (!flat) return [];
  // Candidate cue: 1-2 ALL-CAPS words (letters + . ' -), >= 3 letters total —
  // skips "I", "OK", "NO", "TV" etc. but keeps GLORIA / REUBEN / O'BRIEN / DR.
  const cueRe = /\b([A-Z][A-Z.'’-]*(?:\s+[A-Z][A-Z.'’-]*)?)\b/g;
  const counts = {};
  let m;
  while ((m = cueRe.exec(flat))) {
    const name = m[1].trim().replace(/[.\s]+$/, '');
    if (name.replace(/[^A-Z]/g, '').length < 3) continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  let names = Object.keys(counts).filter((n) => counts[n] >= 2);

  // BUG 5: when a known cast list is available, constrain the inline split to
  // ONLY those names (case-insensitive). This stops actors addressing each
  // other by name in ALL-CAPS ("GLORIA Hey REUBEN how are you") from being
  // mis-split, and stops stray uppercase tokens from becoming speakers.
  const cast = Array.isArray(knownCast)
    ? knownCast.filter(Boolean).map((c) => String(c).trim())
    : [];
  if (cast.length) {
    const castLower = new Set(cast.map((c) => c.toLowerCase()));
    names = names.filter((n) => castLower.has(n.toLowerCase()));
  }

  if (names.length < 2) return [];
  const esc = names
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length); // longest first so 2-word names win
  // BUG 4: allow a cue at the very END of the string (was `(?=\s)`, which
  // required a trailing space and swallowed a final cue into the prior beat).
  const splitRe = new RegExp(`(?:^|\\s)(${esc.join('|')})(?=\\s|$)`, 'g');
  // BUG 4: strip a trailing cue token left dangling at the end of a beat's
  // dialogue (e.g. "...Bye. REUBEN" → reader would literally speak "REUBEN").
  const tailRe = new RegExp('\\s(?:' + esc.join('|') + ')[.,!?]*$');
  const cues = [];
  let mm;
  while ((mm = splitRe.exec(flat))) {
    cues.push({ name: mm[1], start: mm.index, after: splitRe.lastIndex });
  }
  const out = [];
  for (let i = 0; i < cues.length; i++) {
    const end = i + 1 < cues.length ? cues[i + 1].start : flat.length;
    let dialogue = flat.slice(cues[i].after, end).trim();
    dialogue = dialogue.replace(tailRe, '').trim();
    if (dialogue) out.push({ character: cues[i].name.trim(), dialogue });
  }

  // BUG 15: if the recurring ALL-CAPS tokens were emphasis words (not names),
  // the split can collapse to a degenerate result (one speaker owning
  // everything, or <2 distinct speakers). Return [] so parseScript falls
  // through to its line-based result rather than a worse "Line 1 of 1".
  const distinctSpeakers = new Set(out.map((l) => l.character));
  if (out.length < 2 || distinctSpeakers.size < 2) return [];

  return out;
}

/**
 * The part of a line that is actually SPOKEN — parentheticals removed.
 *
 * A generated scene writes performance directions inline: "(cutting her off)
 * I said I'd call him back." Those are for the actor to READ, never to hear or
 * to say. Left in, two things break: the AI reader speaks "cutting her off"
 * aloud, and the cue matcher waits for the actor to say those words before it
 * will advance the scene.
 *
 * The BYOS/sides path already strips these at import (see SidesUpload's
 * sidesToScript). Generated scenes never went through that path, so the same
 * rule has to be applied at the point of speaking/listening.
 *
 * Display is deliberately left alone — seeing "(cutting her off)" is useful
 * direction for the actor.
 */
export function spokenText(dialogue) {
  return String(dialogue || '')
    .replace(/\([^)]*\)/g, ' ')   // (cutting her off)
    .replace(/\[[^\]]*\]/g, ' ')  // [beat] — some generations use brackets
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractCharacters(lines) {
  const seen = new Set();
  return lines
    .map((l) => l.character)
    .filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });
}
