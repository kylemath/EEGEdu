import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer } from "@shopify/polaris";
import { Subject } from "rxjs";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";
import { numOptions } from "../../utils/chartUtils";

export function EEGEduSpectra(channels) {
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
              },
              ticks: {
                max: 100,
                min: 0
              }
            }
          ]
        },
        elements: {
          point: {
            radius: 3
          }
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

export function setupSpectra(setSpectraData) {
  console.log("Subscribing to Spectra");

  if (window.multicastSpectra$) {
    window.subscriptionSpectra$ = window.multicastSpectra$.subscribe(data => {
      setSpectraData(spectraData => {
        Object.values(spectraData).forEach((channel, index) => {
          if (index < 4) {
            channel.datasets[0].data = data.psd[index];
            channel.xLabels = data.freqs;
          }
        });

        return {
          ch0: spectraData.ch0,
          ch1: spectraData.ch1,
          ch2: spectraData.ch2,
          ch3: spectraData.ch3
        };
      });
    });

    window.multicastSpectra$.connect();
    console.log("Subscribed to Spectra");
  }
}

export function buildPipeSpectra () {
  // Build Pipe Spectra
  window.pipeSpectra$ = zipSamples(window.source$.eegReadings).pipe(
    bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
    epoch({
      duration: numOptions.duration,
      interval: 100,
      samplingRate: numOptions.srate
    }),
    fft({ bins: 256 }),
    sliceFFT([1, 30]),
    catchError(err => {
      console.log(err);
    })
  );
  window.multicastSpectra$ = window.pipeSpectra$.pipe(
    multicast(() => new Subject())
  );
}