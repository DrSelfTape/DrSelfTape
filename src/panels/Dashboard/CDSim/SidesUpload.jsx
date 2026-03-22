import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n');
}

export default function SidesUpload({ onSubmit }) {
  const [scriptText, setScriptText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
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
        const text = await extractPdfText(file);
        setScriptText(text);
      } catch {
        setPdfError('Could not parse PDF — please paste your script manually.');
        setFileName('');
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
        <h2 className="text-2xl font-bold text-gray-900">Upload Your Sides</h2>
        <p className="text-gray-500 text-sm mt-1">
          Upload a .txt or .pdf file, or paste your sides below
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer mb-4 ${
          dragActive
            ? 'border-[#ff6b35] bg-orange-50'
            : 'border-gray-200 hover:border-[#ff6b35] bg-white'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {pdfLoading ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-[#ff6b35] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Parsing PDF...</p>
          </div>
        ) : (
          <>
            <svg
              className="w-10 h-10 mx-auto text-gray-400 mb-3"
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
            <p className="text-sm font-medium text-gray-700">
              {fileName || 'Drag & drop your sides here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Accepts .txt and .pdf files</p>
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
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR PASTE BELOW</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Textarea */}
      <textarea
        value={scriptText}
        onChange={(e) => {
          setScriptText(e.target.value);
          if (fileName) setFileName('');
        }}
        placeholder={`Paste your sides here...\n\nFormat example:\nJOHN: Hey, how's it going?\nSARAH: Not bad, just got back from the audition.\nJOHN: How did it go?`}
        className="w-full h-56 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#ff6b35] focus:ring-2 focus:ring-orange-100 outline-none resize-none bg-white"
      />

      {/* Preview */}
      {canContinue && (
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Sides Preview
          </p>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans leading-relaxed">
            {scriptText.slice(0, 1000)}
            {scriptText.length > 1000 && '...'}
          </pre>
        </div>
      )}

      <button
        onClick={() => onSubmit(scriptText)}
        disabled={!canContinue}
        className="mt-6 w-full bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Start Session
      </button>
    </div>
  );
}
