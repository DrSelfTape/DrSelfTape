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
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
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
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{message.subject || 'No Subject'}</h3>
          <p className="text-sm text-gray-500">From: {message.user_name || 'Unknown'}</p>
        </div>
        {!isResolved && (
          <button
            onClick={handleResolve}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Resolved
          </button>
        )}
        {isResolved && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Resolved
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Original message */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">{message.user_name || 'User'}</span>
            <span className="text-xs text-gray-400">
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
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content || message.preview || ''}</p>
        </div>

        {/* Replies */}
        {replies.map((reply, idx) => (
          <div
            key={reply.id || idx}
            className={`rounded-xl p-4 ${
              reply.sender === 'admin'
                ? 'bg-[#FF8280]/5 ml-8 border border-[#FF8280]/10'
                : 'bg-gray-50 mr-8'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">
                {reply.sender === 'admin' ? 'Admin' : reply.sender_name || 'User'}
              </span>
              <span className="text-xs text-gray-400">
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
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {!isResolved && (
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex gap-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              rows={2}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF8280]/30 focus:border-[#FF8280]"
            />
            <button
              onClick={handleSendReply}
              disabled={sending || !replyContent.trim()}
              className="self-end px-4 py-2.5 bg-[#FF8280] text-white rounded-xl hover:bg-[#FF8280]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
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
