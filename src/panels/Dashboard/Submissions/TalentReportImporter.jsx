/**
 * TalentReportImporter.jsx
 * Upload an agency talent report PDF → GPT-4o parses it → preview → import to submissions
 */
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  parseTalentReportThunk,
  importSubmissionsThunk,
  fetchSubmissionsThunk,
  clearParsedReport,
} from '../../../redux/features/submissions/submissionsSlice';

const STATUS_COLOR = {
  callback: '#FCE072',
  self_tape: '#A7ECDA',
  audition: '#FF8280',
  submitted: '#8a9a96',
};

function statusFromRow(row) {
  if (row.callback_date) return 'callback';
  if (row.audition_date) return 'audition';
  if (row.self_tape_date) return 'self_tape';
  return 'submitted';
}

function SubmissionPreviewRow({ row, selected, onToggle }) {
  const status = statusFromRow(row);
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        background: selected ? 'rgba(167,236,218,0.06)' : 'transparent',
        borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s',
        borderBottom: '1px solid rgba(167,236,218,0.05)',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? '#A7ECDA' : 'rgba(167,236,218,0.2)'}`,
        background: selected ? '#A7ECDA' : 'transparent', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>
        {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#080a0f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      {/* Status dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[status] || '#8a9a96', flexShrink: 0 }} />

      {/* Project + Role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#f2f0ed', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.project}</p>
        <p style={{ fontSize: 11, color: '#8a9a96', margin: 0 }}>{row.role} · {row.casting_director}</p>
      </div>

      {/* Date */}
      <span style={{ fontSize: 11, color: '#4a5a56', flexShrink: 0 }}>
        {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
      </span>

      {/* Status badge */}
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0,
        background: `${STATUS_COLOR[status]}18`, color: STATUS_COLOR[status] || '#8a9a96',
      }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    </div>
  );
}

export default function TalentReportImporter({ onClose, onImported }) {
  const dispatch = useDispatch();
  const { parseLoading, parsedReport, importLoading, error } = useSelector(s => s.submissions);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importDone, setImportDone] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    const result = await dispatch(parseTalentReportThunk(file));
    if (parseTalentReportThunk.fulfilled.match(result)) {
      // Select all by default
      const allIds = new Set((result.payload?.submissions || []).map((_, i) => i));
      setSelectedIds(allIds);
    }
  };

  const toggleAll = () => {
    const total = parsedReport?.submissions?.length || 0;
    if (selectedIds.size === total) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(Array.from({ length: total }, (_, i) => i)));
    }
  };

  const toggleRow = (idx) => {
    const next = new Set(selectedIds);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (!parsedReport?.submissions || selectedIds.size === 0) return;
    const toImport = parsedReport.submissions.filter((_, i) => selectedIds.has(i));
    const result = await dispatch(importSubmissionsThunk(toImport));
    if (importSubmissionsThunk.fulfilled.match(result)) {
      setImportDone(result.payload?.created || toImport.length);
      dispatch(fetchSubmissionsThunk());
      setTimeout(() => {
        onImported?.();
        onClose();
      }, 1800);
    }
  };

  const subs = parsedReport?.submissions || [];
  const displaySubs = showAll ? subs : subs.slice(0, 15);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#13151d', borderRadius: 20, border: '1px solid rgba(167,236,218,0.1)', width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(167,236,218,0.07)' }}>
          <div>
            <h2 style={{ color: '#f2f0ed', fontSize: 18, fontWeight: 700, margin: 0 }}>Import Agency Report</h2>
            <p style={{ color: '#8a9a96', fontSize: 13, margin: '3px 0 0' }}>Upload your talent report PDF and we'll parse it automatically</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#8a9a96' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Import success */}
          {importDone !== null && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(94,230,184,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={30} color="#5ee6b8" />
              </div>
              <h3 style={{ color: '#f2f0ed', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Imported!</h3>
              <p style={{ color: '#8a9a96', fontSize: 14, margin: 0 }}>{importDone} submissions added to your tracker</p>
            </div>
          )}

          {/* Upload zone — shown when no report yet */}
          {!parsedReport && !parseLoading && importDone === null && (
            <div
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0]); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#A7ECDA' : 'rgba(167,236,218,0.2)'}`,
                borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                background: dragActive ? 'rgba(167,236,218,0.04)' : 'transparent', transition: 'all 0.2s',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,130,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Upload size={24} color="#FF8280" />
              </div>
              <p style={{ color: '#f2f0ed', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Drop your talent report PDF here</p>
              <p style={{ color: '#8a9a96', fontSize: 13, margin: '0 0 16px' }}>Eco Cast, agency submission reports — any standard format</p>
              <div style={{ display: 'inline-block', background: 'rgba(255,130,128,0.12)', border: '1px solid rgba(255,130,128,0.25)', borderRadius: 20, padding: '6px 18px', fontSize: 12, color: '#FF8280', fontWeight: 600 }}>
                Choose PDF
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
            </div>
          )}

          {/* Parsing loader */}
          {parseLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(167,236,218,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Loader2 size={26} color="#A7ECDA" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <p style={{ color: '#f2f0ed', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Parsing {fileName}...</p>
              <p style={{ color: '#8a9a96', fontSize: 13, margin: 0 }}>GPT-4o is reading your report</p>
            </div>
          )}

          {/* Error */}
          {error && !parsedReport && (
            <div style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} color="#FF8280" />
              <p style={{ color: '#FF8280', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Parsed report preview */}
          {parsedReport && importDone === null && (
            <>
              {/* Summary strip */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Submissions', value: parsedReport.summary?.total_submissions || subs.length, color: '#A7ECDA' },
                  { label: 'Auditions', value: parsedReport.summary?.total_auditions || 0, color: '#FF8280' },
                  { label: 'Callbacks', value: parsedReport.summary?.total_callbacks || 0, color: '#FCE072' },
                  { label: 'Self Tapes', value: parsedReport.summary?.total_self_tapes || 0, color: '#7eb8ec' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#1a1c26', borderRadius: 12, padding: '10px 16px', flex: 1, minWidth: 100, textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '0 0 2px' }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: '#8a9a96', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Talent info */}
              {parsedReport.talent_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <FileText size={15} color="#A7ECDA" />
                  <span style={{ fontSize: 13, color: '#8a9a96' }}>
                    <strong style={{ color: '#f2f0ed' }}>{parsedReport.talent_name}</strong>
                    {parsedReport.period_start && ` · ${parsedReport.period_start} → ${parsedReport.period_end}`}
                  </span>
                </div>
              )}

              {/* Select all */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#A7ECDA', fontWeight: 600, padding: 0 }}>
                  {selectedIds.size === subs.length ? 'Deselect All' : `Select All (${subs.length})`}
                </button>
                <span style={{ fontSize: 12, color: '#4a5a56' }}>{selectedIds.size} selected</span>
              </div>

              {/* Rows */}
              <div style={{ background: '#1a1c26', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                {displaySubs.map((row, i) => (
                  <SubmissionPreviewRow key={i} row={row} selected={selectedIds.has(i)} onToggle={() => toggleRow(i)} />
                ))}
              </div>

              {subs.length > 15 && (
                <button onClick={() => setShowAll(!showAll)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9a96', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto 4px', padding: '4px 8px' }}>
                  {showAll ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {subs.length} submissions</>}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {parsedReport && importDone === null && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(167,236,218,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => { dispatch(clearParsedReport()); setFileName(''); setSelectedIds(new Set()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8a9a96' }}>
              ← Upload different file
            </button>
            <button
              onClick={handleImport}
              disabled={selectedIds.size === 0 || importLoading}
              style={{
                background: selectedIds.size > 0 ? 'linear-gradient(135deg, #FF8280, #e06e6c)' : 'rgba(255,255,255,0.05)',
                color: selectedIds.size > 0 ? '#fff' : '#4a5a56',
                border: 'none', borderRadius: 12, padding: '10px 24px', fontSize: 14, fontWeight: 600,
                cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
            >
              {importLoading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              Import {selectedIds.size} Submission{selectedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
