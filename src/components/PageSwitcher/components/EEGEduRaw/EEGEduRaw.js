import React, { useState } from "react";
import { channelNames, zipSamples, MuseClient } from "muse-js";
import { epoch, bandpassFilter } from "@neurosity/pipes";
import { Button, TextContainer, Card, Stack } from "@shopify/polaris";
import { Line } from "react-chartjs-2";
import { range } from "../chartUtils";
import { chartAttributes, emptyChannelData, rawOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

export default function EEGEduRaw() {
  const [status, setStatus] = useState(generalTranslations.disconnected);
  const [channels, setChannels] = useState(emptyChannelData);

  function renderCharts() {
    return Object.values(channels).map((channel, index) => {
      const tempOptions = {
        ...rawOptions,
        title: {
          ...rawOptions.title,
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

  async function connect() {
    const client = new MuseClient();

    client.connectionStatus.subscribe(status => {
      console.log(status);
    });

    try {
      await client.connect();
      setStatus(generalTranslations.connected);
      await client.start();

      zipSamples(client.eegReadings)
        .pipe(
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({ duration: 1024, interval: 50, samplingRate: 256 })
        )
        .subscribe(data => {
          setChannels(channels => {
            Object.values(channels).forEach((channel, index) => {
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
              ch0: channels.ch0,
              ch1: channels.ch1,
              ch2: channels.ch2,
              ch3: channels.ch3
            };
          });
        });
    } catch (err) {
      console.error(generalTranslations.connectionFailed, err);
    }
  }

  return (
    <Card title={specificTranslations.title}>
      <Card.Section>
        <Stack>
          <Button
            primary={status === generalTranslations.disconnected}
            disabled={status === generalTranslations.connected}
            onClick={connect}
          >
            {status === generalTranslations.connected
              ? generalTranslations.buttonConnected
              : generalTranslations.buttonToConnect}
          </Button>
          <TextContainer>
            <p>{specificTranslations.description}</p>
          </TextContainer>
        </Stack>
      </Card.Section>
      <Card.Section>
        <div style={chartAttributes.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}
