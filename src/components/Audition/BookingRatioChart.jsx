import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const BookingRatioChart = ({
  data = [],
  stackKeys = [],
  colors = [],
  width = '100%',
  height = 260,
}) => {
  return (
    <>
  <style>
  {`
    .recharts-wrapper:focus,
    .recharts-wrapper:active,
    .recharts-wrapper *:focus,
    .recharts-wrapper *:active,
    .recharts-wrapper *:hover {
      outline: none !important;
      border: none !important;
      background-color: transparent !important;
      user-select: none !important;
    }

    /* Target rects in chart (bars) */
    .recharts-rectangle {
      transition: none !important;
    }

    .recharts-rectangle:hover {
      fill-opacity: 1 !important;
      stroke: none !important;
    }
  `}
</style>

    <ResponsiveContainer width={width} height={height}>
      <BarChart
        data={data}
        stackOffset='sign'
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='name' />
        <YAxis />
        <Tooltip />
        <Legend />
        <ReferenceLine y={0} stroke='#000' />
        
        {stackKeys?.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index] || '#8884d8'}
            stackId='stack'
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
    </>
  );
};

export default BookingRatioChart;
