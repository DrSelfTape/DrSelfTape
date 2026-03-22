import React from 'react';

/**
 * ScriptLineContainer - Reusable container for script lines
 * Provides consistent layout and styling for script line lists
 * Fully responsive from 320px+
 */
export const ScriptLineContainer = ({
  children,
  className = '',
  maxHeight = '22rem',
}) => {
  // Use fixed height when maxHeight is '22rem' to match original ScriptTab behavior
  // Otherwise use maxHeight for flexibility
  const useFixedHeight = maxHeight === '22rem';
  
  return (
    <div
      className={`p-4 overflow-auto space-y-3 ${className}`}
      style={useFixedHeight ? { height: '22rem' } : { 
        maxHeight: maxHeight !== 'auto' ? maxHeight : undefined,
        height: maxHeight === 'auto' ? 'auto' : undefined,
      }}
    >
      {children}
    </div>
  );
};

