/**
 * scriptCleaner.js
 * Parses raw PDF text extracted from screenplays/sides and produces
 * clean dialogue-only script text ready for the AI.
 *
 * Removes:
 * - Timestamps (00:00:00, 10:30, etc.)
 * - Watermarks (common patterns like "CONFIDENTIAL", "FOR YOUR CONSIDERATION",
 *   "PROPERTY OF", "DO NOT DISTRIBUTE", studio names repeated on every page)
 * - Page numbers (standalone numbers, "Page 1 of 10", etc.)
 * - Scene headings (INT./EXT. lines) — optionally kept
 * - Parentheticals noise ((V.O.), (O.S.), (CONT'D), etc.) — keeps meaning, strips excess
 * - Empty lines (collapses multiples)
 * - PDF extraction artifacts (lone hyphens, stray characters, repeated spaces)
 *
 * Keeps:
 * - CHARACTER NAMES (ALL CAPS lines followed by dialogue)
 * - Dialogue text
 * - Action lines (when they provide scene context)
 */

// ── Patterns to strip completely ─────────────────────────────────────────────

const TIMESTAMP_RE = /\b\d{1,2}:\d{2}(:\d{2})?\b/g;
const PAGE_NUMBER_RE = /^\s*\d+\.?\s*$|^\s*[Pp]age\s+\d+(\s+of\s+\d+)?\s*$/gm;
const SCENE_HEADING_RE = /^\s*(INT|EXT|INT\/EXT|EXT\/INT)[\.\s].+$/gm;

// Watermark / legal noise — case-insensitive full-line matches
const WATERMARK_LINES = [
  /confidential/i,
  /for your consideration/i,
  /property of/i,
  /do not (distribute|copy|reproduce)/i,
  /not for distribution/i,
  /draft copy/i,
  /screener/i,
  /watermark/i,
  /all rights reserved/i,
  /©|copyright/i,
  /sony pictures/i,
  /universal pictures/i,
  /warner bros/i,
  /20th century/i,
  /netflix original/i,
  /amazon studios/i,
  /apple tv/i,
  /hbo original/i,
  /paramount/i,
  /registered to:/i,
  /this (script|screenplay) is/i,
  /^\s*CONTINUED:\s*$/i,
  /^\s*\(CONTINUED\)\s*$/i,
  /^\s*FADE (IN|OUT|TO BLACK)\s*[:.]*\s*$/i,
  /^\s*CUT TO:\s*$/i,
  /^\s*SMASH CUT TO:\s*$/i,
  /^\s*DISSOLVE TO:\s*$/i,
];

// Repetitive noise tokens inside lines
const INLINE_NOISE_RE = [
  /\bCONT['']D\b/gi,
  /\(V\.?O\.?\)/gi,
  /\(O\.?S\.?\)/gi,
  /\(O\.?C\.?\)/gi,
  /\(PRE-?LAP\)/gi,
  /\bMORE\b/g,
  /\bEND OF (ACT|EPISODE|SCENE)\b/gi,
  /={3,}/g,          // === dividers
  /-{4,}/g,          // ---- dividers
  /\*{2,}/g,         // ** decorations
  /\[.*?\]/g,        // [bracketed notes]
];

// Repeated punctuation-only patterns from watermarks (e.g. ",," ".. " "- -")
const WATERMARK_CHARS_RE = /^[,\.\-\s*_|:;!@#$%^&*()\[\]{}]{1,10}$/;

// ── Main cleaner ──────────────────────────────────────────────────────────────

export function cleanScriptText(rawText) {
  if (!rawText) return '';

  let text = rawText;

  // 1. Normalise line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove timestamps
  text = text.replace(TIMESTAMP_RE, '');

  // 3. Remove page numbers (full lines)
  text = text.replace(PAGE_NUMBER_RE, '');

  // 4. Remove scene headings (INT./EXT.)
  text = text.replace(SCENE_HEADING_RE, '');

  // 5. Remove watermark lines
  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true; // keep blank lines for now, collapse later
      return !WATERMARK_LINES.some((re) => re.test(trimmed));
    })
    .join('\n');

  // 6. Remove inline noise tokens
  for (const re of INLINE_NOISE_RE) {
    text = text.replace(re, '');
  }

  // 7. Remove lines that are ONLY numbers, punctuation, or whitespace
  //    Also removes watermark artifacts like ",," "- -" ". ." etc.
  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      // Must have at least 2 real word characters
      if (!/[a-zA-Z]{2,}/.test(trimmed)) return false;
      // Remove pure watermark artifact lines
      if (WATERMARK_CHARS_RE.test(trimmed)) return false;
      return true;
    })
    .join('\n');

  // 7b. Remove inline watermark artifacts (e.g. ",," at start/end of lines)
  text = text
    .split('\n')
    .map((line) => line.replace(/^[,\s]+|[,\s]+$/g, '').trim())
    .join('\n');

  // 8. Collapse 3+ consecutive blank lines → double newline
  text = text.replace(/\n{3,}/g, '\n\n');

  // 9. Trim leading/trailing whitespace per line but preserve indentation meaning
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

  // 10. Deduplicate identical consecutive lines (PDF extraction sometimes doubles)
  const lines = text.split('\n');
  const deduped = lines.filter((line, i) => i === 0 || line !== lines[i - 1]);
  text = deduped.join('\n');

  return text;
}

/**
 * Attempts to detect if a block of text looks like a real screenplay
 * (has character cues in ALL CAPS followed by dialogue).
 */
export function detectScriptQuality(text) {
  const allCapsLines = (text.match(/^[A-Z][A-Z\s'.\-]{2,}$/gm) || []).length;
  const totalLines = text.split('\n').filter((l) => l.trim()).length;
  const ratio = totalLines > 0 ? allCapsLines / totalLines : 0;

  if (totalLines < 5) return { ok: false, warning: 'Too little text detected. Please check your PDF.' };
  if (ratio < 0.03) return { ok: true, warning: 'No character cues detected. Make sure the script has CHARACTER: Dialogue format.' };
  return { ok: true, warning: null };
}
