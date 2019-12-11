import * as translations from "./translations/en";
import * as PageSwitcherTranslation from "../../translations/en";

export const chartStyles = {
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

const generalOptions = {
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
    text: PageSwitcherTranslation.channel
  },
  responsive: true,
  tooltips: { enabled: false },
  legend: { display: false }
};

export const rawOptions = {
  ...generalOptions,
  scales: {
    xAxes: [
      {
        scaleLabel: {
          ...generalOptions.scales.xAxes[0].scaleLabel,
          labelString: translations.charts.raw.xlabel
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          ...generalOptions.scales.yAxes[0].scaleLabel,
          labelString: translations.charts.raw.ylabel
        }
      }
    ]
  },
  animation: {
    duration: 0
  }
};

export const spectraOptions = {
  ...generalOptions,
  scales: {
    xAxes: [
      {
        scaleLabel: {
          ...generalOptions.scales.xAxes[0].scaleLabel,
          labelString: translations.charts.spectra.xlabel
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          ...generalOptions.scales.yAxes[0].scaleLabel,
          labelString: translations.charts.spectra.ylabel
        },
        ticks: {
          max: 100,
          min: 0
        }
      }
    ]
  }
};
