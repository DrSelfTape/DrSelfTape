const AvailabilityStatus = ({ online }) => (
  <div className="flex items-center gap-1.5">
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{ background: online ? '#22C55E' : '#6B7280' }}
    />
    <span className="text-xs" style={{ color: online ? '#4ADE80' : '#9CA3AF' }}>
      {online ? 'Available Now' : 'Offline'}
    </span>
  </div>
);

export default AvailabilityStatus;
