import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { cleanScriptText, detectScriptQuality } from '../../../utils/scriptCleaner';
import axiosInstance from '../../../redux/http';
import endPoints from '../../../redux/constant';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Simple hash for caching — avoids re-calling GPT on same content
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: false });

    const items = content.items.filter((item) => item.str?.trim());

    // ── Font-size filtering to remove watermarks ──────────────────────────
    // Watermarks are typically rendered at a different size than body text.
    // Find the most common font height (body text) and keep only those chars.
    if (items.length > 0) {
      const sizeMap = {};
      items.forEach((item) => {
        const h = Math.round(Math.abs(item.transform[3]));
        sizeMap[h] = (sizeMap[h] || 0) + item.str.length;
      });
      // Pick the size with the most characters (dominant = body text)
      const dominantSize = Object.entries(sizeMap)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      const filtered = items.filter((item) => {
        const h = Math.round(Math.abs(item.transform[3]));
        return Math.abs(h - parseInt(dominantSize)) <= 2; // allow ±2pt tolerance
      });

      // Only use filtered if it kept a meaningful portion of text
      const useFiltered = filtered.length > items.length * 0.3;
      const workItems = useFiltered ? filtered : items;

      // Sort: top→bottom, left→right
      workItems.sort((a, b) => {
        const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5]);
        if (Math.abs(yDiff) > 4) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      // Group into lines by Y
      const lines = [];
      let currentY = null;
      let currentLine = [];
      for (const item of workItems) {
        const y = Math.round(item.transform[5]);
        if (currentY === null || Math.abs(y - currentY) <= 4) {
          currentLine.push(item.str);
          currentY = y;
        } else {
          if (currentLine.length) lines.push(currentLine.join(''));
          currentLine = [item.str];
          currentY = y;
        }
      }
      if (currentLine.length) lines.push(currentLine.join(''));
      pageTexts.push(lines.join('\n'));
    }
  }

  const raw = pageTexts.join('\n\n');
  return cleanScriptText(raw);
}

export default function SidesUpload({ onSubmit }) {
  const [scriptText, setScriptText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [qualityWarning, setQualityWarning] = useState('');
  const [rawCharCount, setRawCharCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.pdf')) {
      alert('Please upload a .txt or .pdf file');
      return;
    }
    setPdfError('');
    setFileName(file.name);

    if (name.endsWith('.pdf')) {
      setPdfLoading(true);
      setQualityWarning('');
      try {
        // Step 1: raw size for stats
        setPdfStatus('Reading PDF...');
        const rawArrayBuffer = await file.arrayBuffer();
        const rawPdf = await pdfjsLib.getDocument({ data: rawArrayBuffer }).promise;
        let rawTotal = 0;
        for (let i = 1; i <= rawPdf.numPages; i++) {
          const p = await rawPdf.getPage(i);
          const c = await p.getTextContent();
          rawTotal += c.items.map(x => x.str).join('').length;
        }
        setRawCharCount(rawTotal);

        // Step 2: extract + clean
        const rawText = await extractPdfText(file);

        // Step 3: AI reformat into CHARACTER: dialogue format
        setPdfStatus('Formatting with AI...');
        let finalText = rawText;
        // Check cache first — avoids re-calling GPT on same PDF content
        const cacheKey = `fmtscript_${simpleHash(rawText)}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          finalText = cached;
        } else {
          try {
            const { data } = await axiosInstance.post(endPoints.formatScript, { text: rawText });
            if (data?.success && data?.data?.formatted) {
              finalText = data.data.formatted;
              sessionStorage.setItem(cacheKey, finalText); // cache it
            }
          } catch { /* fall back to raw */ }
        }

        setScriptText(finalText);
        setPdfStatus('');

        const quality = detectScriptQuality(finalText);
        if (quality.warning) setQualityWarning(quality.warning);
      } catch {
        setPdfError('Could not parse PDF — please paste your script manually.');
        setFileName('');
        setPdfStatus('');
      } finally {
        setPdfLoading(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setScriptText(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const canContinue = scriptText.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0A0A0A]">Upload Your Sides</h2>
        <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">
          Upload a .txt or .pdf file, or paste your sides below
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4 ${
          dragActive
            ? 'border-[#D4A85F] bg-[#D4A85F]/5'
            : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F] bg-[#1E1E1E]'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {pdfLoading ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-[#7A5A18] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <p className="text-sm font-medium text-[#0A0A0A]">{pdfStatus || 'Processing...'}</p>
            <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1">This may take a few seconds</p>
          </div>
        ) : (
          <>
            <svg
              className="w-10 h-10 mx-auto text-[rgba(10,10,10,0.4)] mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-[#0A0A0A]">
              {fileName || 'Drag & drop your sides here'}
            </p>
            <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1">Accepts .txt and .pdf files</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {pdfError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {pdfError}
        </div>
      )}

      {/* Clean stats */}
      {rawCharCount > 0 && scriptText && !pdfLoading && (
        <div className="mb-4 bg-[#1A2A1A] border border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-green-400 text-lg">✓</span>
          <div>
            <p className="text-xs font-semibold text-green-400">PDF cleaned successfully</p>
            <p className="text-xs text-[rgba(10,10,10,0.4)] mt-0.5">
              Removed {Math.max(0, rawCharCount - scriptText.length).toLocaleString()} characters of noise
              (timestamps, watermarks, page numbers)
            </p>
          </div>
        </div>
      )}

      {qualityWarning && (
        <div className="mb-4 bg-[#2A2000] border border-[#FCE072]/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-[#FCE072] text-lg">⚠</span>
          <p className="text-xs text-[#FCE072]">{qualityWarning}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#3A3A3A]" />
        <span className="text-xs text-[rgba(10,10,10,0.4)] font-medium">OR PASTE BELOW</span>
        <div className="flex-1 h-px bg-[#3A3A3A]" />
      </div>

      {/* Textarea */}
      <textarea
        value={scriptText}
        onChange={(e) => {
          setScriptText(e.target.value);
          if (fileName) setFileName('');
        }}
        placeholder={`Paste your sides here...\n\nFormat example:\nJOHN: Hey, how's it going?\nSARAH: Not bad, just got back from the audition.\nJOHN: How did it go?`}
        className="w-full h-56 border border-[rgba(10,10,10,0.14)] rounded-xl px-4 py-3 text-sm focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none resize-none bg-[#1E1E1E] text-[#0A0A0A]"
      />

      {/* Preview */}
      {canContinue && (
        <div className="mt-4 bg-[#1E1E1E] rounded-xl border border-[rgba(10,10,10,0.08)] p-4">
          <p className="text-xs font-semibold text-[rgba(10,10,10,0.4)] mb-2 uppercase tracking-wide">
            Sides Preview
          </p>
          <pre className="text-sm text-[rgba(10,10,10,0.62)] whitespace-pre-wrap max-h-40 overflow-y-auto font-sans leading-relaxed">
            {scriptText.slice(0, 1000)}
            {scriptText.length > 1000 && '...'}
          </pre>
        </div>
      )}

      <button
        onClick={() => onSubmit(scriptText)}
        disabled={!canContinue}
        className="mt-6 w-full bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Start Session
      </button>
    </div>
  );
}
