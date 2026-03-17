import Chart from 'react-apexcharts';

export const LineBarChat = () => {
  const optionSeries = {
    options: {
      // CHART OPTIONS
      chart: {
        id: 'basic-bar',
        toolbar: {
          show: false,
          tools: {
            zoom: false,
            zoomin: false,
            zoomout: false,
          },
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0,
          opacityFrom: 0.4,
          opacityTo: 0.4,
          type: 'vertical',
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        categories: [
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
        ],
        // labels: {
        //   show: true,
        //   align: 'center',
        //   style: {
        //     fontSize: '12px',
        //     fontFamily: "'Inter', 'sans-serif'",
        //   },
        //   formatter: function (val) {
        //     return val;
        //   },
        // },
      },
      yaxis: {
        // show: false,
        tickAmount: 3,
        labels: {
          formatter: function (value) {
            return '$' + value + 'm';
          },
        },
      },
      tooltip: {
        enabled: false,
      },
    },
    series: [
      {
        name: 'series-1',
        data: [1, 2, 2.5, 2.5, 3, 4],
        stroke: {
          width: 1,
          curve: 'smooth',
        },
      },
    ],
  };
  return (
    <>
      <div id='chart'>
        <Chart
          options={optionSeries.options}
          series={optionSeries.series}
          type='area'
          width='100%'
          height='350px'
        />
      </div>
    </>
  );
};
