const GenreTags = ({ genres = [] }) => (
  <div className="flex flex-wrap gap-1.5">
    {genres.map((genre) => (
      <span
        key={genre}
        className="text-xs px-2.5 py-0.5 rounded-full border"
        style={{
          background: 'rgba(167,236,218,0.15)',
          color: '#A7ECDA',
          borderColor: 'rgba(167,236,218,0.3)',
        }}
      >
        {genre}
      </span>
    ))}
  </div>
);

export default GenreTags;
