export const HighlightedText = ({
  text,
  lineIndex,
  currentLineIndex,
  highlightedWordIndex,
  selectedCharacter,
}) => {
  const words = text.split(' ');
  const isCurrentLine = lineIndex === currentLineIndex;
  const word = selectedCharacter?.character?.label;

  return words.map((wordText, wordIndex) => {
    const isHighlighted = isCurrentLine && wordIndex === highlightedWordIndex;
    const isCharacterName =
      word && wordText.toUpperCase() === word.toUpperCase();

    return (
      <span
        key={wordIndex}
        className={`transition-all duration-300 ${
          isHighlighted
            ? 'bg-yellow-300 text-black scale-105 px-1 rounded'
            : ''
        } ${
          isCharacterName
            ? 'border border-green-500 bg-green-100 text-green-800 px-1 rounded font-bold'
            : ''
        } ${!isHighlighted && !isCharacterName ? 'text-gray-700' : ''}`}
      >
        {wordText}{' '}
      </span>
    );
  });
};

