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
    // Only treat a standalone uppercase line as a cue if it's short (<=4 words)
    // and doesn't start with a slug-line keyword. Keep the legitimate
    // CHARACTER-on-its-own-line case intact.
    if (
      /^[A-Z][A-Z\s.''-]{0,40}$/.test(trimmed) &&
      !currentDialogue.length &&
      trimmed.split(/\s+/).length <= 4 &&
      !/^(INT\.|EXT\.|INT\/EXT|FADE\b|CUT\b|DISSOLVE\b|SMASH\b|MATCH\b)/.test(trimmed)
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
