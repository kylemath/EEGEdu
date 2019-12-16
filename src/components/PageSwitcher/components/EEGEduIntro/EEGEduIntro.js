import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import { TextContainer, Card, Stack } from "@shopify/polaris";

import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as specificTranslations from "./translations/en";

import { generateXTics, standardDeviation } from "../../utils/chartUtils";

export function getSettings () {
  return {
    name: "Intro",
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 1,
    srate: 256,
    duration: 1024
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionIntro$) window.subscriptionIntro$.unsubscribe();

  window.pipeIntro$ = null;
  window.multicastIntro$ = null;
  window.subscriptionIntro$ = null;

  // Build Pipe
  window.pipeIntro$ = zipSamples(window.source$.eegReadings).pipe(
    bandpassFilter({ 
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
      nbChannels: Settings.nbChannels }),
    epoch({
      duration: Settings.duration,
      interval: Settings.interval,
      samplingRate: Settings.srate
    }),
    catchError(err => {
      console.log(err);
    })
  );
  window.multicastIntro$ = window.pipeIntro$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastIntro$) {
    window.subscriptionIntro$ = window.multicastIntro$.subscribe(data => {
      setData(introData => {
        Object.values(introData).forEach((channel, index) => {
          if (index === 0) {
            channel.datasets[0].data = data.data[index];
            channel.xLabels = generateXTics(Settings.srate, Settings.duration);
            channel.datasets[0].qual = standardDeviation(data.data[index])          
          }
        });

        return {
          ch0: introData.ch0,
          ch1: introData.ch1,
          ch2: introData.ch2,
          ch3: introData.ch3
        };
      });
    });

    window.multicastIntro$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function EEGEdu(channels) {
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
                max: 300,
                min: -300
              }
            }
          ]
        },
        elements: {
          line: {
            borderColor: 'rgba(' + channel.datasets[0].qual*10 + ', 128, 128)',
            fill: false
          },
          point: {
            radius: 0
          }
        },
        animation: {
          duration: 0
        },
        title: {
          ...generalOptions.title,
          text: 'Voltage signal over time'
        }
      };

      if (index === 0) {
        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      };
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

  