import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer, RangeSlider } from "@shopify/polaris";
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

export function getBandsSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 100,
    bins: 256,
    duration: 1024
  }
};

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


export function renderSlidersBands(setBandsData, setBandsPipeSettings, status, bandsPipeSettings) {

  function handleBandsIntervalRangeSliderChange(value) {
    setBandsPipeSettings(prevState => ({...prevState, interval: value}));
    buildPipeBands(bandsPipeSettings);
    setupBands(setBandsData);
  }

  function handleBandsCutoffLowRangeSliderChange(value) {
    setBandsPipeSettings(prevState => ({...prevState, cutOffLow: value}));
    buildPipeBands(bandsPipeSettings);
    setupBands(setBandsData);
  }

  function handleBandsCutoffHighRangeSliderChange(value) {
    setBandsPipeSettings(prevState => ({...prevState, cutOffHigh: value}));
    buildPipeBands(bandsPipeSettings);
    setupBands(setBandsData);
  }

  function handleBandsDurationRangeSliderChange(value) {
    setBandsPipeSettings(prevState => ({...prevState, duration: value}));
    buildPipeBands(bandsPipeSettings);
    setupBands(setBandsData);
  }

  return (
    <React.Fragment>
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Epoch duration (Sampling Points): ' + bandsPipeSettings.duration} 
        value={bandsPipeSettings.duration} 
        onChange={handleBandsDurationRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Sampling points between epochs onsets: ' + bandsPipeSettings.interval} 
        value={bandsPipeSettings.interval} 
        onChange={handleBandsIntervalRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Cutoff Frequency Low: ' + bandsPipeSettings.cutOffLow + ' Hz'} 
        value={bandsPipeSettings.cutOffLow} 
        onChange={handleBandsCutoffLowRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Cutoff Frequency High: ' + bandsPipeSettings.cutOffHigh + ' Hz'} 
        value={bandsPipeSettings.cutOffHigh} 
        onChange={handleBandsCutoffHighRangeSliderChange} 
      />
    </React.Fragment>
  )
}

