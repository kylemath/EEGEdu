import * as generalTranslations from "./translations/en";

export const chartStyles = {
  wrapperStyle: {
    display: "flex",
    flexWrap: "wrap",
    padding: "20px"
  }
};

export const emptyChannelData = {
  ch0: {
    dataSets: [{}]
  },
  ch1: {
    dataSets: [{}]
  },
  ch2: {
    dataSets: [{}]
  },
  ch3: {
    dataSets: [{}]
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
  animation: {
    duration: 0
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
