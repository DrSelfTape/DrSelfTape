import React from 'react';
import { ScriptCharacterBadge } from './ScriptCharacterBadge';

/**
 * ScriptLineCard - Reusable script line card component
 * Used in both ScriptAnalysis and AiScenePartnerSession
 * 
 * Uses slot pattern for text rendering (flexible - can accept HighlightedText or plain text)
 * Fully responsive from 320px+
 */
export const ScriptLineCard = ({
  line,
  index,
  isActiveLine,
  isPlaying,
  isUserLine,
  isSelectedCharacter,
  onClick,
  children,
  className = '',
  enableAnnotations = false,
  annotationComponent: AnnotationComponent,
  lineId,
  versionId,
  isMissing = false,
  hasRecording = false,
  hasAudioIssue = false,
  canAccessLine = true,
  // Flexible text rendering - accepts ReactNode (HighlightedText, plain text, or any component)
  textSlot,
}) => {
  // EXACT match to ScriptTab card styling
  const getCardClasses = () => {
    const baseClasses = 'flex flex-col gap-2 p-4 rounded-lg border transition-all duration-200 cursor-pointer';
    
    if (isActiveLine) {
      return isPlaying
        ? `${baseClasses} bg-green-50 border-green-400 shadow-md`
        : `${baseClasses} bg-blue-50 border-blue-300 shadow-sm`;
    }
    
    return `${baseClasses} bg-gray-50 border-gray-200 hover:bg-gray-100`;
  };

  return (
    <div
      id={`line-${index}`}
      onClick={canAccessLine ? onClick : undefined}
      className={`${getCardClasses()} ${className}`}
    >
      {/* Character Badge Row - EXACT match to ScriptTab */}
      <div className='flex justify-between items-center'>
        <ScriptCharacterBadge
          character={line.character}
          isActiveLine={isActiveLine}
          isSelectedCharacter={isSelectedCharacter}
          isUserLine={isUserLine}
          showYouBadge={enableAnnotations}
          isMissing={isMissing}
          hasRecording={hasRecording}
        />
        
        {/* LineAnnotation - EXACT match to ScriptTab behavior */}
        {enableAnnotations && isSelectedCharacter && AnnotationComponent && (
          <AnnotationComponent lineId={lineId} versionId={versionId} />
        )}
      </div>

      {/* Line Text - Flexible slot pattern */}
      <p className='text-sm leading-relaxed'>
        {textSlot || <span className='text-gray-700'>{line.line || line.text}</span>}
      </p>

      {/* Tip/Stage Direction - EXACT match to ScriptTab */}
      {line.tip && (
        <div className='mt-1 px-2 py-1 bg-blue-500 text-white rounded text-xs w-fit shadow-sm'>
          💡 {line.tip}
        </div>
      )}

      {/* Missing Recording Badge - For AiScenePartnerSession */}
      {isMissing && (
        <div className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-medium shadow-sm'>
          <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Missing Recording</span>
        </div>
      )}

      {/* Audio Issue Badge - For AiScenePartnerSession */}
      {!isMissing && hasAudioIssue && !isUserLine && (
        <div className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs font-medium'>
          <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/>
          </svg>
          <span>Audio Not Available</span>
        </div>
      )}

      {/* Custom Children - Recording controls, review controls, etc. */}
      {children}
    </div>
  );
};

