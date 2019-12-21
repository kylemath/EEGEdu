import React from "react";
import { catchError, multicast, take } from "rxjs/operators";

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
import { bandLabels } from "../../utils/chartUtils";

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 100,
    bins: 256,
    duration: 1024,
    srate: 256
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionBands$) window.subscriptionBands$.unsubscribe();

    window.pipeBands$ = null;
    window.multicastBands$ = null;
    window.subscriptionBands$ = null;


    console.log(window.source$.eegReadings);
    const takeSingle = window.source$.eegReadings.pipe(take(3));
    takeSingle.subscribe((v) => {console.log(v);})

    window.pipeBands$ = zipSamples(window.source$.eegReadings).pipe(
      bandpassFilter({ 
        cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
        nbChannels: Settings.nbChannels }),
      epoch({
        duration: Settings.duration,
        interval: Settings.interval,
        samplingRate: Settings.srate
      }),
      fft({ bins: Settings.bins }),
      powerByBand(),
      catchError(err => {
        console.log(err);
      })
    );
    window.multicastBands$ = window.pipeBands$.pipe(
      multicast(() => new Subject())
  );
}

export function setup(setData) {
  console.log("Subscribing to Bands");

  if (window.multicastBands$) {
    window.subscriptionBands$ = window.multicastBands$.subscribe(data => {
      setData(bandsData => {
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


export function renderSliders(setData, setSettings, status, Settings) {

  function handleIntervalRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, interval: value}));
    buildPipe(Settings);
    setup(setData);
  }

  function handleCutoffLowRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, cutOffLow: value}));
    buildPipe(Settings);
    setup(setData);
  }

  function handleCutoffHighRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, cutOffHigh: value}));
    buildPipe(Settings);
    setup(setData);
  }

  function handleDurationRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, duration: value}));
    buildPipe(Settings);
    setup(setData);
  }

  return (
    <React.Fragment>
      <RangeSlider 
        disabled={status === generalTranslations.connect}
        min={128} step={128} max={4096} 
        label={'Epoch duration (Sampling Points): ' + Settings.duration} 
        value={Settings.duration} 
        onChange={handleDurationRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect}
        min={10} step={5} max={Settings.duration} 
        label={'Sampling points between epochs onsets: ' + Settings.interval} 
        value={Settings.interval} 
        onChange={handleIntervalRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect}
        min={.01} step={.5} max={Settings.cutOffHigh - .5} 
        label={'Cutoff Frequency Low: ' + Settings.cutOffLow + ' Hz'} 
        value={Settings.cutOffLow} 
        onChange={handleCutoffLowRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect}
        min={Settings.cutOffLow + .5} step={.5} max={Settings.srate/2} 
        label={'Cutoff Frequency High: ' + Settings.cutOffHigh + ' Hz'} 
        value={Settings.cutOffHigh} 
        onChange={handleCutoffHighRangeSliderChange} 
      />
    </React.Fragment>
  )
}

