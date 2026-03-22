const GreenRoomMessage = ({ message, isOwn = false }) => {
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'bg-[#C855F0] text-white rounded-br-md'
            : 'bg-[#2A2A2A] text-[#0f0f1a] rounded-bl-md'
        }`}
      >
        {!isOwn && message.sender_name && (
          <p className="text-[10px] font-semibold mb-0.5 opacity-70">
            {message.sender_name}
          </p>
        )}
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? 'text-white/70' : 'text-[#666666]'
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
};

export default GreenRoomMessage;
