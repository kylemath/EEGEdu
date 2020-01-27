import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Link, Modal } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { takeUntil } from "rxjs/operators";
import { Subject, timer  } from "rxjs";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";
import YouTube from 'react-youtube'

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
    duration: 2048,
    srate: 256,
    name: 'HeartSpectra',
    secondsToSave: 10
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
            radius: 8
          }
        },
        animation: {
          duration: 500
        },
        title: {
          ...generalOptions.title,
          text: generalTranslations.channel + 
            channelNames[1] + 
            " - Estimated HR: " +
            channel.peakF + " BPM"
        }
      };

      if (index === 0) {
        if (channel.xLabels) {
          channel.peakInd = indexOfMax(channel.datasets[0].data);
          channel.peakF = channel.xLabels[channel.peakInd];
          channel.peakVal = channel.datasets[0].data[channel.peakInd]
          const newData = {
            datasets: [{
              label: 'Peak',
              borderColor: 'rgba(0,0,0)',
              backgroundColor: 'rgba(231,41,138)',
              data: [{
                x: channel.peakF,
                y: channel.peakVal
              }],
              fill: false
            }, {
              label: channelNames[0],
              borderColor: 'rgba(180,180,180)',
              data: channel.datasets[0].data,
              fill: true
            } ],
            xLabels: channel.xLabels
          }
          return (
            <Card.Section key={"Card_" + index}>
              <Line key={"Line_" + index} data={newData} options={options} />
            </Card.Section>
          );
        } else {
          return null
        }

      } else {
        return null
      }
    });
  }

  const opts = {
    height: '195',
    width: '320',
    playerVars: { // https://developers.google.com/youtube/player_parameters
      autoplay: false
    }
  };

  return (
    <Card title={specificTranslations.title}>
            <Card.Section>
        <Stack>
          <TextContainer>
            <p> {[
              "In the previous module we each estimated our heart rate in two conditions, while we were sitting, and while we were standing. ", 
              "We used a shared google sheet which combines all our data in order to compute group statistics. ",
              "The following video shows how to use the data to make plots of the data, compute statistics, and test the difference. "  
            ]} 
          <Link url="https://docs.google.com/spreadsheets/d/1_R4ViDw5VQv72F-lzi9BJyRPx1-BhQsj7XFckrvSW-Y/edit?usp=sharing">
            A copy of the anonymized data that you can use to follow along with the video can be found here. 
          </Link>  
            </p>
          </TextContainer>
          <br />
          <br />
          <YouTube 
            videoId="uyrnVdKteoU"
            opts={opts}
          />
          <br />
        </Stack>
      </Card.Section>
      <Card.Section>
        <Stack>
          <TextContainer>
            <p> {[
              "Here is an example of some ECG data from our experiment in Module 2. ",
              "Notice that just like many other aspects of our bodies function, our heart rate is a rhythm, that is, it repeats in time at regular intervals. "
            ]} </p>
          </TextContainer>
          <img 
            src={ require("./exampleECG.png")} 
            alt="ECG"
            width="80%"
            height="auto"
          ></img>  
          <br />
          <br />
          <TextContainer>
            <p> {[
              "Therefore, we can use mathematical techniques such as a fourier transform to estimate what frequency is present in the ECG data. ",
              "A fourier transform turns any series of numbers into a summed set of sine waves of different sizes. ",
              "The following animation shows how a single time-series of data, can be thought of as the sum of different frequencies of sine waves, each of a different magnitude. ", 
              "The blue line chart in the animation shows what is called the spectra, and indicates the power at each frequency." 
            ]} </p>
          </TextContainer>
          <br />
          <img 
            src={ require("./fft_animation.gif")} 
            alt="FFT"
            width="100%"
            height="auto"
          ></img>  
          <br />
          <Link url="https://en.wikipedia.org/wiki/Electrocardiography#/media/File:Limb_leads_of_EKG.png"> Image Source - Wikipedia </Link>
          <TextContainer>
            <p> {[
                "Now we can use the muse to estimate our heart rates, but in different ways. Instead of looking at the voltage over time, ",
                "We now transform the data to show us what frequencies are present in the continuous signal. ",
                "In this frequency domain, we now ignore time and consider how much power of each frequency there is in a segment of data. ",
                "If you place your fingers the same way you did when looking at your ECG, you should start to see a peak ",
                "It may help to return to Module 2 and look at the raw data first. ",
                "In this new plot, Along the horizontal axis is the beats per minute, or the frequency of the peaks in your ECG. ", 
                "The vertical y-axis shows the power of the rhythms in the data at each frequency, or how large the changes are between peak and through of the oscillations. ",
                "The pink ball shows the estimated peak of the spectra, or your estimated heart rate. ",
                "In the following experiment, it is only this pink value that will be saved over time while we record. "
              ]} </p>
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

export function renderRecord(recordPopChange, recordPop, status, Settings, setSettings) {

  function handleSecondsToSaveRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, secondsToSave: value}));
  }


  return(
    <Card title={'Record ' + Settings.name +' Data'} sectioned>
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
  console.log('Saving ' + Settings.secondsToSave + ' seconds...');
  var localObservable$ = null;
  const dataToSave = [];

  console.log('making ' + Settings.name + ' headers')

  dataToSave.push(
    "Timestamp (ms),",
    "Estimated BPM", 
    "\n"
  );   

  // Create timer 
  const timer$ = timer(Settings.secondsToSave * 1000);

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
