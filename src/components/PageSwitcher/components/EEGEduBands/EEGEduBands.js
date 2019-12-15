import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer } from "@shopify/polaris";
import { Subject } from "rxjs";

import { channelNames } from "muse-js";
import { Bar } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  powerByBand
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";
import { numOptions, bandLabels } from "../../utils/chartUtils";

export function EEGEduBands(channels) {
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
                max: 50,
                min: 0
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
          <Bar key={"Line_" + index} data={channel} options={options} />
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


export function setupBands(setBandsData) {
  console.log("Subscribing to Bands");

  if (window.multicastBands$) {
    window.subscriptionBands$ = window.multicastBands$.subscribe(data => {
      setBandsData(bandsData => {
        Object.values(bandsData).forEach((channel, index) => {
          if (index < 4) {
            channel.datasets[0].data = [
              data.delta[index],
              data.theta[index],
              data.alpha[index],
              data.beta[index],
              data.gamma[index]
            ];
            channel.xLabels = bandLabels;
          }
        });

        return {
          ch0: bandsData.ch0,
          ch1: bandsData.ch1,
          ch2: bandsData.ch2,
          ch3: bandsData.ch3
        };
      });
    });

    window.multicastBands$.connect();
    console.log("Subscribed to Bands");
  }
}

export function buildPipeBands(bandsPipeSettings) {
  if (window.subscriptionBands$) window.subscriptionBands$.unsubscribe();

    window.pipeBands$ = null;
    window.multicastBands$ = null;
    window.subscriptionBands$ = null;

    window.pipeBands$ = zipSamples(window.source$.eegReadings).pipe(
      bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
      epoch({
        duration: numOptions.duration,
        interval: 100,
        samplingRate: numOptions.srate
      }),
      fft({ bins: 256 }),
      powerByBand(),
      catchError(err => {
        console.log(err);
      })
    );
    window.multicastBands$ = window.pipeBands$.pipe(
      multicast(() => new Subject())
  );
}