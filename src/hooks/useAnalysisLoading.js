import { useState, useEffect, useRef } from 'react';

const ANALYSIS_MESSAGES = [
  'Reading script...',
  'Identifying characters...',
  'Generating beats...',
  'Analyzing scenes...',
  'Almost done...',
];

export const useAnalysisLoading = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isAnalyzing) {
      // Start looping messages
      intervalRef.current = setInterval(() => {
        setCurrentMessageIndex((prev) => 
          (prev + 1) % ANALYSIS_MESSAGES.length
        );
      }, 2000); // Change message every 2 seconds
    } else {
      // Clear interval when not analyzing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentMessageIndex(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAnalyzing]);

  const startAnalysis = () => setIsAnalyzing(true);
  const stopAnalysis = () => setIsAnalyzing(false);

  return {
    isAnalyzing,
    currentMessage: ANALYSIS_MESSAGES[currentMessageIndex],
    startAnalysis,
    stopAnalysis,
  };
};
