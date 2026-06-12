/**
 * Shared PDF text extractor.
 *
 * pdf.js returns each text fragment as its own item, does NOT guarantee
 * reading order, and line breaks are not items — so a naive
 * `items.map(i => i.str).join(' ')` collapses an entire page into ONE
 * line. That bug shipped in multiple copies (Scripts, Auditions, …),
 * making uploaded scripts read "1 line / 0 characters" and leaving
 * Scene Study with no usable content. This is the single proven
 * extractor: sort items into reading order (top→bottom, then
 * left→right by their transform), then group them into real lines by
 * their Y baseline (±4pt). Mirrors the approach CDSim's sides-upload
 * already used successfully.
 */
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((it) => it.str && Array.isArray(it.transform));
    if (!items.length) continue;
    items.sort((a, b) => {
      const dy = Math.round(b.transform[5]) - Math.round(a.transform[5]);
      if (Math.abs(dy) > 4) return dy;
      return a.transform[4] - b.transform[4];
    });
    const lines = [];
    let currentY = null;
    let currentLine = [];
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      if (currentY === null || Math.abs(y - currentY) <= 4) {
        currentLine.push(it.str);
        currentY = y;
      } else {
        lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
        currentLine = [it.str];
        currentY = y;
      }
    }
    if (currentLine.length) lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
    pageTexts.push(lines.filter(Boolean).join('\n'));
  }
  return pageTexts.join('\n\n');
}

export default extractPdfText;
