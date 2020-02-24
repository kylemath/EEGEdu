import React, { useState, useCallback } from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer, RangeSlider, Select} from "@shopify/polaris";
import { Subject } from "rxjs";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  powerByBand
} from "@neurosity/pipes";

import { chartStyles } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";
import { bandLabels } from "../../utils/chartUtils";

import sketchBands from './sketchBands'
import sketchTone from './sketchTone'
import sketchCube from './sketchCube'
import sketchFlock from './sketchFlock'
import sketchDraw from './sketchDraw'
import sketchFlock3D from './sketchFlock3D'

import P5Wrapper from 'react-p5-wrapper';

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    interval: 16,
    bins: 256,
    duration: 128,
    srate: 256,
    name: 'Animate'
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionAnimate) window.subscriptionAnimate.unsubscribe();

  window.pipeAnimate$ = null;
  window.multicastAnimate$ = null;
  window.subscriptionAnimate = null;

  // Build Pipe
  window.pipeAnimate$ = zipSamples(window.source.eegReadings$).pipe(
    bandpassFilter({ 
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
      nbChannels: window.nchans }),
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
  window.multicastAnimate$ = window.pipeAnimate$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastAnimate$) {
    window.subscriptionAnimate = window.multicastAnimate$.subscribe(data => {
      setData(animateData => {
        Object.values(animateData).forEach((channel, index) => {
            channel.datasets[0].data = [
              data.delta[index],
              data.theta[index],
              data.alpha[index],
              data.beta[index],
              data.gamma[index]
            ];
            channel.xLabels = bandLabels;
        });

        return {
          ch0: animateData.ch0,
          ch1: animateData.ch1,
          ch2: animateData.ch2,
          ch3: animateData.ch3,
          ch4: animateData.ch4
        };
      });
    });

    window.multicastAnimate$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  function RenderCharts() {

    const bands = '3D Frequency Bands';
    const tone = 'Play simple music with your frequency bands';
    const cube = 'Control a Cube with your Alpha Power';
    const flock = 'Control a Flock with Alpha and Beta';
    const draw = 'Draw a picture with Alpha and Beta';
    const flock3d = 'Control a 3d Flock with Alpha, Beta, and Theta';

    const chartTypes = [
      { label: bands, value: bands },
      { label: tone, value: tone },
      { label: cube, value: cube },
      { label: flock, value: flock },
      { label: draw, value: draw },
      { label: flock3d, value: flock3d }
    ];

    // for picking a new animation
    const [selectedAnimation, setSelectedAnimation] = useState(bands);
    const handleSelectChangeAnimation = useCallback(value => {
      setSelectedAnimation(value);
      console.log("Switching to: " + value);
    }, []);

    return Object.values(channels.data).map((channel, index) => {
      if (channel.datasets[0].data) {
        if (index === 1) {
          // console.log( channel.datasets[0].data[2])
          window.delta = channel.datasets[0].data[0];
          window.theta = channel.datasets[0].data[1];
          window.alpha = channel.datasets[0].data[2];
          window.beta  = channel.datasets[0].data[3];
          window.gamma = channel.datasets[0].data[4];
        }
      }   

      let thisSketch = sketchTone;

      switch (selectedAnimation) {
        case bands:
          thisSketch = sketchBands;
          break
        case tone:
          thisSketch = sketchTone;
          break
        case cube:
          thisSketch = sketchCube;
          break
        case flock:
          thisSketch = sketchFlock;
          break
        case draw:
          thisSketch = sketchDraw;
          break
        case flock3d:
          thisSketch = sketchFlock3D;
          break
        default: console.log("Error on switch to " + selectedAnimation)
      }

      //only left frontal channel
      if (index === 1) {
        return (
          <React.Fragment key={'dum'}>
            <Card.Section 
              title={"Choice of Sketch"}
            >
              <Select
                label={""}
                options={chartTypes}
                onChange={handleSelectChangeAnimation}
                value={selectedAnimation}
              />
            </Card.Section>
            <Card.Section>
              <P5Wrapper sketch={thisSketch} 
                delta={window.delta}
                theta={window.theta}
                alpha={window.alpha}
                beta={window.beta}
                gamma={window.gamma}
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
           <img 
            src={ require("./electrodediagram2.png")} 
            alt="F7Electrode"
            width="25%"
            height="auto"
          ></img>
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
    </Card>
  )
}

