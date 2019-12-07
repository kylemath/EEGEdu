import React, { useState, useEffect } from "react";

import { epoch, bandpassFilter } from "@neurosity/pipes";
import { TextContainer, Card, Stack } from "@shopify/polaris";

import { Line } from "react-chartjs-2";
import { channelNames, zipSamples } from "muse-js";

import { range } from "../chartUtils";
import { chartStyles, emptyChannelData, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

export default function EEGEduRaw() {
  const [channels, setChannels] = useState(emptyChannelData);

  useEffect(() => {
    if (window.museClient && window.museClient.eegReadings) {
      zipSamples(window.museClient.eegReadings)
        .pipe(
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({ duration: 1024, interval: 50, samplingRate: 256 })
        )
        .subscribe(data => {
          setChannels(channels => {
            Object.values(channels).forEach((channel, index) => {
              const sRate = data.info.samplingRate;

              channel.datasets[0].data = data.data[index];
              channel.xLabels = range(
                (1000 / sRate) * data.data[2].length,
                1000 / sRate,
                -(1000 / sRate)
              ).map(function(each_element) {
                return Number(each_element.toFixed(0));
              });
            });

            return {
              ch0: channels.ch0,
              ch1: channels.ch1,
              ch2: channels.ch2,
              ch3: channels.ch3
            };
          });
        });
    }
  });

  function renderCharts() {
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
        title: {
          ...generalOptions.title,
          text: generalTranslations.channel + channelNames[index]
        }
      };

      return (
        <Card.Section key={"Card_" + index}>
          <Line key={"Line_" + index} data={channel} options={options} />
        </Card.Section>
      );
    });
  }

  return (
    <Card title={specificTranslations.title}>
      <Card.Section>
        <Stack>
          <TextContainer>
            <p>{specificTranslations.description}</p>
          </TextContainer>
        </Stack>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}
