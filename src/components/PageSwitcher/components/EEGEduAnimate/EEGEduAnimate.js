import React, {useState, useCallback}  from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer, RangeSlider, Button, ButtonGroup} from "@shopify/polaris";
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

import Sketch from 'react-p5'

import styled from 'styled-components';
import {
  LiveProvider,
  LiveEditor,
  LiveError,
  LivePreview
} from 'react-live'

import theme from './p5Theme'

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

        // for popup flag when recording
    const [sketchPop, setSketchPop] = useState(false);
    const sketchPopChange = useCallback(() => setSketchPop(!sketchPop), [sketchPop]);


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
      //only left frontal channel
      if (index === 1) {
        if (channel.datasets[0].data) {
          window.delta = channel.datasets[0].data[0];
          window.theta = channel.datasets[0].data[1];
          window.alpha = channel.datasets[0].data[2];
          window.beta  = channel.datasets[0].data[3];
          window.gamma = channel.datasets[0].data[4];

          window.headerProps = { 
            delta: 10 * window.delta,
            theta: 10 * window.theta,
            alpha: 10 * window.alpha,
            beta: 10 * window.beta,
            gamma: 10 * window.gamma,
            textMsg: 'Data Recieved.',
           };        
        }   
        const brain = window.headerProps;
        const scope = { styled, brain, React, Sketch };
        const code =  
`class MySketch extends React.Component {
  setup(p5, whereToPlot) {
    p5.createCanvas(400, 400, p5.WEBGL).parent(whereToPlot)
  }
  draw(p5) {
    let x = p5.height;
    let y = true;
    const test = 3;
    text = "this is"
    p5.fill(brain.delta,brain.theta,brain.alpha);
    p5.ellipse(brain.beta,brain.alpha,20);
  }
  render() {
    return (
       <Sketch setup={this.setup} draw={this.draw} />
    )
  }
}
render(
  <MySketch />
)    

`

      
        if (sketchPop) {
          return (
          <React.Fragment key={'dum'}>
            <ButtonGroup>
              <Button 
                onClick={() => {
                sketchPopChange();
                }}
                primary={true}
                disabled={false}
              > 
                {'Run Code and Show Sketch'}  
              </Button>
            </ButtonGroup>
            <LiveProvider code={code} scope={scope} noInline={true} theme={theme}>
              <LiveEditor />
              <LiveError />
              <LivePreview />
            </LiveProvider>
          </React.Fragment>
          );
        } else {
          return(
            <React.Fragment key={'dum'}>
              <ButtonGroup>
                <Button 
                  onClick={() => {
                  sketchPopChange();
                  }}
                  primary={true}
                  disabled={false}
                > 
                  {'Run Code and Show Sketch'}  
                </Button>
              </ButtonGroup>
              <LiveProvider code={code} scope={scope} noInline={true} theme={theme}>
                <LiveEditor />
              </LiveProvider>
            </React.Fragment>
          )        
        }
        } else { // if single channel
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

