import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter } from "@neurosity/pipes";
import { Button, TextContainer, Card, Stack } from "@shopify/polaris";
import { Line } from "react-chartjs-2";
import { range } from "../chartUtils";
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

export class EEGEduRaw extends Component {
  state = {
    status: generalTranslations.disconnected,
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
      const options = {
        ...generalOptions,
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...generalOptions.scales.xAxes[0].scaleLabel,
                labelString: specificTranslations.xlabel
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...generalOptions.scales.yAxes[0].scaleLabel,
                labelString: specificTranslations.ylabel
              }
            }
          ]
        },
        animation: {
          duration: 0
        },
      const tempOptions = {
        ...chartOptions,
        title: {
          ...chartOptions.title,
          text: generalTranslations.channel + channelNames[index]
        }
      };

      return (
        <Card.Section key={"Card_" + index}>
          <Line key={"Line_" + index} data={channel} options={tempOptions} />
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

export default EEGEduRaw;
