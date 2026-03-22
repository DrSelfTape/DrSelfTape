import React from 'react';
import { Volume2, Download, RotateCcw } from 'lucide-react';

const SECTIONS = [
  { key: 'interpretation', label: 'Scene Interpretation & Tone' },
  { key: 'performance', label: 'Performance Direction' },
  { key: 'wardrobe', label: 'Wardrobe Recommendations' },
  { key: 'lighting', label: 'Lighting Recommendations' },
  { key: 'framing', label: 'Framing & Camera Recommendations' },
];

function SectionCard({ label, data }) {
  if (!data) return null;

  const handleListen = () => {
    console.log('TTS:', label);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-serif text-xl font-bold text-gray-900">{label}</h3>
        <button
          onClick={handleListen}
          className="flex items-center gap-1.5 text-sm font-medium text-[#FF8280] hover:text-[#e06e6c] transition-colors shrink-0 ml-4"
        >
          <Volume2 size={16} />
          Listen to Direction
        </button>
      </div>

      {data.title && (
        <h4 className="text-base font-semibold text-gray-800 mb-2">{data.title}</h4>
      )}

      {data.content && (
        <p className="text-gray-600 leading-relaxed mb-3">{data.content}</p>
      )}

      {data.details && (
        <div className="mt-3 space-y-2">
          {Array.isArray(data.details) ? (
            <ul className="list-disc list-inside space-y-1">
              {data.details.map((detail, i) => (
                <li key={i} className="text-gray-600 text-sm leading-relaxed">
                  {detail}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 text-sm leading-relaxed">{data.details}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CDReport({ report, onRunAgain }) {
  const handleDownloadPDF = () => {
    console.log('Download PDF');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">
            Your CD Direction Report
          </h2>
          <p className="text-gray-500 mt-1">
            AI-generated direction based on your scene and role.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            <Download size={16} />
            Download as PDF
          </button>
          <button
            onClick={onRunAgain}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF8280] text-white font-semibold text-sm hover:bg-[#e06e6c] transition-colors"
          >
            <RotateCcw size={16} />
            Run Again
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <SectionCard
            key={section.key}
            label={section.label}
            data={report?.[section.key]}
          />
        ))}
      </div>
    </div>
  );
}
