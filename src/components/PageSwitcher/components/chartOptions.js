export const chartAttributes = {
  wrapperStyle: {
    display: "flex",
    flexWrap: "wrap",
    padding: "20px"
  }
};

export const emptyChannelData = {
  ch0: {
    datasets: [{}]
  },
  ch1: {
    datasets: [{}]
  },
  ch2: {
    datasets: [{}]
  },
  ch3: {
    datasets: [{}]
  }
};

export const generalOptions = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          display: true
        }
      }
    ]
  },
  elements: {
    point: {
      radius: 0
    }
  },
  title: {
    display: true,
    text: generalTranslations.channel
  },
  responsive: true,
  tooltips: { enabled: false },
  legend: { display: false }
};
