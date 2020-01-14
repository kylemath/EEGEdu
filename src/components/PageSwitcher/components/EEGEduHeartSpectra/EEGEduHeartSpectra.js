import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { takeUntil } from "rxjs/operators";
import { Subject, timer  } from "rxjs";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

export function getSettings() {
  return {
    cutOffLow: .01,
    cutOffHigh: 20,
    interval: 100,
    bins: 8192,
    sliceFFTLow: 0.6,
    sliceFFTHigh: 2,
    duration: 4096,
    srate: 256,
    name: 'HeartSpectra'
  }
};


export function buildPipe(Settings) {
  if (window.subscriptionHeartHeartSpectra) window.subscriptionHeartSpectra.unsubscribe();

  window.pipeHeartSpectra$ = null;
  window.multicastHeartSpectra$ = null;
  window.subscriptionHeartSpectra = null;

  // Build Pipe 
  window.pipeHeartSpectra$ = zipSamples(window.source.eegReadings$).pipe(
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

  window.multicastHeartSpectra$ = window.pipeHeartSpectra$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastHeartSpectra$) {
    window.subscriptionHeartSpectra = window.multicastHeartSpectra$.subscribe(data => {
      setData(heartSpectraData => {
        Object.values(heartSpectraData).forEach((channel, index) => {
          channel.datasets[0].data = data.psd[1];
          channel.xLabels = data.freqs.map(function(x) {return x * 60});
          channel.peakF = channel.xLabels[indexOfMax(data.psd[1])];
      });

        return {
          ch1: heartSpectraData.ch1,
        };
      });
    });

    window.multicastHeartSpectra$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
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
                  min: 0
                }
              }
            ]
          },
          elements: {
            point: {
              radius: 3
            }
          },
          title: {
            ...generalOptions.title,
            text: generalTranslations.channel + 
              channelNames[1] + 
              " - Estimated HR: " +
              channel.peakF + " BPM"
          }
        };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
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

export function renderRecord(recordPopChange, recordPop, status, Settings) {
  return(
    <Card title={'Record ' + Settings.name +' Data'} sectioned>
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
          title="Recording Data"
        >
          <Modal.Section>
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
  const secondsToSave = 10;
  console.log('Saving ' + secondsToSave + ' seconds...');
  var localObservable$ = null;
  const dataToSave = [];

  console.log('making ' + Settings.name + ' headers')

  dataToSave.push(
    "Timestamp (ms),",
    "Estimated BPM", 
    "\n"
  );   

  // Create timer 
  const timer$ = timer(secondsToSave * 1000);

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastHeartSpectra$.pipe(
    takeUntil(timer$)
  );   

  // now with header in place subscribe to each epoch and log it
  localObservable$.subscribe({
    next(x) { 
      dataToSave.push(Date.now() + "," + x.freqs[indexOfMax(x.psd[1])]*60 + "\n");
      // logging is useful for debugging -yup
      console.log();
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

// Find the index of the max value in an array
function indexOfMax(arr) {
  if (arr.length === 0) {
      return -1;
  }
  var max = arr[0];
  var maxIndex = 0;
  for (var i = 1; i < arr.length; i++) {
      if (arr[i] > max) {
          maxIndex = i;
          max = arr[i];
      }
  }
  return maxIndex;
}
