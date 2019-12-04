import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, fft, sliceFFT } from "@neurosity/pipes";
import { Line } from "react-chartjs-2";

import "./MuseFFT.css";

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
  frequency: "Frequency (Hz)",
  power: "Power (\u03BCV\u00B2)",
  channel: "Channel: "
};

const chartOptions = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: strings.frequency
        }
      }
    ],
    yAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: strings.power
        },
        ticks: {
          max: 100,
          min: 0
        }
      }
    ]
  },
  title: {
    display: true,
    text: strings.channel
  },
  responsive: false,
  tooltips: { enabled: false },
  legend: { display: false }
};

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

  renderCharts() {
    const {channels} = this.state;

    return Object.values(channels).map((channel, index) => {
      const tempOptions = {
        ...chartOptions,
        title: {
          ...chartOptions.title,
          text: strings.channel + channelNames[index],
        },
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

      zipSamples(client.eegReadings)
        .pipe(
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
    } catch (err) {
      console.error(strings.connectionFailed, err);
    }
  };

  render() {
    return (
      <div className="MuseFFT">
        <p>
          <h3>EEGEdu </h3>
          Welcome to the EEGEdu live EEG tutorial. This tutorial is designed to be used with 
          the Muse and the Muse 2 headbands from Interaxon and will walk you through the basics of EEG 
          signal generation, data collection, and analysis with a focus on live control based on physiological 
          signals. All demos are done in this browser. The first step will be to turn on your Muse headband 
          and click the connect button. This will open a screen and will list available Muse devices. Select 
          the serial number written on your Muse. 
        </p>
        <hr></hr>
        <button disabled={this.state.button_disabled} onClick={this.connect}>
          Connect Muse Headband
        </button>
        <p> The current state of your Muse headband is: </p>
        <p>{this.state.status}</p>
        <hr></hr>      
        <p>
          <h3> Raw Data </h3>
          First we look at the raw voltage signals coming from each of the four sensors on the muse. 
          TP9 and TP10 are on the ears, AF7 and AF8 are on the forehead. In general EEG electrodes are 
          odd on the left hemisphere and even on the right, and have suffixed with z along the midline.
        </p>        
        <hr></hr>      
        <p>
          <h3> Frequency Domain </h3>
          In the next demo we will look at the same signal in the frequency domain. We want to identify 
          the magnitude of oscillations of different frequencies in our live signal. We use the fast fourier
          transform to convert the voltage values over time to the power at each frequency. To use the fft
          we pick a particular chunk of data and get an output called a spectra. Each time the chart updates 
          a new window of data is selected.
          <div style={chartAttributes.wrapperStyle.style}>
            {this.renderCharts()}
          </div>
        </p>

        <p>
        <hr></hr>
            EEGEdu - An Interactive Electrophysiology Tutorial with the Muse brought to you by Mathewson Sons
        </p>
      </div>
    );
  }
}

export default MuseFFT;
