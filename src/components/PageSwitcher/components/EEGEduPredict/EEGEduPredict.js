import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup } from "@shopify/polaris";
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

import P5Wrapper from 'react-p5-wrapper';
import sketchPredict from './sketchPredict';

import ml5 from 'ml5'

let knnClassifier = ml5.KNNClassifier();


export function getSettings() {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 256,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 30,
    duration: 512,
    srate: 256,
    name: 'Predict'
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionPredict) window.subscriptionPredict.unsubscribe();

  window.pipePredict$ = null;
  window.multicastPredict$ = null;
  window.subscriptionPredict = null;

  // Build Pipe 
  window.pipePredict$ = zipSamples(window.source.eegReadings$).pipe(
    bandpassFilter({ 
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
      nbChannels: Settings.nbChannels }),
    epoch({
      duration: Settings.duration,
      interval: Settings.interval,
      samplingRate: Settings.srate
    }),
    fft({ bins: Settings.bins }),
    sliceFFT([Settings.sliceFFTLow, Settings.sliceFFTHigh]),
    catchError(err => {
      console.log(err);
    })
  );

  window.multicastPredict$ = window.pipePredict$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastPredict$) {
    window.subscriptionPredict = window.multicastPredict$.subscribe(data => {
      setData(predictData => {
        Object.values(predictData).forEach((channel, index) => {
          if (index < 4) {
            channel.datasets[0].data = data.psd[index];
            channel.xLabels = data.freqs;
          }
        });

        return {
          ch0: predictData.ch0,
          ch1: predictData.ch1,
          ch2: predictData.ch2,
          ch3: predictData.ch3
        };
      });
    });

    window.multicastPredict$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 0) {

        if (channel.datasets[0].data) {
          window.psd = channel.datasets[0].data;
          window.freqs = channel.xLabels;
          if (channel.xLabels) {
            window.bins = channel.xLabels.length;
          }
        }   
        return null 
        // (
        //   <Card.Section key={"Card_" + index}>
        //     <Line key={"Line_" + index} data={channel} options={options} />
        //   </Card.Section>
        // );
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

export function renderSliders(setData, setSettings, status, Settings) {

  function resetPipeSetup(value) {
    buildPipe(Settings);
    setup(setData, Settings)
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

  function handleSliceFFTLowRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, sliceFFTLow: value}));
    resetPipeSetup();
  }

  function handleSliceFFTHighRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, sliceFFTHigh: value}));
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
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        min={1} max={Settings.sliceFFTHigh - 1}
        label={'Slice FFT Lower limit: ' + Settings.sliceFFTLow + ' Hz'} 
        value={Settings.sliceFFTLow} 
        onChange={handleSliceFFTLowRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        min={Settings.sliceFFTLow + 1}
        label={'Slice FFT Upper limit: ' + Settings.sliceFFTHigh + ' Hz'} 
        value={Settings.sliceFFTHigh} 
        onChange={handleSliceFFTHighRangeSliderChange} 
      />
    </Card>
  )
}

// Classification algorithm (using renderRecord function)
window.exampleCounts = {A: 0, B: 0}; 
window.thisLabel = 'A';
window.confidences = {A: 1, B: 0}; 

export function renderRecord(status) {
  const condA = "A";
  const condB = "B";
  
  function addExample (label) {
    if (window.psd) {
      knnClassifier.addExample(window.psd, label);
      window.exampleCounts[label]++;
    }
  }

  function classify () {
    knnClassifier.classify(window.psd, gotResults)
  }

  function gotResults(err, result) {
    if (result.confidencesByLabel) {
      window.confidences = result.confidencesByLabel;
      if (result.label) {
        window.thisLabel = result.label;
      }
    }
    classify(); //recursive so it continues to run 
  }

  return(
    <React.Fragment>
      <Card title={'Record Training Data'} sectioned>
        <Stack>
          <ButtonGroup>
            <Button 
              onClick={() => {
                console.log('Adding example to Condition A: ' + window.exampleCounts['A']);

                addExample('A');
              }}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            > 
              {'Record ' + condA +' Data - Count: ' + window.exampleCounts['A']}  
            </Button>
            <Button 
              onClick={() => {
                console.log('Adding example to Condition B: ' + window.exampleCounts['B']);
                addExample('B');
              }}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            > 
              {'Record ' + condB + ' Data - Count: ' + window.exampleCounts['B']}  
            </Button> 
          </ButtonGroup>
        </Stack>
      </Card>

       <Card title={'Predict current brain state after Training'} sectioned>
        <Stack>
          <ButtonGroup>
            <Button 
              onClick={() => {
                console.log('Attempting to classify state')
                classify();
              }}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            > 
              {'Predict State: ' + window.thisLabel + ', Confidence: ' + window.confidences[window.thisLabel].toFixed(2)}  
            </Button>
          </ButtonGroup>
        </Stack>
      </Card>
      <Card.Section>
        <P5Wrapper sketch={sketchPredict} 
          label={window.thisLabel}
          confidences={window.confidences}

        />          
      </Card.Section>
    </React.Fragment>
  )
}