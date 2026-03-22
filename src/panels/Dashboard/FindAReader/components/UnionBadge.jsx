const UnionBadge = ({ union }) => {
  if (!union) return null;
  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full border font-medium"
      style={{
        background: 'rgba(252,224,114,0.15)',
        color: '#FCE072',
        borderColor: 'rgba(252,224,114,0.3)',
      }}
    >
      {union}
    </span>
  );
};

export default UnionBadge;
