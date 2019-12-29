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

import P5Wrapper from 'react-p5-wrapper';

import styled from 'styled-components';
import {
  LiveProvider,
  LiveEditor,
  LiveError,
  LivePreview
} from 'react-live'

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 16,
    bins: 256,
    duration: 128,
    srate: 256
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionBands) window.subscriptionBands.unsubscribe();

  window.pipeBands$ = null;
  window.multicastBands$ = null;
  window.subscriptionBands = null;

  // Build Pipe
  window.pipeBands$ = zipSamples(window.source.eegReadings$).pipe(
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

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastBands$) {
    window.subscriptionBands = window.multicastBands$.subscribe(data => {
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
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  function RenderCharts() {

    const bands = 'bands';
    const tone = 'tone';
    const cube = 'cube';
    const flock = 'flock';
    const draw = 'draw';

    const chartTypes = [
      { label: bands, value: bands },
      { label: tone, value: tone },
      { label: cube, value: cube },
      { label: flock, value: flock },
      { label: draw, value: draw}
    ];

    // for picking a new animation
    const [selectedAnimation, setSelectedAnimation] = useState(bands);
    const handleSelectChangeAnimation = useCallback(value => {
      setSelectedAnimation(value);
      console.log("Switching to: " + value);
    }, []);

    // Default values for the headerProps
    window.headerProps = { 
      delta: 0,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      textMsg: 'No data.',
     };   

    return Object.values(channels.data).map((channel, index) => {
      // console.log(channel) 
      if (channel.datasets[0].data) {
        // console.log( channel.datasets[0].data[2])
        window.delta = channel.datasets[0].data[0];
        window.theta = channel.datasets[0].data[1];
        window.alpha = channel.datasets[0].data[2];
        window.beta  = channel.datasets[0].data[3];
        window.gamma = channel.datasets[0].data[4];

        window.headerProps = { 
          delta: window.delta,
          theta: window.theta,
          alpha: window.alpha,
          beta: window.beta,
          gamma: window.gamma,
          textMsg: 'Data Recieved.',
         };        
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
        default: console.log("Error on switch to " + selectedAnimation)
      }

      const headerProps = window.headerProps;
      const scope = {styled, headerProps};
      const code = `const Wrapper = ({ children }) => (
      <div style={{
        background: 'papayawhip',
        width: '100%',
        padding: '2rem'
      }}>
        {children}
      </div>
    )
    
    const Title = () => (
      <h2>{headerProps.textMsg}</h2>
    )
      
    const Data = () => (
      <h3 style={{ color: 'palevioletred' }}>
        Delta Value:
        {headerProps.delta} <br />
        Theta Value:
        {headerProps.theta} <br />
        Alpha Value:
        {headerProps.alpha} <br />
        Beta Value:
        {headerProps.beta} <br />
        Gamma Value:
        {headerProps.gamma} <br />
      </h3>
    )
    
    render(
      <Wrapper>
        <Title />
        <Data />
      </Wrapper>
    )`

      //only left frontal channel
      if (index === 1) {
        return (
          <React.Fragment key={'dum'}>
            <LiveProvider code={code} scope={scope} noInline={true}>
              <LiveEditor />
              <LiveError />
              <LivePreview />
            </LiveProvider>

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

