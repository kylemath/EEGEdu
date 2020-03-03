import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal, Link } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { take, takeUntil } from "rxjs/operators";
import { Subject, timer } from "rxjs";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";
import YouTube from 'react-youtube'

import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

import P5Wrapper from 'react-p5-wrapper';
import sketchFixation from "./sketchFixation"

export function getSettings() {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 30,
    duration: 1024,
    srate: 256,
    name: 'Alpha',
    secondsToSave: 60
  }
};

const conds = ['Open', 'Closed'];
const thisRand = Math.floor(Math.random() * 2); 
const firstType = conds[thisRand];


export function buildPipe(Settings) {
  if (window.subscriptionAlpha) window.subscriptionAlpha.unsubscribe();

  window.pipeAlpha$ = null;
  window.multicastAlpha$ = null;
  window.subscriptionAlpha = null;

  // Build Pipe 
  window.pipeAlpha$ = zipSamples(window.source.eegReadings$).pipe(
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

  window.multicastAlpha$ = window.pipeAlpha$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastAlpha$) {
    window.subscriptionAlpha = window.multicastAlpha$.subscribe(data => {
      setData(alphaData => {
        Object.values(alphaData).forEach((channel, index) => {
          channel.datasets[0].data = data.psd[index];
          channel.xLabels = data.freqs;
        });

        return {
          ch0: alphaData.ch0,
          ch1: alphaData.ch1,
          ch2: alphaData.ch2,
          ch3: alphaData.ch3,
          ch4: alphaData.ch4
        };
      });
    });

    window.multicastAlpha$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function renderModule(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 0) {
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
                max: 25,
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
          text: generalTranslations.channel + channelNames[index]
        }
      };

        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
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
      <Card.Section title={'Previous Module'}>
        <TextContainer>
          <p> {
            "Last module we recorded the frequency bands while people had their eyes open or closed for 10 seconds. Although we predicted there should be larger alpha power when the eyes are closed, are results showed the opposite effect:"
          } </p>
        </TextContainer>
        <br />
        <img 
          src={ require("./module5.png")} 
          alt="module5"
          width="50%"
          height="auto"
        ></img> 
        <br />     
        <br />     
        <TextContainer>
          <p> {
            "We pooled our estimates for alpha in eyes open vs eyes closed as a class, and computed the average and compared the results with a paired samples t-test. As you can see, even if we remove some of the outliers with extreme values that may have been artifacts, we still find that for most people we estimated larger alpha power when their eyes were open. Why could this be?"
          } 
        <Link url="https://docs.google.com/spreadsheets/d/1d4oakU6ER_fDO-t2eHk1Wrj3F99eZYZGkjVXVXVwNQs/edit?usp=sharing"
                external={true}
        > You can access a read only copy of the spreadsheet we used to compute these group level effects here. </Link>  
        </p>
        </TextContainer>   
      </Card.Section>
      <Card.Section title={'Limitations'}>
        <TextContainer>
          <p> {
            "We discussed in class that we had very little control over WHAT people were doing while their eyes were open. Some were looking around, some may have been blinking, some may have been reading their screen. There was a great deal of variability in the EEG signal due to differences in peoples behaviour during our task. As we have seen in previous modules, these kind of artifacts can create artificial power in most lower frequency bands. Because we were looking just at the alpha frequency band, we did not estimate the full range of differences across frequencies. "
          } </p>
        </TextContainer>
        <br />
        <TextContainer>
          <p> {
            "Furthermore, the short recording time (10 Seconds) also allows for less reliable measurement of the EEG signal. In addition, people may not have been prepared when the button was pressed to start their recording. "
          } </p>
        </TextContainer>
      </Card.Section>
      <Card.Section title={'New Experiment'}>
        <TextContainer>
          <p> {
            "Based on all these ideas, in this module we are going to run a more controlled experiment comparing the EEG during eyes open and eyes closed conditions. Instead of just recording averages over frequency bands, we will record the whole spectra."
          } </p>
        </TextContainer>
        <br />
        <TextContainer>
          <p> {
            "This module, the recording sessions will be 60 seconds long. They will also begin with a 2 second delay after pressing the button. A window will pop up with a red fixation cross. In the eyes open condition participants should keep their eyes fixed on this red fixation cross the entire 60 seconds, and should try to minimize blinking as much as possible."
          } </p>
        </TextContainer>
        <br />
        <TextContainer>
          <p> {
            "Please DO NOT change any of the settings. The module will pick a random number to tell you which condition to run first, so that we can counterbalance the order. Keep track of this order in a lab notebook you will submit."
          } </p>
        </TextContainer>
        <br />     
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

export function renderRecord(recordPopChange, recordPop, status, Settings, recordTwoPopChange, recordTwoPop, setSettings) {
  
  function handleSecondsToSaveRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, secondsToSave: value}));
  }

  const recordDelay = 2000;

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
          <p> {
            "Each person will record two sessions, one with eyes open and one with eyes closed. The output files are identical to those we recorded in the spectra module 5. "
          } </p>
        </TextContainer>   
        <TextContainer>
          <p> {
            "The random number generator suggest you run the following condition first: " + firstType
          } </p>
        </TextContainer>  
        <br />
        <ButtonGroup>
                <RangeSlider 
          disabled={status === generalTranslations.connect} 
          min={2}
          max={180}
          label={'Recording Length: ' + Settings.secondsToSave + ' Seconds'} 
          value={Settings.secondsToSave} 
          onChange={handleSecondsToSaveRangeSliderChange} 
        />
          <Button 
            onClick={() => {
              recordPopChange();
              setTimeout(() => {  
                saveToCSV(Settings, "Closed");
               }, recordDelay);
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect || recordPop}
          > 
            {'Record Eyes Closed Data'}  
          </Button>
          <Button 
            onClick={() => {
              recordTwoPopChange();
              setTimeout(() => {  
                saveToCSV(Settings, "Open");
              }, recordDelay); 
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect || recordTwoPop}
          > 
            {'Record Eyes Open Data'}  
          </Button> 
        </ButtonGroup>
        <TextContainer>
          <p> {
            "Instead of averaging over all electrodes, we will separately average the frontal and temporal electrodes to look for differences in different locations on the head. First you will each analyze your own data to summarize what you found. We will average the spectra values over the entire 60 seconds, and also over contralateral pairs of electrodes. You can watch a video showing you how to do this if you need a reminder here: "
          } </p>
        </TextContainer>          
        <YouTube 
            videoId="D9skUfAOstE"
            opts={opts}
          />
        <TextContainer>
          <p> {
            "Finally, we will paste the resulting average spectra in each condition, at each of the two electrode locations into a group spreadsheet that we will use for our final assignment paper in the class. To clarify, each participant will make two recordings 1) Eyes open, and 2) Eyes closed. For each, the analysis will produce two arrays of numbers (spectra), one for Frontal electrodes, and one for posterior electrodes. Therefore there are four different tabs in the following group data log:"
          } </p>
        </TextContainer>
        <Link url="https://docs.google.com/spreadsheets/d/1Ip8Xitp548DVXikZhL55Ll-Vgg9UAFU0-N40_3-e8sw/edit?usp=sharing"
                external={true}
        > Group Data Log (4 tabs) </Link>  

        <Modal
          open={recordPop}
          onClose={recordPopChange}
          title="Recording Eye Closed Data"
        >
          <Modal.Section>
           <Card.Section>
              <P5Wrapper sketch={sketchFixation} />          
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
        <Modal
          open={recordTwoPop}
          onClose={recordTwoPopChange}
          title="Recording Eyes Open Data"
        >
          <Modal.Section>
           <Card.Section>
              <P5Wrapper sketch={sketchFixation} />          
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


function saveToCSV(Settings, condition) {
  console.log('Saving ' + Settings.secondsToSave + ' seconds...');
  var localObservable$ = null;
  const dataToSave = [];

  console.log('making ' + Settings.name + ' headers')

  // take one sample from selected observable object for headers
  localObservable$ = window.multicastAlpha$.pipe(
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

  // setup timer
  const timer$ = timer(Settings.secondsToSave * 1000)

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastAlpha$.pipe(
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
      saveAs(blob, Settings.name + "_" +  condition +  "_Recording_" + Date.now() + ".csv");
      console.log('Completed');
    }
  });
}
