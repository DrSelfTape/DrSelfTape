import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { cleanScriptText, detectScriptQuality } from '../../../utils/scriptCleaner';
import axiosInstance from '../../../redux/http';
import endPoints from '../../../redux/constant';
import { isEmptyScript, pdfVisionFallback } from '../../../utils/pdfToScript';

import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

// Simple hash for caching — avoids re-calling GPT on same content
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

// 5 MB. PDFs above this routinely OOM-crash WKWebView's renderer on
// real iPhones (the sim has 16GB so it never triggers there).
const MAX_PDF_BYTES = 5 * 1024 * 1024;

async function extractPdfText(file) {
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`PDF is ${mb}MB — please use a smaller file (max 5MB) or paste your script.`);
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    // Encrypted PDFs would hang on iOS without this — fail fast instead.
    password: '',
  }).promise.catch((err) => {
    if (err?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected — please remove the password or paste your script.');
    }
    throw err;
  });
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const items = content.items.filter((item) => item.str?.trim());

    if (items.length > 0) {
      // Find dominant font size (body text) and filter out watermarks
      const sizeMap = {};
      items.forEach((item) => {
        const h = Math.round(Math.abs(item.transform[3]));
        sizeMap[h] = (sizeMap[h] || 0) + item.str.length;
      });
      const dominantSize = parseInt(Object.entries(sizeMap).sort((a, b) => b[1] - a[1])[0]?.[0]);
      const filtered = items.filter((item) => Math.abs(Math.round(Math.abs(item.transform[3])) - dominantSize) <= 2);
      const workItems = filtered.length > items.length * 0.3 ? filtered : items;

      workItems.sort((a, b) => {
        const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5]);
        if (Math.abs(yDiff) > 4) return yDiff;
        return a.transform[4] - b.transform[4];
      });

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

  return cleanScriptText(pageTexts.join('\n\n'));
}

export default function ScriptUpload({ onSubmit }) {
  const [scriptText, setScriptText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfStatus, setPdfStatus] = useState(''); // loading step label
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
      try {
        // Step 1: Extract raw text from PDF
        setPdfStatus('Reading PDF...');
        const rawText = await extractPdfText(file);

        let finalText = '';
        if (isEmptyScript(rawText)) {
          // No text layer (Actors Access / scanned PDFs) → read the rendered
          // pages with vision; result is already CHARACTER: dialogue.
          setPdfStatus('Reading the pages…');
          finalText = await pdfVisionFallback(file).catch(() => '');
        } else {
          // Has a text layer → AI reformat into clean CHARACTER: dialogue.
          setPdfStatus('Formatting with AI...');
          finalText = rawText;
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
            } catch {
              // If AI format fails, fall back to raw extracted text
            }
          }
        }

        if (!finalText) {
          setPdfError("Couldn't read text from this PDF — paste your script, or use the “Upload your audition sides” tile.");
          setFileName('');
        } else {
          setScriptText(finalText);
        }
        setPdfStatus('');
      } catch (err) {
        setPdfError(err?.message || 'Could not parse PDF — please paste your script manually.');
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

  const clearAll = () => {
    setScriptText('');
    setFileName('');
    setPdfError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[#0A0A0A]">Upload Your Script</h2>
        <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">
          {canContinue
            ? 'Review your script below, then continue to pick your role.'
            : 'Upload a .txt or .pdf file, or paste your script below'}
        </p>
      </div>

      {canContinue ? (
        <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[rgba(10,10,10,0.62)] uppercase tracking-wide">
              {fileName ? `Script Preview — ${fileName}` : 'Script Preview'}
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-[#7A5A18] hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
          <pre className="text-sm text-[rgba(10,10,10,0.7)] whitespace-pre-wrap max-h-80 overflow-y-auto font-sans leading-relaxed">
            {scriptText.slice(0, 2000)}
            {scriptText.length > 2000 && '\n…'}
          </pre>
        </div>
      ) : (
        <>
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4 ${
              dragActive
                ? 'border-[#D4A85F] bg-[#D4A85F]/10'
                : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F] bg-white'
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
                <p className="text-xs text-[rgba(10,10,10,0.4)]">This may take a few seconds</p>
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
                <p className="text-sm font-medium text-[rgba(10,10,10,0.62)]">
                  {fileName || 'Drag & drop your script file here'}
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
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {pdfError}
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#F4F4EE]" />
            <span className="text-xs text-[rgba(10,10,10,0.4)] font-medium">OR PASTE BELOW</span>
            <div className="flex-1 h-px bg-[#F4F4EE]" />
          </div>

          {/* Textarea */}
          <textarea
            value={scriptText}
            onChange={(e) => {
              setScriptText(e.target.value);
              if (fileName) setFileName('');
            }}
            placeholder={`Paste your script here...\n\nFormat example:\nJOHN: Hey, how's it going?\nSARAH: Not bad, just got back from the audition.\nJOHN: How did it go?`}
            className="w-full h-56 border border-[rgba(10,10,10,0.14)] rounded-xl px-4 py-3 text-sm focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none resize-none bg-white"
          />
        </>
      )}

      <button
        onClick={() => onSubmit(scriptText)}
        disabled={!canContinue}
        className="mt-5 w-full bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
