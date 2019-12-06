import * as specificTranslations from "./EEGEduSpectra/translations/en";
import * as generalTranslations from "./translations/en";

export const chartAttributes = {
  wrapperStyle: {
    display: "flex",
    flexWrap: "wrap",
    padding: "20px"
  }
};

export const emptyChannelData = {
  channels: {
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
  }
};

export const spectraOptions = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: specificTranslations.xlabel
        },
        ticks: {
          max: 100,
          min: 0
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: specificTranslations.ylabel
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

export const rawOptions = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: specificTranslations.xlabel
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: specificTranslations.ylabel
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
