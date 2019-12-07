import React, { useEffect, useState } from "react";

import { epoch, bandpassFilter, fft, sliceFFT } from "@neurosity/pipes";
import { Card, Stack, TextContainer } from "@shopify/polaris";

import { channelNames, zipSamples } from "muse-js";
import { Line } from "react-chartjs-2";

import { chartStyles, emptyChannelData, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

export default function EEGEduSpectra() {
  const [channels, setChannels] = useState(emptyChannelData);

  useEffect(() => {
    if (window.museClient && window.museClient.eegReadings) {
      zipSamples(window.museClient.eegReadings)
        .pipe(
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
          fft({ bins: 256 }),
          sliceFFT([1, 30])
        )
        .subscribe(data => {
          setChannels(channels => {
            Object.values(channels).forEach((channel, index) => {
              channel.datasets[0].data = data.psd[index];
              channel.xLabels = data.freqs;
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
