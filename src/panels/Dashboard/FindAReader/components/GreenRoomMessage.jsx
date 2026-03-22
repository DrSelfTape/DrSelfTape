import { FileText, ExternalLink } from 'lucide-react';

const GreenRoomMessage = ({ message, isOwn = false }) => {
  const text = message.text || message.content || '';
  const type = message.type || 'text';
  const time = message.timestamp
    ? (message.timestamp.includes(':')
        ? message.timestamp
        : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    : '';

  // System message (rehearsal started, AI session, etc.)
  if (type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-[#666666] bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-4 py-1.5">
          {text}
        </span>
      </div>
    );
  }

  // File / sides message
  if (type === 'file') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
            isOwn
              ? 'rounded-br-md text-white'
              : 'bg-[#2A2A2A] rounded-bl-md text-white'
          }`}
          style={isOwn ? { background: 'linear-gradient(135deg, #C855F0, #E88BF5)' } : {}}
        >
          {!isOwn && message.senderName && (
            <p className="text-[10px] font-semibold mb-1 text-[#C855F0]">{message.senderName}</p>
          )}
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : 'bg-[#C855F0]/20'}`}>
              <FileText size={18} className={isOwn ? 'text-white' : 'text-[#C855F0]'} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName || 'Sides'}</p>
              <p className={`text-xs flex items-center gap-1 ${isOwn ? 'text-white/70' : 'text-[#999999]'}`}>
                <ExternalLink size={10} /> Open file
              </p>
            </div>
          </a>
          <p className={`text-[10px] mt-2 ${isOwn ? 'text-white/60' : 'text-[#666666]'} text-right`}>{time}</p>
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
          isOwn ? 'rounded-br-sm' : 'rounded-bl-sm bg-[#2A2A2A]'
        }`}
        style={isOwn ? { background: 'linear-gradient(135deg, #C855F0, #E88BF5)' } : {}}
      >
        {!isOwn && message.senderName && (
          <p className="text-[10px] font-semibold mb-0.5 text-[#C855F0]">{message.senderName}</p>
        )}
        <p className="text-sm leading-relaxed text-white">{text}</p>
        <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-[#666666]'}`}>
          {time}
        </p>
      </div>
    </div>
  );
};

export default GreenRoomMessage;
