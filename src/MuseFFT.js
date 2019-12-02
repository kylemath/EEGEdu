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
  channel: "Channel"
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
    },
    options: {
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
              max: 100
            }
          }
        ]
      },
      title: {
        display: true,
        text: strings.channel //+ channelNames[2]
      },
      responsive: true,
      tooltips: { enabled: false },
      legend: { display: false }
    }
  };

  renderCharts() {
    const channelData = this.state.channels;

    return Object.values(channelData).map((channel, index) => {
      return (
        <Line
          key={index}
          data={channel}
          options={this.state.options}
          width={chartAttributes.chartStyle.WIDTH}
          height={chartAttributes.chartStyle.HEIGHT}
        />
      );
    });
  }

  render() {
    return (
      <div className="MuseFFT">
        <button disabled={this.state.button_disabled} onClick={this.connect}>
          Connect Muse Headband
        </button>
        <p>{this.state.status}</p>
        <div style={chartAttributes.wrapperStyle.style}>
          {this.renderCharts()}
        </div>
      </div>
    );
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
            state.channels.ch0.datasets[0].data = data.psd[0];
            state.channels.ch0.xLabels = data.freqs; // get data for x axis labels

            state.channels.ch1.datasets[0].data = data.psd[1];
            state.channels.ch1.xLabels = data.freqs;

            state.channels.ch2.datasets[0].data = data.psd[2];
            state.channels.ch2.xLabels = data.freqs;

            state.channels.ch3.datasets[0].data = data.psd[3];
            state.channels.ch3.xLabels = data.freqs;

            //console.log(data.freqs)

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
}

export default MuseFFT;
