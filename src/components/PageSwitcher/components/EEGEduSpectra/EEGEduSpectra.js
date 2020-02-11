import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal, Link } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { take, takeUntil } from "rxjs/operators";
import { Subject, timer } from "rxjs";

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
    cutOffLow: 1,
    cutOffHigh: 100,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 100,
    duration: 1024,
    srate: 256,
    name: 'Spectra',
    secondsToSave: 10

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
          data: channels.data.ch0.datasets[0].data.map(function(x) {return x * -1}),
          fill: false
        }, {
          label: channelNames[1],
          borderColor: 'rgba(27,158,119)',
          data: channels.data.ch1.datasets[0].data.map(function(x) {return x * -1}),
          fill: false
        }, {
          label: channelNames[2],
          borderColor: 'rgba(117,112,179)',
          data: channels.data.ch2.datasets[0].data.map(function(x) {return x + 0}),
          fill: false
        }, {
          label: channelNames[3],
          borderColor: 'rgba(231,41,138)',
          data: channels.data.ch3.datasets[0].data.map(function(x) {return x + 0}),
          fill: false  
        }, {
          label: channelNames[4],
          borderColor: 'rgba(20,20,20)',
          data: channels.data.ch4.datasets[0].data.map(function(x) {return x + 0}),
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


  const opts = {
    height: '195',
    width: '320',
    playerVars: { // https://developers.google.com/youtube/player_parameters
      autoplay: false
    }
  };

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
      <Card title={'Fourier Transform'}>
        <Card.Section>
          <Stack>
            <TextContainer>
              <p> {[
                "In module 3 we saw how we can use a mathematical technique called the fourier transform to estimate what frequency is present in the ECG data, to estimate heart rate. ",
                "A fourier transform turns any series of numbers into a summed set of sine waves of different sizes. ",
                "For review, the following animation shows how a single time-series of data can be thought of as the sum of different frequencies of sine waves, each of a different magnitude. ", 
                "The blue bar chart at the end of the animation shows what is called the frequency spectra, and indicates the power at each frequency." 
              ]} </p>
            </TextContainer>
            <br />
            <img 
              src={ require("./fft_animation.gif")} 
              alt="FFT"
              width="50%"
              height="auto"
            ></img> 
            </Stack>
            <Stack> 
            <Link url="https://en.wikipedia.org/wiki/Electrocardiography#/media/File:Limb_leads_of_EKG.png"
              external={true}>
              Image Source - Wikipedia </Link>
              <br />
              <TextContainer>
              <p> {[
                "The Fourier transform is a mathematical technique originally developed in the early 1800s in order to mathematically model the movement of heat. ",
                "A discrete fourier transform (DFT) is this mathematical technique applied to digital data (a function sampled at different time points), like EEG data. ",
                "In order to compute this efficiently, a pair of psychologists and statisticians created the FAST fourier transform (FFT) in the 60's, during the cold war ",
                "as a signal processing technique needed to triangulate possible Soviet nuclear launches from a hypothetical array of sensors around the Soviet Union. ",
                "The FFT has gone on to be one of the most useful and used algorithms ever created, and is used in a wide array of digital tools. ", 
                ]} 
           <Link url="http://www.jezzamon.com/fourier/index.html"
              external={true}>
              Follow this link to an excellent interactive tutorial on the graphical understanding of the fourier transforms using sound, drawings, and images
             </Link>
                </p>
             <p> {[
                "We will not cover the mathematical formula or algorithm behind the DFT or FFT here. ",
                "A fourier transform turns any series of numbers into a summed set of sine waves of different sizes. ",
                "The following animation shows how a single time-series of data, can be thought of as the sum of different frequencies of sine waves, each of a different magnitude. ", 
                "Amazingly, before digital computers in the late 1800's, in order to model details of light movement, a physical machine was constructed to perform these calculations by hand. ",
                "This amazing Harmonic Analyzer still provides an excellent intuition into the mechanics behind decomposing a time series signal into a sum of sin waves. " 
              ]} </p>
            </TextContainer>

            <YouTube 
              videoId="NAsM30MAHLg"
              opts={opts}
            />
             <p> {[
                "Most computer programming languages now provide an easy way to compute the FFT on time series data. ",
                "Other methods of converting time series data into the frequency domain also exist, such as wavelet analysis, in which the product of the data and a family of different frequency wavelets is used to esitmate the data decomposition. ",
                "The resolution in frequency of the FFT depends on the NUMBER OF TIME POINTS. ",
                "The range of frequencies provided by the FFT depends on the sampling rate of the data , in our case 256 Hz provides frequencies up to 128 Hz (half). " 
              ]} </p>
            <p> {[
                "Importantly, the uncertainty principle applies to the FFT as well. ",
                "It is impossible to know both exactly when something happens, and what frequency it happens at, at the same time. ",
                "As an intuition, imagine that in order to estimate your heart rate you obviously need more than a single time point of data, you need multiple beats of the heart (at least one). ",
                "Therefore, the resultant estimate of heart rate will not be precise in time, and will apply to the entire time window you put into the FFT. " 
              ]} </p>

          </Stack>
        </Card.Section>
      </Card>
      <Card title={'Artifact Assignment'}>
        <Card.Section>
          <Stack>
            <TextContainer>
              <p> {[
                "In module 4 we plotted the range of various artifacts that are common in EEG data. ",
                "Obviously, these artifacts remain (if not filtered out) in the window of data that is used to compute the FFT. ",
                "Therefore, NOT ALL THE DATA IN THE SPECTRA IS FROM THE BRAIN!!! ", 
                "For instance, blinks show up as low frequencies, and you have already seen how heart artifacts in the data would show up as low frequency power as well, but these are not brain activity. ",
                "For your assignment this module, for each type of artifact you observed in Module 4, now you will observe what the spectra looks like, take a screenshot of the result and save these in a google doc. ",
                "To take a screenshot on a mac, press (⌘Command + ⇧Shift + 4) and select the area of the screen you want to save."
              ]} </p>
            </TextContainer>
          </Stack>
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
 
  const opts = {
    height: '195',
    width: '320',
    playerVars: { // https://developers.google.com/youtube/player_parameters
      autoplay: false
    }
  };

  return(
    <Card title={'Record ' + Settings.name +' Data'} sectioned>
      <Stack>
         <TextContainer>
          <p> {[
            "Press the following button after adjusting the settings above in order to record the live spectra over time into a .csv file. "
          ]} </p>
        </TextContainer>
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
   <TextContainer>
          <p> {[
            "A .csv file will be saved that can be opened in Google Sheets. ",
            "Here is an example of what the data will look like once loaded. ",
            "The first column shows the time in msec of each estimate of the spectra.",
            "Each row therefore represents an estimate from the previous 8 seconds of data EEG data, and the windows used to compute each row are overlapping. ",
            "Again, this is because you need a long segment of time to estimate frequency of rhythms over time. ",
            "You can see the time values increase about 10000 ms during the recording, representing the 10 seconds of data. ",
            "So 10000 milliseconds divided into ~400 ms shifts per row gives us the rough number of rows (~25). "
          ]} </p>
          <img 
            src={ require("./exampleRecording.png")} 
            alt="exampleOutput"
            width="75%"
            height="auto"
          ></img>
          <p> {[
            "The spectra are then shown on each row. Each column represents the power at a different frequency. ",
            "The first row shows the frequency and channel label for all the data in that column. ",
            "So the first 30 columns after the timestamp are the 30 frequencies from the TP9 electrode ",
            "(where 30 is the number of frequencies saved which can be adjusted with the FFT Slice Settings). ",
            "After that, the next electrode starts, with another 30 frequencies.",
            "After columns for all 30 frequencies from all four electrodes, another 30 columns show zeros, this is for an optional auxillary channel we are not using here. ",
            "Finally columns are saved to record the exact frequencies of each bin of the FFT (redundant with the column names). "
          ]} </p>
        </TextContainer>
   
        <TextContainer>
          <p> {[
            "The second part of the assignment for this module involves parsing this output file to organize the data into a format that can be plotted like the live plot on the page. ",
            "Data will be averaged over time, and then data for each electrode will be organized and used to make a chart of the spectra"
            ]} 
        <Link url="https://docs.google.com/spreadsheets/d/1Zdnmti-A0kb1ru3HUNMT9rMTbZYbkStSRNtiRPu3TVU/edit?usp=sharing"
             external={true}>

         Link to example google sheet from video. 
        </Link>  
        </p>
        </TextContainer>
        <br />
        <YouTube 
          videoId="YgEgi73e9OM"
          opts={opts}
        />



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
      dataToSave.push(Date.now() + "," + Object.values(x).join(",") + "\n");
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
