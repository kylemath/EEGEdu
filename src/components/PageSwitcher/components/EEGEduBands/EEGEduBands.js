import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter, fft, powerByBand } from "@neurosity/pipes";
import { Button, TextContainer, Card, Stack } from "@shopify/polaris";
import { Bar } from "react-chartjs-2";
import { chartAttributes } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

const chartOptions = {
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
        },
        ticks: {
          max: 50,
          min: 0
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

//Labels for the x axis
var bandLabels = ["Delta", "Theta", "Alpha", "Beta", "Gamma"];


export class EEGEduBands extends Component {
  state = {
    status: generalTranslations.disconnected,
    button_disabled: false,
    channels: {
      ch0: {
        labels: bandLabels,
        datasets: [{}]
      },
      ch1: {
        labels: bandLabels,
        datasets: [{}]
      },
      ch2: {
        labels: bandLabels,
        datasets: [{}]
      },
      ch3: {
        labels: bandLabels,
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
          <Bar key={index} data={channel} options={tempOptions} />
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
          : generalTranslations.disconnected,
        button_disabled: status
      });

      console.log(
        status
          ? generalTranslations.connected
          : generalTranslations.disconnected
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
          powerByBand()
        )
        .subscribe(data => {
          this.setState(state => {
            Object.values(state.channels).forEach((channel, index) => {
              channel.datasets[0].data = [
                data.delta[index], 
                data.theta[index], 
                data.alpha[index], 
                data.beta[index], 
                data.gamma[index]
              ];
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
              primary={this.state.status === generalTranslations.disconnected}
              disabled={this.state.button_disabled}
              onClick={this.connect}
            >
              {this.state.status === generalTranslations.connected
                ? generalTranslations.buttonConnected
                : generalTranslations.buttonToConnect}
            </Button>
            <TextContainer>
              <p>{specificTranslations.description}</p>
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

export default EEGEduBands;
