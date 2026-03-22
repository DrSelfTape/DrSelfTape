import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Send, CheckCircle } from 'lucide-react';
import { replyToMessage, markMessageResolved } from '../../../redux/features/admin/adminSlice';

export default function AdminMessageThread({ message }) {
  const dispatch = useDispatch();
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  if (!message) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#666666] text-sm">
        Select a message to view the thread
      </div>
    );
  }

  const replies = message.replies || [];
  const isResolved = message.status === 'resolved';

  const handleSendReply = async () => {
    if (!replyContent.trim() || sending) return;
    setSending(true);
    try {
      await dispatch(replyToMessage({ id: message.id, content: replyContent })).unwrap();
      setReplyContent('');
    } catch {
      // error handled by slice
    } finally {
      setSending(false);
    }
  };

  const handleResolve = () => {
    dispatch(markMessageResolved(message.id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">{message.subject || 'No Subject'}</h3>
          <p className="text-sm text-[#999999]">From: {message.user_name || 'Unknown'}</p>
        </div>
        {!isResolved && (
          <button
            onClick={handleResolve}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/10 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Resolved
          </button>
        )}
        {isResolved && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Resolved
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Original message */}
        <div className="bg-[#1E1E1E] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">{message.user_name || 'User'}</span>
            <span className="text-xs text-[#666666]">
              {message.date
                ? new Date(message.date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>
          <p className="text-sm text-[#999999] whitespace-pre-wrap">{message.content || message.preview || ''}</p>
        </div>

        {/* Replies */}
        {replies.map((reply, idx) => (
          <div
            key={reply.id || idx}
            className={`rounded-xl p-4 ${
              reply.sender === 'admin'
                ? 'bg-[#C855F0]/5 ml-8 border border-[#C855F0]/10'
                : 'bg-[#1E1E1E] mr-8'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">
                {reply.sender === 'admin' ? 'Admin' : reply.sender_name || 'User'}
              </span>
              <span className="text-xs text-[#666666]">
                {reply.date
                  ? new Date(reply.date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>
            <p className="text-sm text-[#999999] whitespace-pre-wrap">{reply.content}</p>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {!isResolved && (
        <div className="px-6 py-4 border-t border-[#2A2A2A]">
          <div className="flex gap-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              rows={2}
              className="flex-1 px-4 py-2.5 border border-[#3A3A3A] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
            />
            <button
              onClick={handleSendReply}
              disabled={sending || !replyContent.trim()}
              className="self-end px-4 py-2.5 bg-[#C855F0] text-white rounded-xl hover:bg-[#C855F0]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="text-sm font-medium">Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
