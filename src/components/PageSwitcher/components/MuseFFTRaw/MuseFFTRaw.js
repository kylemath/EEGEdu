import React, { Component } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter } from "@neurosity/pipes";
import { Button, TextContainer, Card, Stack } from "@shopify/polaris";
import { Line } from "react-chartjs-2";

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
  channel: "Channel: ",
  buttonToConnect: "Connect Muse Headband",
  buttonConnected: "Muse Headband Connected",
  title: "Raw Data",
  description:
    "                First we look at the raw voltage signals coming from each of the\n" +
    "                four sensors on the muse. TP9 and TP10 are on the ears, AF7 and\n" +
    "                AF8 are on the forehead. In general EEG electrodes are odd on\n" +
    "                the left hemisphere and even on the right, and have suffixed\n" +
    "                with z along the midline."
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

//--------------------------------------------

// Function to count by n to something
function range(start, end, step = 1) {
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
}

export class MuseFFTRaw extends Component {
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
      console.error(strings.connectionFailed, err);
    }
  };

  render() {
    return (
      <Card title={strings.title}>
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
              <p>{strings.description}</p>
            </TextContainer>
          </Stack>
        </Card.Section>
        <Card.Section>
          <div style={chartAttributes.wrapperStyle.style}>
            {this.renderChartsRaw()}
          </div>
        </Card.Section>
      </Card>
    );
  }
}

export default MuseFFTRaw;
