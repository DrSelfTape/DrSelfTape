import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { cleanScriptText, detectScriptQuality } from '../../../utils/scriptCleaner';
import axiosInstance from '../../../redux/http';
import endPoints from '../../../redux/constant';

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

// PDFs above 5MB routinely OOM-crash WKWebView's renderer on real iPhones.
const MAX_PDF_BYTES = 5 * 1024 * 1024;

async function extractPdfText(file) {
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`PDF is ${mb}MB — please use a smaller file (max 5MB) or paste your sides.`);
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    password: '',
  }).promise.catch((err) => {
    if (err?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected — please remove the password or paste your sides.');
    }
    throw err;
  });
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

/* Aurora warm-up missions — pre-recording ritual cards */
const WARMUPS = [
  { id: 'cold', label: 'Cold read', desc: 'Jump in raw — no prep, pure instinct.', tint: 'var(--aurora-heritage-gold)', shadow: 'rgba(212,168,95,0.40)', hot: true },
  { id: 'emo',  label: 'Emotional prep', desc: 'Two breaths into the moment before the slate.', tint: 'var(--aurora-sky)', shadow: 'rgba(167,214,255,0.40)' },
  { id: 'phys', label: 'Physical warm-up', desc: 'Shake it out, drop into the body first.', tint: 'var(--aurora-mint)', shadow: 'rgba(159,230,180,0.40)' },
];

function WarmupAndRuler({ mission, setMission, len, setLen }) {
  const railRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const MIN = 1, MAX = 10;
  const ticks = [];
  for (let v = MIN; v <= MAX; v += 0.5) ticks.push(v);
  const pick = (clientX) => {
    const el = railRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setLen(Math.round(MIN + t * (MAX - MIN)));
  };

  return (
    <div style={{ marginBottom: 22 }}>
      <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 10 }}>
        WARM-UP MISSION
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {WARMUPS.map((m) => {
          const on = mission === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMission(m.id)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                padding: '14px 16px', borderRadius: 16,
                position: 'relative', overflow: 'hidden', border: 'none',
                background: on
                  ? `linear-gradient(135deg, ${m.tint}, color-mix(in oklch, ${m.tint} 70%, #000))`
                  : 'rgba(255,255,255,0.6)',
                boxShadow: on ? `0 8px 22px ${m.shadow}` : 'none',
                outline: `1.5px solid ${on ? m.tint : 'var(--aurora-line)'}`,
                outlineOffset: '-1.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: '#0E0D0A',
                }}>{m.label}</span>
                {m.hot && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                    letterSpacing: '0.12em', background: '#0E0D0A',
                    color: m.tint, padding: '2px 6px', borderRadius: 100,
                  }}>HOT</span>
                )}
                {on && (
                  <span style={{ marginLeft: 'auto', color: '#0E0D0A' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 12, lineHeight: 1.35, marginTop: 4,
                color: on ? 'rgba(14,13,10,0.7)' : 'var(--aurora-sub)',
              }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="aurora-card" style={{ padding: '16px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="aurora-eyebrow">TAKE LENGTH</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--aurora-accent-deep)' }}>
            <span style={{ fontSize: 30, letterSpacing: '-1.5px', color: 'var(--aurora-text)', fontWeight: 600 }}>{len}</span>
            <span style={{ fontSize: 13, marginLeft: 3 }}>min</span>
          </span>
        </div>
        <div
          ref={railRef}
          onPointerDown={(e) => { setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX); }}
          onPointerMove={(e) => drag && pick(e.clientX)}
          onPointerUp={() => setDrag(false)}
          style={{
            position: 'relative', height: 56, cursor: 'pointer',
            touchAction: 'none', userSelect: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            left: `${((len - MIN) / (MAX - MIN)) * 100}%`,
            top: 0, transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '8px solid var(--aurora-heritage-gold)',
            transition: drag ? 'none' : 'left 0.2s', zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 14, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {ticks.map((t, i) => {
              const major = Number.isInteger(t);
              const active = Math.abs(t - len) < 0.3;
              return (
                <div key={i} style={{
                  width: active ? 3 : 2,
                  height: major ? (active ? 28 : 20) : 12,
                  borderRadius: 3,
                  background: t <= len ? 'var(--aurora-heritage-gold)' : 'rgba(10,10,10,0.12)',
                  opacity: active ? 1 : t <= len ? 0.85 : 1,
                  transition: 'background 0.2s',
                }} />
              );
            })}
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            display: 'flex', justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: 'var(--aurora-dim)', letterSpacing: '0.1em',
          }}>
            <span>{MIN}m</span>
            <span>{Math.round((MIN + MAX) / 2)}m</span>
            <span>{MAX}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SidesUpload({ onSubmit }) {
  const [mission, setMission] = useState('cold');
  const [takeLen, setTakeLen] = useState(4);
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
    setRawCharCount(0);
    setQualityWarning('');
    setPdfError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[#0A0A0A]">Upload Your Sides</h2>
        <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">
          {canContinue
            ? 'Review your sides below, then start your session.'
            : 'Upload a .txt or .pdf file, or paste your sides below'}
        </p>
      </div>

      {!canContinue && (
        <WarmupAndRuler
          mission={mission} setMission={setMission}
          len={takeLen} setLen={setTakeLen}
        />
      )}

      {canContinue ? (
        <>
          <div className="bg-[#F4F4EE] rounded-xl border border-[rgba(10,10,10,0.08)] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[rgba(10,10,10,0.4)] uppercase tracking-wide">
                {fileName ? `Sides Preview — ${fileName}` : 'Sides Preview'}
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-[#7A5A18] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <pre className="text-sm text-[rgba(10,10,10,0.7)] whitespace-pre-wrap max-h-72 overflow-y-auto font-sans leading-relaxed">
              {scriptText.slice(0, 2000)}
              {scriptText.length > 2000 && '\n…'}
            </pre>
          </div>

          {qualityWarning && (
            <div className="mt-3 bg-[rgba(252,224,114,0.18)] border border-[#FCE072]/20 rounded-lg px-4 py-3 flex items-center gap-3">
              <span className="text-[#FCE072] text-lg">⚠</span>
              <p className="text-xs text-[#FCE072]">{qualityWarning}</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4 ${
              dragActive
                ? 'border-[#D4A85F] bg-[#D4A85F]/5'
                : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F] bg-[#F4F4EE]'
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

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[rgba(10,10,10,0.14)]" />
            <span className="text-xs text-[rgba(10,10,10,0.4)] font-medium">OR PASTE BELOW</span>
            <div className="flex-1 h-px bg-[rgba(10,10,10,0.14)]" />
          </div>

          {/* Textarea */}
          <textarea
            value={scriptText}
            onChange={(e) => {
              setScriptText(e.target.value);
              if (fileName) setFileName('');
            }}
            placeholder={`Paste your sides here...\n\nFormat example:\nJOHN: Hey, how's it going?\nSARAH: Not bad, just got back from the audition.\nJOHN: How did it go?`}
            className="w-full h-56 border border-[rgba(10,10,10,0.14)] rounded-xl px-4 py-3 text-sm focus:border-[#D4A85F] focus:ring-2 focus:ring-[#D4A85F]/20 outline-none resize-none bg-[#F4F4EE] text-[#0A0A0A]"
          />
        </>
      )}

      <button
        onClick={() => onSubmit(scriptText)}
        disabled={!canContinue}
        className="mt-5 w-full bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Start Session
      </button>
    </div>
  );
}
