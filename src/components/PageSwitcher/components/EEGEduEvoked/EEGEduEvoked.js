import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject, timer } from "rxjs";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { take, takeUntil } from "rxjs/operators";
 

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
    interval: 1,
    srate: 256,
    duration: 1,
    name: 'Evoked',
    secondsToSave: 60
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
          channel.datasets[0].data = data.data[index];
          channel.xLabels = generateXTics(Settings.srate, Settings.duration);
          channel.datasets[0].qual = standardDeviation(data.data[index])          
        });

        return {
          ch0: evokedData.ch0,
          ch1: evokedData.ch1,
          ch2: evokedData.ch2,
          ch3: evokedData.ch3,
          ch4: evokedData.ch4

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

export function renderRecord(recordPopChange, recordPop, status, Settings, setSettings) {

  function handleSecondsToSaveRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, secondsToSave: value}));
  }

  return (
    <Card title={'Run ERP experiment'} sectioned>
      <Card.Section>
        <p>
          {"Clicking this button will begin the experiment so check your data quality on the raw module first. "}
          {"A window will pop up when you click the button and a series of circles will appear. Stare at the cross in the center. "}
          {"There will be red and blue circles, ignore the blue ones."}
          {"Whenever you see a red circle, as fast as you can either press spacebar on a keyboard, or tap the touchscreen on a tablet or phone. "}
          {"This entire time the eeg data will be saved along with a column indicating which target was on the screen, and another for the responses. "}
          {"The task will continue for a few minutes and once it is finished a .csv file will automatically download. "}
          {"This .csv file has a row for each time point, a column for each electrode, and the columns indicating when targets appeared, and when responses were made. "}
          {"It saves a marker of 20 when the target is on, a marker of 10 when the blue standards are on, and a peak when the spacebar or touchscreen are pressed, here you can see those synced with an eeg channel: "}

        </p>
        <p>
         <img 
            src={ require("./dataExample.png")} 
            alt="dataExample"
            width="100%"
            height="auto"
          ></img>    
        </p>     
      </Card.Section>
      <Stack>
         <RangeSlider 
          disabled={status === generalTranslations.connect} 
          min={2}
          max={180}
          label={'Recording Length: ' + Settings.secondsToSave + ' Seconds'} 
          value={Settings.secondsToSave} 
          onChange={handleSecondsToSaveRangeSliderChange} 
        />   
        <ButtonGroup>
          <Button 
            onClick={() => {
              saveToCSV(Settings);
              recordPopChange();
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect}
          > 
            {'Run oddball experiment'}  
          </Button>
        </ButtonGroup>
        
        <Modal
          open={recordPop}
          onClose={recordPopChange}
          title={"Press Spacebar or tap screen when you see RED circle"}
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
  console.log('Saving ' + Settings.secondsToSave + ' seconds...');
  var localObservable$ = null;
  const dataToSave = [];
  window.marker = 0;
  window.responseMarker = 0;
  window.touchMarker = 0;

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
      "SpaceBar,",
      "TouchMarker,",
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

  //create timer
  const timer$ = timer(Settings.secondsToSave * 1000)

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastEvoked$.pipe(
    takeUntil(timer$)
  );

  // now with header in place subscribe to each epoch and log it
  localObservable$.subscribe({
    next(x) { 
      dataToSave.push(
        Date.now() + "," + 
        window.marker + "," + 
        window.responseMarker + "," +
        window.touchMarker + "," +
        Object.values(x).join(",") + "\n");
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