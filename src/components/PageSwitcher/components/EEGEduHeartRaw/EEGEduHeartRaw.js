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

import { generateXTics, standardDeviation } from "../../utils/chartUtils";

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    interval: 50,
    srate: 256,
    duration: 1024,
    name: 'HeartRaw'
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionHeartRaw) window.subscriptionHeartRaw.unsubscribe();

  window.pipeHeartRaw$ = null;
  window.multicastHeartRaw$ = null;
  window.subscriptionHeartRaw = null;

  // Build Pipe
  window.pipeHeartRaw$ = zipSamples(window.source.eegReadings$).pipe(
    bandpassFilter({ 
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
      nbChannels: window.nchans }),
    epoch({
      duration: Settings.duration,
      interval: Settings.interval,
      samplingRate: Settings.srate
    }),
    catchError(err => {
      console.log(err);
    })
  );
  window.multicastHeartRaw$ = window.pipeHeartRaw$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastHeartRaw$) {
    window.subscriptionHeartRaw = window.multicastHeartRaw$.subscribe(data => {
      setData(heartRawData => {
        Object.values(heartRawData).forEach((channel, index) => {
            channel.datasets[0].data = data.data[index];
            channel.xLabels = generateXTics(Settings.srate, Settings.duration);
            channel.datasets[0].qual = standardDeviation(data.data[index])          
        });

        return {
          ch0: heartRawData.ch0,
          ch1: heartRawData.ch1,
          ch2: heartRawData.ch2,
          ch3: heartRawData.ch3,
          ch4: heartRawData.ch4
        };
      });
    });

    window.multicastHeartRaw$.connect();
    console.log("Subscribed to HeartRaw");
  }
}

export function renderModule(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 1) {
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
              borderColor: 'rgba(' + channel.datasets[0].qual + ', 128, 128)',
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
            text: generalTranslations.channel + channelNames[index] + ' --- SD: ' + channel.datasets[0].qual 
          }
        };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      }
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
  
