import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, Button, ButtonGroup, Modal } from "@shopify/polaris";
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
import sketchPredict from './sketchPredictSound';

import ml5 from 'ml5'

let knnClassifier = ml5.KNNClassifier();


export function getSettings() {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
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
      nbChannels: window.nchans }),
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
          channel.datasets[0].data = data.psd[index];
          channel.xLabels = data.freqs;      
        });

        return {
          ch0: predictData.ch0,
          ch1: predictData.ch1,
          ch2: predictData.ch2,
          ch3: predictData.ch3,
          ch4: predictData.ch4
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
  return null
}

// Classification algorithm (using renderRecord function)
window.exampleCounts = {A: 0, B: 0}; 
window.thisLabel = 'A';
window.confidences = {A: 1, B: 0}; 

window.isPredicting = false;
window.enoughLabels = false;

export function renderRecord(recordPopChange, status) {
  const condA = "A";
  const condB = "B";
  
  // Adds example from current incoming psd 
  function addExample (label) {
    if (window.psd) {
      knnClassifier.addExample(window.psd, label);
      window.exampleCounts[label]++;

      const numLabels = knnClassifier.getNumLabels();
      if (numLabels === 2) {
        window.enoughLabels = true;
      }
    }
  }

  // Classifies current incoming psd and outputs results 
  function classify () {
    window.isPredicting = true;
    knnClassifier.classify(window.psd, gotResults)
  }

  // callback from classify to assign results to window and recurse
  function gotResults(err, result) {
    if (result.confidencesByLabel) {
      window.confidences = result.confidencesByLabel;
      if (result.label) {
        window.thisLabel = result.label;
      }
    }
    classify(); //recursive so it continues to run 
  }

  //buttons for training at prediction
  return(
    <React.Fragment>
      <Card title={'Record Training Data'} sectioned>
        <Stack>
          <ButtonGroup>
            <Button 
              onClick={() => {
                addExample('A');
              }}
              disabled={window.isPredicting || status === generalTranslations.connect}
            > 
              {'Record ' + condA +' Data - Count: ' + window.exampleCounts['A']}  
            </Button>
            <Button 
              onClick={() => {
                addExample('B');
              }}
              disabled={window.isPredicting || status === generalTranslations.connect}
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
              disabled={window.isPredicting || !window.enoughLabels || status === generalTranslations.connect}
              primary={true}
            > 
              {'Predict State: ' + window.thisLabel + ', Confidence: ' + window.confidences[window.thisLabel].toFixed(2)}  
            </Button>
          </ButtonGroup>
        </Stack>
        <Modal
          open={window.isPredicting}
          onClose={recordPopChange}
          title="Live Prediction"
          >
          <Modal.Section>
            <Card.Section>
            <P5Wrapper sketch={sketchPredict} 
              label={window.thisLabel}
              confidences={window.confidences}

            />          
            </Card.Section>
          </Modal.Section>
        </Modal>
        
      </Card>
     
    </React.Fragment>
  )
}