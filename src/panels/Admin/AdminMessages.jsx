import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Mail, MailOpen, CheckCircle, Archive } from 'lucide-react';
import { fetchAdminMessages, markMessageRead, markMessageResolved } from '../../redux/features/admin/adminSlice';
import AdminMessageThread from './components/AdminMessageThread';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const statusIcon = {
  unread: Mail,
  read: MailOpen,
  resolved: CheckCircle,
};

const statusColor = {
  unread: 'text-[#FF8280]',
  read: 'text-[#666666]',
  resolved: 'text-green-500',
};

export default function AdminMessages() {
  const dispatch = useDispatch();
  const { messages, messagesLoading } = useSelector((state) => state.admin);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminMessages());
  }, [dispatch]);

  const messageList = Array.isArray(messages) ? messages : [];
  const selectedMessage = messageList.find((m) => m.id === selectedId) || null;

  const handleSelectMessage = useCallback(
    (msg) => {
      setSelectedId(msg.id);
      if (msg.status === 'unread') {
        dispatch(markMessageRead(msg.id));
      }
    },
    [dispatch]
  );

  const handleArchive = useCallback(
    (msg) => {
      dispatch(markMessageResolved(msg.id));
    },
    [dispatch]
  );

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
      {/* Message List (40%) */}
      <div className="w-2/5 border-r border-[#2A2A2A] flex flex-col">
        <div className="px-4 py-3 border-b border-[#2A2A2A]">
          <h3 className="font-semibold text-white text-sm">
            Messages ({messageList.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {messageList.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-[#666666]">
              No messages
            </div>
          ) : (
            messageList.map((msg) => {
              const Icon = statusIcon[msg.status] || Mail;
              const isSelected = selectedId === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-[#1E1E1E] transition-colors ${
                    isSelected
                      ? 'bg-[#FF8280]/5 border-l-2 border-l-[#FF8280]'
                      : 'hover:bg-[#1E1E1E] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#FF8280]/10 text-[#FF8280] flex items-center justify-center text-xs font-bold mt-0.5">
                    {getInitials(msg.user_name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate ${msg.status === 'unread' ? 'text-white' : 'text-[#999999]'}`}>
                        {msg.user_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-[#666666] flex-shrink-0 ml-2">
                        {msg.date
                          ? new Date(msg.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${msg.status === 'unread' ? 'font-medium text-white' : 'text-[#999999]'}`}>
                      {msg.subject || 'No Subject'}
                    </p>
                    <p className="text-xs text-[#666666] truncate mt-0.5">
                      {msg.preview || msg.content || ''}
                    </p>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <Icon className={`w-4 h-4 ${statusColor[msg.status] || 'text-gray-400'}`} />
                    {msg.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(msg);
                        }}
                        title="Archive"
                        className="p-1 rounded hover:bg-[#2A2A2A] transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5 text-[#666666]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Thread (60%) */}
      <div className="w-3/5 flex flex-col">
        <AdminMessageThread message={selectedMessage} />
      </div>
    </div>
  );
}
