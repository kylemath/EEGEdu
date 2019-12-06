import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter, fft, sliceFFT } from "@neurosity/pipes";
import { Line } from "react-chartjs-2";

import "./MuseFFT.css";

//This is a development feature to toggle the data streamed to the graphs
//eventually we want to make this a switch or button on the page and only show one graph
var raw_toggle = true;

const chartAttributes = {
  wrapperStyle: {
    display: "flex",
    flexWrap: "wrap",
    padding: "20px"
  },
  chartStyle: {
    WIDTH: 500,
    HEIGHT: 250
  }
};

const strings = {
  connected: "Connected",
  disconnected: "Disconnected",
  connectionFailed: "Connection failed",
  channel: "Channel: "
};

//-------------------------------------------
// Raw Data Chart
//-------------------------------------------

const stringsRaw = {
  xlabel: "Time (msec)",
  ylabel: "Voltage (\u03BCV)"
};

const chartOptionsRaw = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: stringsRaw.xlabel
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: stringsRaw.ylabel
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
    text: strings.channel
  },
  responsive: false,
  tooltips: { enabled: false },
  legend: { display: false }
};

//-------------------------------------------
// Spectra Chart
//-------------------------------------------

const stringsSpectra = {
  xlabel: "Frequency (Hz)",
  ylabel: "Power (\u03BCV\u00B2)"
};

const chartOptionsSpectra = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: stringsSpectra.xlabel
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
          labelString: stringsSpectra.ylabel
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
    text: strings.channel
  },
  responsive: false,
  tooltips: { enabled: false },
  legend: { display: false }
};

//--------------------------------------------

// Function to count by n to something
function range(start, end, step = 1) {
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
}

export class MuseFFT extends Component {
  state = {
    status: strings.disconnected,
    button_disabled: false,
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

  renderChartsRaw() {
    const { channels } = this.state;

    return Object.values(channels).map((channel, index) => {
      const tempOptions = {
        ...chartOptionsRaw,
        title: {
          ...chartOptionsRaw.title,
          text: strings.channel + channelNames[index]
        }
      };

      return (
        <Line
          key={index}
          data={channel}
          options={tempOptions}
          width={chartAttributes.chartStyle.WIDTH}
          height={chartAttributes.chartStyle.HEIGHT}
        />
      );
    });
  }

  renderChartsSpectra() {
    const { channels } = this.state;

    return Object.values(channels).map((channel, index) => {
      const tempOptions = {
        ...chartOptionsSpectra,
        title: {
          ...chartOptionsSpectra.title,
          text: strings.channel + channelNames[index]
        }
      };

      return (
        <Line
          key={index}
          data={channel}
          options={tempOptions}
          width={chartAttributes.chartStyle.WIDTH}
          height={chartAttributes.chartStyle.HEIGHT}
        />
      );
    });
  }

  connect = async () => {
    const client = new MuseClient();

    client.connectionStatus.subscribe(status => {
      this.setState({
        status: status ? strings.connected : strings.disconnected,
        button_disabled: status
      });

      console.log(status ? strings.connected : strings.disconnected);
    });

    try {
      await client.connect();
      await client.start();

      if (raw_toggle) {
        zipSamples(client.eegReadings)
          .pipe(
            bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
            epoch({ duration: 1024, interval: 50, samplingRate: 256 })
          )
          .subscribe(data => {
            this.setState(state => {
              Object.values(state.channels).forEach((channel, index) => {
                channel.datasets[0].data = data.data[index];
                var srate = data.info.samplingRate;
                var xtimes = range(
                  (1000 / srate) * data.data[2].length,
                  1000 / srate,
                  -(1000 / srate)
                );
                xtimes = xtimes.map(function(each_element) {
                  return Number(each_element.toFixed(0));
                });
                channel.xLabels = xtimes;
              });

              return {
                ch0: state.channels.ch0,
                ch1: state.channels.ch1,
                ch2: state.channels.ch2,
                ch3: state.channels.ch3
              };
            });
          });
      } else {
        zipSamples(client.eegReadings)
          .pipe(
            bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
            epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
            fft({ bins: 256 }),
            sliceFFT([1, 30])
          )
          .subscribe(data => {
            this.setState(state => {
              Object.values(state.channels).forEach((channel, index) => {
                channel.datasets[0].data = data.psd[index];
                channel.xLabels = data.freqs;
              });

              return {
                ch0: state.channels.ch0,
                ch1: state.channels.ch1,
                ch2: state.channels.ch2,
                ch3: state.channels.ch3
              };
            });
          });
      }
    } catch (err) {
      console.error(strings.connectionFailed, err);
    }
  };

  render() {
    return (
      <div className="MuseFFT">
        <button disabled={this.state.button_disabled} onClick={this.connect}>
          Connect Muse Headband
        </button>
        <p> The current state of your Muse headband is: </p>
        <p>{this.state.status}</p>
        <hr></hr>
        <h3> Raw Data </h3>
        <p>
          First we look at the raw voltage signals coming from each of the four
          sensors on the muse. TP9 and TP10 are on the ears, AF7 and AF8 are on
          the forehead. In general EEG electrodes are odd on the left hemisphere
          and even on the right, and have suffixed with z along the midline.
        </p>
        <div style={chartAttributes.wrapperStyle.style}>
          {this.renderChartsRaw()}
        </div>
        <hr></hr>
        {/*
          // <h3> Frequency Domain </h3>
          //   <p>
          //     In the next demo we will look at the same signal in the frequency domain. We want to identify
          //     the magnitude of oscillations of different frequencies in our live signal. We use the fast fourier
          //     transform to convert the voltage values over time to the power at each frequency. To use the fft
          //     we pick a particular chunk of data and get an output called a spectra. Each time the chart updates
          //     a new window of data is selected.
          //   </p>
          //   <div style={chartAttributes.wrapperStyle.style}>
          //     {this.renderChartsSpectra()}
          //   </div>
          // <hr></hr>
        */}

        <p>
          EEGEdu - An Interactive Electrophysiology Tutorial with the Muse
          brought to you by Mathewson Sons
        </p>
      </div>
    );
  }
}

export default MuseFFT;
