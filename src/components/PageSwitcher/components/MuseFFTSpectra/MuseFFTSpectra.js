import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter, fft, sliceFFT } from "@neurosity/pipes";
import { Button, TextContainer, Card, Stack } from "@shopify/polaris";
import { Line } from "react-chartjs-2";
import { chartAttributes, strings } from "../chartOptions";

const axisLabels = {
  xlabel: "Frequency (Hz)",
  ylabel: "Power (\u03BCV\u00B2)"
};

const chartOptions = {
  scales: {
    xAxes: [
      {
        scaleLabel: {
          display: true,
          labelString: axisLabels.xlabel
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
          labelString: axisLabels.ylabel
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
  responsive: true,
  tooltips: { enabled: false },
  legend: { display: false }
};

export class MuseFFTSpectra extends Component {
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
    const { channels } = this.state;

    return Object.values(channels).map((channel, index) => {
      const tempOptions = {
        ...chartOptions,
        title: {
          ...chartOptions.title,
          text: strings.channel + channelNames[index]
        }
      };

      return (
        <Card.Section>
          <Line key={index} data={channel} options={tempOptions} />
        </Card.Section>
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
    } catch (err) {
      console.error(strings.connectionFailed, err);
    }
  };

  render() {
    return (
      <Card title={strings.spectraTitle}>
        <Card.Section>
          <Stack>
            <Button
              primary={this.state.status === strings.disconnected}
              disabled={this.state.button_disabled}
              onClick={this.connect}
            >
              {this.state.status === strings.connected
                ? strings.buttonConnected
                : strings.buttonToConnect}
            </Button>
            <TextContainer>
              <p>{strings.spectraDescription}</p>
            </TextContainer>
          </Stack>
        </Card.Section>
        <Card.Section>
          <div style={chartAttributes.wrapperStyle.style}>
            {this.renderCharts()}
          </div>
        </Card.Section>
      </Card>
    );
  }
}

export default MuseFFTSpectra;
