import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

export default function MeetingChat({ messages, onSend, unreadCount, onOpen }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all"
        style={{
          background: open ? '#FF8280' : 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <MessageSquare className="w-5 h-5 text-white" />
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] z-[100] flex flex-col"
          style={{ background: 'rgba(13,13,29,0.95)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Chat</h3>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-white/30 text-xs py-8">No messages yet. Say hi!</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                  msg.isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
                }`} style={{
                  background: msg.isMine ? '#FF8280' : 'rgba(255,255,255,0.1)',
                }}>
                  {!msg.isMine && (
                    <p className="text-[10px] font-semibold text-[#A7ECDA] mb-0.5">{msg.sender}</p>
                  )}
                  <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${msg.isMine ? 'text-white/50' : 'text-white/30'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="px-3 py-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30"
              style={{ background: '#FF8280' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
