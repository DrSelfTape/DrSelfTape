import PerformanceMetrics from './PerformanceMetrics';

const PerformanceGrowth = () => {
  const metricsData = [
    {
      label: 'Delivery Confidence',
      improvement: '+15% improvement',
      color: '#A7ECDA',
      progress: 75,
    },
    {
      label: 'Emotional Range',
      improvement: '+8% improvement',
      color: '#FCE072',
      progress: 62,
    },
    {
      label: 'Scene Analysis',
      improvement: '+20% improvement',
      color: '#FFB49A',
      progress: 80,
    },
    {
      label: 'Memorization Speed',
      improvement: '+12% improvement',
      color: '#C855F0',
      progress: 68,
    },
  ];
  return <PerformanceMetrics metrics={metricsData} />;
};

export default PerformanceGrowth;
