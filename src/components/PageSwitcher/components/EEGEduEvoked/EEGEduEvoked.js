import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { take } from "rxjs/operators";


import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch
} from "@neurosity/pipes";

import { chartStyles } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

import { generateXTics, standardDeviation } from "../../utils/chartUtils";

import P5Wrapper from 'react-p5-wrapper';
import sketchEvoked from './sketchEvoked'

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 1,
    srate: 256,
    duration: 1,
    name: 'Evoked'
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionEvoked) window.subscriptionEvoked.unsubscribe();

  window.pipeEvoked$ = null;
  window.multicastEvoked$ = null;
  window.subscriptionEvoked = null;

  // Build Pipe
  window.pipeEvoked$ = zipSamples(window.source.eegReadings$).pipe(
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
  window.multicastEvoked$ = window.pipeEvoked$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastEvoked$) {
    window.subscriptionEvoked = window.multicastEvoked$.subscribe(data => {
      setData(evokedData => {
        Object.values(evokedData).forEach((channel, index) => {
          if (index < 4) {
            channel.datasets[0].data = data.data[index];
            channel.xLabels = generateXTics(Settings.srate, Settings.duration);
            channel.datasets[0].qual = standardDeviation(data.data[index])          
          }
        });

        return {
          ch0: evokedData.ch0,
          ch1: evokedData.ch1,
          ch2: evokedData.ch2,
          ch3: evokedData.ch3
        };
      });
    });

    window.multicastEvoked$.connect();
    console.log("Subscribed to Evoked");
  }
}

export function renderModule(channels) {
  function renderCharts() { 
      return null
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
        min={10} step={1} max={Settings.duration}
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

export function renderRecord(recordPopChange, recordPop, status, Settings) {
  return (
    <Card title={'Record ' + Settings.name + ' Data'} sectioned>
      <Card.Section>
        <p>
          {"When you are recording Evoked data it is recommended you set the "}
          {"number of sampling points between epochs onsets to be equal to the epoch duration. "}
          {"This will ensure that consecutive rows of your output file are not overlapping in time."}
          {"It will make the live plots appear more choppy."}
        </p>        
      </Card.Section>
      <Stack>
        <ButtonGroup>
          <Button 
            onClick={() => {
              saveToCSV(Settings);
              recordPopChange();
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect}
          > 
            {'Save to CSV'}  
          </Button>
        </ButtonGroup>
        
        <Modal
          open={recordPop}
          onClose={recordPopChange}
          title={"Recording Data"}
        >
          <Modal.Section>
           <Card.Section>
              <P5Wrapper sketch={sketchEvoked} />          
            </Card.Section>
            <TextContainer>
              <p>
                Your data is currently recording, 
                once complete it will be downloaded as a .csv file 
                and can be opened with your favorite spreadsheet program. 
                Close this window once the download completes.
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>

      </Stack>
    </Card>
  )
}

function saveToCSV(Settings) {
  const numSamplesToSave = 2000;
  console.log('Saving ' + numSamplesToSave + ' samples...');
  var localObservable$ = null;
  const dataToSave = [];
  window.marker = 0;

  console.log('making ' + Settings.name + ' headers')

  // for each module subscribe to multicast and make header
  // take one sample from selected observable object for headers
  localObservable$ = window.multicastEvoked$.pipe(
  take(1)
  );
  //take one sample to get header info
  localObservable$.subscribe({ 
  next(x) { 
    dataToSave.push(
      "Timestamp (ms),",
      "Marker,",
      generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch0_" + f + "ms"}) + ",", 
      generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch1_" + f + "ms"}) + ",", 
      generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch2_" + f + "ms"}) + ",", 
      generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch3_" + f + "ms"}) + ",", 
      generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "chAux_" + f + "ms"}) + ",", 
      "info", 
      "\n"
    );   
  }
  });
  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastEvoked$.pipe(
  take(numSamplesToSave)
  );

  // now with header in place subscribe to each epoch and log it
  localObservable$.subscribe({
    next(x) { 
      dataToSave.push(Date.now() + "," + window.marker + "," + Object.values(x).join(",") + "\n");
      // logging is useful for debugging -yup
      // console.log(x);
    },
    error(err) { console.log(err); },
    complete() { 
      console.log('Trying to save')
      var blob = new Blob(
        dataToSave, 
        {type: "text/plain;charset=utf-8"}
      );
      saveAs(blob, Settings.name + "_Recording_" + Date.now() + ".csv");
      console.log('Completed');
    }
  });
}