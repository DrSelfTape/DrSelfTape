import { FileText, ExternalLink } from 'lucide-react';

const GreenRoomMessage = ({ message, isOwn = false }) => {
  const text = message.text || message.content || '';
  const type = message.message_type || message.type || 'text';
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
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
            isOwn
              ? 'rounded-br-md'
              : 'rounded-bl-md'
          }`}
          style={isOwn ? { background: 'linear-gradient(135deg, #C855F0, #E88BF5)', color: 'white' } : { background: 'var(--border-default)', color: 'var(--text-primary)' }}
        >
          {!isOwn && message.senderName && (
            <p className="text-[10px] font-semibold mb-1 text-[#C855F0]">{message.senderName}</p>
          )}
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : 'bg-[#C855F0]/20'}`}>
              <FileText size={18} className={isOwn ? 'text-white' : 'text-[#C855F0]'} />
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
      </div>
    );
  }

  // Regular text message
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 items-end gap-2`}>
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-[#C855F0]/20 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[#C855F0] text-[9px] font-bold">
            {(message.senderName || 'R').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </span>
        </div>
      )}
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
          isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={isOwn ? { background: 'linear-gradient(135deg, #C855F0, #E88BF5)' } : { background: 'var(--border-default)' }}
      >
        {!isOwn && message.senderName && (
          <p className="text-[10px] font-semibold mb-0.5 text-[#C855F0]">{message.senderName}</p>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{text}</p>
        <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : ''}`} style={!isOwn ? { color: 'var(--text-muted)' } : {}}>
          {time}
        </p>
      </div>
    </div>
  );
};

export default GreenRoomMessage;
