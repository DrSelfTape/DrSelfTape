import axiosInstance from '../redux/http';
import endPoints from '../redux/constant';

/**
 * True when extracted PDF text is essentially empty — i.e. the PDF has no text
 * layer (common for Actors Access / Breakdown Services sides, which flatten
 * their fonts). pdfjs returns ~0 characters for these.
 */
export function isEmptyScript(text) {
  return !text || text.replace(/\s+/g, '').length < 40;
}

/**
 * Vision fallback: read the rendered PDF pages with the /parse-sides/ endpoint
 * (Claude vision) and flatten to "CHARACTER: dialogue" — the same format the
 * script parser/reader expects. Use this whenever pdfjs text extraction comes
 * back empty so a no-text-layer PDF still produces a usable script instead of
 * a silent "0 characters". Returns '' if the fallback can't help (e.g. no AI
 * consent); the caller should surface a friendly message in that case.
 */
export async function pdfVisionFallback(file) {
  const fd = new FormData();
  fd.append('pdf', file);
  const { data } = await axiosInstance.post(endPoints.parseSides, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });
  const scene = data?.data || data;
  return (scene?.scenes || [])
    .map((sc) => (sc.lines || [])
      .filter((l) => l.type === 'dialogue' && l.character && l.text)
      .map((l) => `${l.character}: ${l.text}`)
      .join('\n'))
    .filter(Boolean)
    .join('\n\n');
}
