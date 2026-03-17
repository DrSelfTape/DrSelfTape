import React from 'react';

/**
 * ScriptCharacterBadge - Reusable character badge component
 * Used in both ScriptAnalysis and AiScenePartnerSession
 * Fully responsive from 320px+
 */
export const ScriptCharacterBadge = ({
  character,
  isActiveLine = false,
  isSelectedCharacter = false,
  isUserLine = false,
  showYouBadge = false,
  isMissing = false,
  hasRecording = false,
  className = '',
}) => {
  // EXACT match to ScriptTab badge styling
  const getBadgeClasses = () => {
    if (isActiveLine) {
      return 'bg-blue-500 text-white';
    }
    if (isSelectedCharacter) {
      return 'bg-green-500 text-white';
    }
    if (isUserLine) {
      return 'bg-green-100 text-green-800 border border-green-300';
    }
    return 'bg-gray-200 text-gray-600';
  };

  return (
    <div
      className={`text-xs font-semibold w-fit px-2 py-1 rounded-md tracking-wide flex items-center gap-2 ${getBadgeClasses()} ${className}`}
    >
      <span>{character}</span>
      {showYouBadge && isSelectedCharacter && isActiveLine && (
        <span
          className='text-xs bg-white text-green-600 font-medium px-1 rounded ml-1'
          title='Your character'
        >
          YOU
        </span>
      )}
      {/* Additional features for AiScenePartnerSession */}
      {hasRecording && (
        <svg className='w-3.5 h-3.5 sm:w-4 sm:h-4' fill='currentColor' viewBox='0 0 20 20'>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      {isMissing && (
        <span className='ml-1 animate-pulse'>⚠</span>
      )}
    </div>
  );
};

