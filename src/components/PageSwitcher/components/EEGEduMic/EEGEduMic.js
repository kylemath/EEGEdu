import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer, RangeSlider} from "@shopify/polaris";
import { Subject } from "rxjs";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT
} from "@neurosity/pipes";

import { chartStyles } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

import sketchMic from './sketchMic'

import P5Wrapper from 'react-p5-wrapper';

export function getSettings () {
  return {
    cutOffLow: 1,
    cutOffHigh: 100,
    interval: 10,
    duration: 64,
    srate: 256,
    name: 'Mic',
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionMic) window.subscriptionMic.unsubscribe();

  window.pipeMic$ = null;
  window.multicastMic$ = null;
  window.subscriptionMic = null;

  // Build Pipe
  window.pipeMic$ = zipSamples(window.source.eegReadings$).pipe(
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
  window.multicastMic$ = window.pipeMic$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastMic$) {
    window.subscriptionMic = window.multicastMic$.subscribe(data => {
      setData(micData => {
        Object.values(micData).forEach((channel, index) => {
          channel.datasets[0].data = data.data[index];
        });

        return {
          ch0: micData.ch0,
          ch1: micData.ch1,
          ch2: micData.ch2,
          ch3: micData.ch3,
          ch4: micData.ch4
        };
      });
    });

    window.multicastMic$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  function RenderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      if (channel.datasets[0].data) {
        window.psd = channel.datasets[0].data;
        window.bins = channel.datasets[0].data.length;
      }   

      //only left frontal channel
      if (index === 1) {
        return (
          <React.Fragment key={'dum'}>
            <Card.Section>
              <P5Wrapper sketch={sketchMic} 
                psd={window.psd}
                bins={window.bins}
                 />          
            </Card.Section>
          </React.Fragment>
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
        <div style={chartStyles.wrapperStyle.style}>{RenderCharts()}</div>
      </Card.Section>
    </Card>
  );
}

export function renderSliders(setData, setSettings, status, Settings) {

  function resetPipeSetup(value) {
    buildPipe(Settings);
    setup(setData, Settings);
  }

  function handleIntervalRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, interval: value}));
    resetPipeSetup();
  }

  function handleCutoffLowRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, cutOffLow: value}));
    resetPipeSetup();
  }

  function handleCutoffHighRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, cutOffHigh: value}));
    resetPipeSetup();
  }

  function handleDurationRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, duration: value}));
    resetPipeSetup();
  }

  return (
    <Card title={Settings.name + ' Settings'} sectioned>
      <RangeSlider 
        disabled={status === generalTranslations.connect}
        min={1} step={64} max={4096} 
        label={'Epoch duration (Sampling Points): ' + Settings.duration} 
        value={Settings.duration} 
        onChange={handleDurationRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect}
        min={1} step={1} max={Settings.duration} 
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
    </Card>
  )
}

