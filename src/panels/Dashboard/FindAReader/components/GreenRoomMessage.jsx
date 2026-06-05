import { FileText, ExternalLink, Flag } from 'lucide-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import http from '../../../../redux/http';
import { baseURL } from '../../../../redux/constant';
import { showSnackbar } from '../../../../redux/features/snackbarSlice/snackbarSlice';

const GreenRoomMessage = ({ message, isOwn = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [flagging, setFlagging] = useState(false);
  // Sender avatar → that user's profile. BE GreenRoomMessageSerializer
  // returns senderId (apps/matching/serializers.py:GreenRoomMessageSerializer);
  // we accept the snake_case spelling too in case any consumer normalizes it.
  const senderId = message?.senderId || message?.sender_id;
  const openSender = () => {
    if (!senderId || isOwn) return;
    navigate(`/dashboard/reader-profile/${senderId}`);
  };

  // Per-message flag (Apple guideline 1.2). Only surfaced on partner
  // messages — you don't report yourself. Calls the same content-report
  // endpoint as the user-level ReportBlockMenu but scoped to a single
  // message id so moderators can see exactly what was flagged.
  const handleFlag = async () => {
    const messageId = message.id || message.message_id;
    if (!messageId || isOwn || flagging) return;
    if (typeof window !== 'undefined' && !window.confirm('Report this message?')) return;
    setFlagging(true);
    try {
      await http.post(`${baseURL}/v1/community/report/`, {
        target_type: 'message',
        target_object_id: messageId,
        reason: 'inappropriate',
        details: 'Reported from chat thread.',
      });
      dispatch(showSnackbar({ message: 'Thanks — our team will review this.', variant: 'success' }));
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not submit report.';
      dispatch(showSnackbar({ message: msg, variant: 'error' }));
    } finally {
      setFlagging(false);
    }
  };

  const text = message.text || message.content || '';
  const type = message.message_type || message.type || 'text';

  // Only allow file-message URLs that point at the same origin as our API
  // (BE-served files) or that are blob URLs we ourselves created. Anything
  // else is rejected — the chat is a potential phishing vector if a
  // compromised payload sneaks an attacker-controlled href onto the page.
  const isTrustedFileUrl = (raw) => {
    if (!raw) return false;
    if (raw.startsWith('blob:')) return true;
    try {
      const parsed = new URL(raw, baseURL);
      const expected = new URL(baseURL);
      return parsed.origin === expected.origin;
    } catch {
      return false;
    }
  };

  // Tiny flag affordance shown on partner messages. Inline (not a hover
  // state) so the surface is reachable on touch devices too.
  const flagBtn = (!isOwn && type !== 'system') ? (
    <button
      type="button"
      onClick={handleFlag}
      disabled={flagging}
      title="Report this message"
      aria-label="Report this message"
      style={{
        background: 'transparent',
        border: 'none',
        padding: 4,
        marginLeft: 2,
        color: 'var(--aurora-dim)',
        cursor: flagging ? 'wait' : 'pointer',
        opacity: 0.6,
        alignSelf: 'flex-end',
      }}
    >
      <Flag size={11} />
    </button>
  ) : null;
  const fileUrl = message.file_url || message.fileUrl || '';
  const fileName = message.fileName || (fileUrl ? fileUrl.split('/').pop() : 'Sides');
  const time = message.timestamp
    ? (typeof message.timestamp === 'string' && message.timestamp.includes(':') && message.timestamp.length < 10
        ? message.timestamp
        : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    : '';

  // System message (rehearsal started, AI session, etc.)
  if (type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs rounded-full px-4 py-1.5" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {text}
        </span>
      </div>
    );
  }

  // File / sides message
  if (type === 'file' || type === 'sides' || fileUrl) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 items-end gap-1`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
            isOwn
              ? 'rounded-br-md'
              : 'rounded-bl-md'
          }`}
          style={isOwn ? { background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', color: 'white' } : { background: 'var(--border-default)', color: 'var(--text-primary)' }}
        >
          {!isOwn && message.senderName && (
            <p className="text-[10px] font-semibold mb-1 text-[#7A5A18]">{message.senderName}</p>
          )}
          <a
            href={isTrustedFileUrl(fileUrl) ? fileUrl : undefined}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => {
              if (!isTrustedFileUrl(fileUrl)) {
                e.preventDefault();
                dispatch(showSnackbar({
                  message: "Can't open this file — link looks untrusted.",
                  variant: 'error',
                }));
              }
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : 'bg-[#D4A85F]/20'}`}>
              <FileText size={18} className={isOwn ? 'text-white' : 'text-[#7A5A18]'} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className={`text-xs flex items-center gap-1 ${isOwn ? 'text-white/70' : ''}`} style={!isOwn ? { color: 'var(--text-secondary)' } : {}}>
                <ExternalLink size={10} /> Open file
              </p>
            </div>
          </a>
          <p className={`text-[10px] mt-2 text-right ${isOwn ? 'text-white/60' : ''}`} style={!isOwn ? { color: 'var(--text-muted)' } : {}}>{time}</p>
        </div>
        {flagBtn}
      </div>
    );
  }

  // Regular text message
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 items-end gap-2`}>
      {!isOwn && (
        <button
          type="button"
          onClick={openSender}
          aria-label={`View ${message.senderName || 'sender'}'s profile`}
          className="w-7 h-7 rounded-full bg-[#D4A85F]/20 flex items-center justify-center shrink-0 mb-1 border-0 p-0"
          style={{ cursor: senderId ? 'pointer' : 'default' }}
          disabled={!senderId}
        >
          <span className="text-[#7A5A18] text-[9px] font-bold">
            {(message.senderName || 'R').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </span>
        </button>
      )}
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
          isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={isOwn ? { background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' } : { background: 'var(--border-default)' }}
      >
        {!isOwn && message.senderName && (
          <p className="text-[10px] font-semibold mb-0.5 text-[#7A5A18]">{message.senderName}</p>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{text}</p>
        <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : ''}`} style={!isOwn ? { color: 'var(--text-muted)' } : {}}>
          {time}
        </p>
      </div>
      {flagBtn}
    </div>
  );
};

export default GreenRoomMessage;
