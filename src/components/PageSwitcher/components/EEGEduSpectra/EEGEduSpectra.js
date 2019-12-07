import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter, fft, sliceFFT } from "@neurosity/pipes";
import { Button, TextContainer, Card, Stack } from "@shopify/polaris";
import { Line } from "react-chartjs-2";
import { chartStyles } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

const chartOptions = {
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

export class EEGEduSpectra extends Component {
  state = {
    status: generalTranslations.connect,
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
          text: generalTranslations.channel + channelNames[index]
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
        status: status
          ? generalTranslations.connected
          : generalTranslations.connect,
        button_disabled: status
      });

      console.log(
        status ? generalTranslations.connected : generalTranslations.connect
      );
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

            console.log({
              ch0: state.channels.ch0,
              ch1: state.channels.ch1,
              ch2: state.channels.ch2,
              ch3: state.channels.ch3
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
      console.error(generalTranslations.connectionFailed, err);
    }
  };

  render() {
    return (
      <Card title={specificTranslations.title}>
        <Card.Section>
          <Stack>
            <Button
              primary={this.state.status === generalTranslations.connect}
              disabled={this.state.button_disabled}
              onClick={this.connect}
            >
              {this.state.status === generalTranslations.connected
                ? generalTranslations.connected
                : generalTranslations.connect}
            </Button>
            <TextContainer>
              <p>{specificTranslations.description}</p>
            </TextContainer>
          </Stack>
        </Card.Section>
        <Card.Section>
          <div style={chartStyles.wrapperStyle.style}>
            {this.renderCharts()}
          </div>
        </Card.Section>
      </Card>
    );
  }
}

export default EEGEduSpectra;
