import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal } from "@shopify/polaris";
import { take, takeUntil } from "rxjs/operators";
import { Subject, timer } from "rxjs";

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

const io = require('socket.io-client');

export function getSettings() {
  return {
    cutOffLow: 1,
    cutOffHigh: 100,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 100,
    duration: 1024,
    srate: 256,
    name: 'Spectra',
    secondsToSave: 1000

  }
};


export function buildPipe(Settings) {
  if (window.subscriptionSpectra) window.subscriptionSpectra.unsubscribe();

  window.pipeSpectra$ = null;
  window.multicastSpectra$ = null;
  window.subscriptionSpectra = null;

  // Build Pipe 
  window.pipeSpectra$ = zipSamples(window.source.eegReadings$).pipe(
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

  window.multicastSpectra$ = window.pipeSpectra$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);
  

  if (window.multicastSpectra$) {
    window.subscriptionSpectra = window.multicastSpectra$.subscribe(data => {
      setData(spectraData => {
        Object.values(spectraData).forEach((channel, index) => {
          channel.datasets[0].data = data.psd[index];
          channel.xLabels = data.freqs;
        });

        return {
          ch0: spectraData.ch0,
          ch1: spectraData.ch1,
          ch2: spectraData.ch2,
          ch3: spectraData.ch3,
          ch4: spectraData.ch4
        };
      });
    });

    window.multicastSpectra$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  function renderCharts() {
    let vertLim = Math.floor(Math.max(...[].concat.apply([], [channels.data.ch0.datasets[0].data,
                channels.data.ch1.datasets[0].data,
                channels.data.ch2.datasets[0].data,
                channels.data.ch3.datasets[0].data,
                channels.data.ch4.datasets[0].data])
    ));    
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
              max: vertLim,
              min: vertLim * -1
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
        text: 'Spectra data from each electrode'
      },
      legend: {
        display: true
      }
    };


    if (channels.data.ch3.datasets[0].data) {
      const newData = {
        datasets: [{
          label: channelNames[0],
          borderColor: 'rgba(217,95,2)',
          data: channels.data.ch0.datasets[0].data,
          fill: false
        }, {
          label: channelNames[1],
          borderColor: 'rgba(27,158,119)',
          data: channels.data.ch1.datasets[0].data,
          fill: false
        }, {
          label: channelNames[2],
          borderColor: 'rgba(117,112,179)',
          data: channels.data.ch2.datasets[0].data,
          fill: false
        }, {
          label: channelNames[3],
          borderColor: 'rgba(231,41,138)',
          data: channels.data.ch3.datasets[0].data,
          fill: false  
        }, {
          label: channelNames[4],
          borderColor: 'rgba(20,20,20)',
          data: channels.data.ch4.datasets[0].data,
          fill: false  
        }],
        xLabels: channels.data.ch0.xLabels
      }

      return (
        <Card.Section key={"Card_" + 1}>
          <Line key={"Line_" + 1} data={newData} options={options} />
        </Card.Section>
      );
    } else {
      return (
        <Card.Section>
          <Stack>
            <TextContainer>
              <p>{'Connect the device above to see the plot'}</p>
            </TextContainer>
          </Stack>
        </Card.Section>
      )
    }


  }

  return (
    <React.Fragment>
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
     
    </React.Fragment>
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

export function renderRecord(recordPopChange, recordPop, status, Settings, setSettings) {

  function handleSecondsToSaveRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, secondsToSave: value}));
  }
 
  return(
    <Card title={'Stream ' + Settings.name +' Data'} sectioned>
      <Stack>
         <TextContainer>
          <p> {[
            "Press the following button after adjusting the settings above in order to stream data. "
          ]} </p>
        </TextContainer>
        <RangeSlider 
          disabled={status === generalTranslations.connect} 
          min={2}
          max={180}
          label={'Streaming Length: ' + Settings.secondsToSave + ' Seconds'} 
          value={Settings.secondsToSave} 
          onChange={handleSecondsToSaveRangeSliderChange} 
        />
        <ButtonGroup>
          <Button 
            onClick={() => {
              streamToSocket(Settings);
              recordPopChange();
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect}
          > 
            {'Stream to Socket'}  
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


async function streamToSocket(Settings) {
  console.log('Streaming for ' + Settings.secondsToSave + ' seconds...');
  var localObservable$ = null;
  const dataToSave = [];
  
  console.log('Creating Socket')
  const socket = await io.connect('http://localhost:8080');


  // take one sample from selected observable object for headers
  localObservable$ = window.multicastSpectra$.pipe(
    take(1)
  );

  localObservable$.subscribe({ 
    next(x) { 
      let freqs = Object.values(x.freqs);
      dataToSave.push(
        "Timestamp (ms),",
        freqs.map(function(f) {return "ch0_" + f + "Hz"}) + ",", 
        freqs.map(function(f) {return "ch1_" + f + "Hz"}) + ",", 
        freqs.map(function(f) {return "ch2_" + f + "Hz"}) + ",", 
        freqs.map(function(f) {return "ch3_" + f + "Hz"}) + ",", 
        freqs.map(function(f) {return "chAux_" + f + "Hz"}) + ",", 
        freqs.map(function(f) {return "f_" + f + "Hz"}) + "," , 
        "info", 
        "\n"
      );   
    }
  });

  // Create timer 
  const timer$ = timer(Settings.secondsToSave * 1000);

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastSpectra$.pipe(
    takeUntil(timer$)
  );   


  // now with header in place subscribe to each epoch and log it
  localObservable$.subscribe({
    next(x) { 
      // dataToSave.push(Date.now() + "," + Object.values(x).join(",") + "\n");
      // logging is useful for debugging -yup
      console.log("next", x);
      socket.emit('out_data', x);
    },
    error(err) { console.log(err); },
    complete() { 
      console.log('Done publishing');
    }
  });
}
