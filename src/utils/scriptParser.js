/**
 * scriptParser.js
 *
 * Lightweight regex-based parser that turns CHARACTER:dialogue text
 * into structured lines, and a helper that extracts the unique cast
 * list. Used both during script upload (so we can cache the cast on
 * the backend) and at session-start (as a fallback for legacy scripts
 * saved before the cast was persisted).
 */

/**
 * Parse script text into { character, dialogue } objects.
 * Supports:
 *   CHARACTER NAME: dialogue text
 *   CHARACTER NAME
 *   dialogue text (indented or on next line)
 */
export function parseScript(text) {
  const lines = [];
  const rawLines = (text || '').split('\n');
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

    const colonMatch = trimmed.match(/^([A-Z][A-Z\s.''-]{0,40}):\s*(.*)$/);
    if (colonMatch) {
      flush();
      currentChar = colonMatch[1].trim();
      if (colonMatch[2]) currentDialogue.push(colonMatch[2]);
      continue;
    }

    if (/^[A-Z][A-Z\s.''-]{0,40}$/.test(trimmed) && !currentDialogue.length) {
      flush();
      currentChar = trimmed;
      continue;
    }

    if (currentChar) {
      currentDialogue.push(trimmed);
    }
  }
  flush();
  return lines;
}

/** Return the ordered, de-duplicated list of speaking characters. */
export function extractCharacters(parsedLinesOrText) {
  const lines = typeof parsedLinesOrText === 'string'
    ? parseScript(parsedLinesOrText)
    : parsedLinesOrText;
  const seen = new Set();
  const order = [];
  for (const l of lines) {
    if (!l?.character || seen.has(l.character)) continue;
    seen.add(l.character);
    order.push(l.character);
  }
  return order;
}
