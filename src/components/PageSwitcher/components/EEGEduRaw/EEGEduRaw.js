import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import { TextContainer, Card, Stack } from "@shopify/polaris";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

import { generateXTics, numOptions } from "../../utils/chartUtils";

const xTics = generateXTics();

export function EEGEduRaw(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
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

export function setupRaw(setRawData) {
  console.log("Subscribing to Raw");

  if (window.multicastRaw$) {
    window.subscriptionRaw$ = window.multicastRaw$.subscribe(data => {
      setRawData(rawData => {
        Object.values(rawData).forEach((channel, index) => {
          if (index < 4) {
            channel.datasets[0].data = data.data[index];
            channel.xLabels = xTics;
          }
        });

        return {
          ch0: rawData.ch0,
          ch1: rawData.ch1,
          ch2: rawData.ch2,
          ch3: rawData.ch3
        };
      });
    });

    window.multicastRaw$.connect();
    console.log("Subscribed to Raw");
  }
}

export function buildPipeRaw() {
  // Build Pipe Raw
  window.pipeRaw$ = zipSamples(window.source$.eegReadings).pipe(
    bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
    epoch({
      duration: numOptions.duration,
      interval: 50,
      samplingRate: numOptions.srate
    }),
    catchError(err => {
      console.log(err);
    })
  );
  window.multicastRaw$ = window.pipeRaw$.pipe(
    multicast(() => new Subject())
  );
}