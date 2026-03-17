import React from 'react';
import ReactApexChart from 'react-apexcharts';

const DonutChart = () => {
  const option = {
    series: [25, 25, 18, 32],
    options: {
      chart: {
        // width: 20,
        type: 'donut',
      },
      plotOptions: {
        pie: {
          donut: {
            size: 75,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 175,
            },
            legend: {
              show: false,
            },
          },
        },
      ],
      legend: {
        show: false,
        position: 'right',
        offsetY: 0,
        height: 230,
      },
      tooltip: {
        enabled: false,
      },
      colors: ['#0A090B', '#1751D0', '#B8DEE9', '#63C888'],
    },
  };

  return (
    <React.Fragment>
      <div id='chart' className='flex justify-between items-start'>
        <ReactApexChart
          options={option.options}
          series={option.series}
          type='donut'
          width={128}
          height={'160px'}
        />
      </div>
      <div />
    </React.Fragment>
  );
};

export default DonutChart;
