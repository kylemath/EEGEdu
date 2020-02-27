import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal, Link } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { takeUntil } from "rxjs/operators";
import { Subject, timer } from "rxjs";

import { channelNames } from "muse-js";
import { Bar } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch,
  fft,
  powerByBand
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";
import { bandLabels } from "../../utils/chartUtils";

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 50,
    interval: 100,
    bins: 256,
    duration: 1024,
    srate: 256,
    name: 'Bands',
    secondsToSave: 10 
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
      nbChannels: window.nchans }),
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
          channel.datasets[0].data = [
            data.delta[index],
            data.theta[index],
            data.alpha[index],
            data.beta[index],
            data.gamma[index]
          ];
          channel.xLabels = bandLabels;
        });

        return {
          ch0: bandsData.ch0,
          ch1: bandsData.ch1,
          ch2: bandsData.ch2,
          ch3: bandsData.ch3,
          ch4: bandsData.ch4
        };
      });
    });

    window.multicastBands$.connect();
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
                  min: 0,
                  max: 100
                }
              }
            ]
          },
          title: {
            ...generalOptions.title,
            text: 'Power by Frequency Band'
          }
        };

      if (channels.data.ch3.datasets[0].data) {
          const newData = {
            datasets: [{
              label: channelNames[0],
              backgroundColor: 'rgba(217,95,2)',
              data: channels.data.ch0.datasets[0].data,
              fill: false
            }, {
              label: channelNames[1],
              backgroundColor: 'rgba(27,158,119)',
              data: channels.data.ch1.datasets[0].data,
              fill: false
            }, {
              label: channelNames[2],
              backgroundColor: 'rgba(117,112,179)',
              data: channels.data.ch2.datasets[0].data,
              fill: false
            }, {
              label: channelNames[3],
              backgroundColor: 'rgba(231,41,138)',
              data: channels.data.ch3.datasets[0].data,
              fill: false  
            }, {
              label: channelNames[4],
              backgroundColor: 'rgba(20,20,20)',
              data: channels.data.ch4.datasets[0].data,
              fill: false  
            }],
            xLabels: channels.data.ch0.xLabels
          }

          return (
            <Card.Section key={"Card_" + 1}>
              <Bar key={"Line_" + 1} data={newData} options={options} />
            </Card.Section>
          );
        } else {
          return( 
            <Card.Section>
                <TextContainer>
                <p> {[
                "Press connect above to see the chart."  
                ]} 
                </p>
              </TextContainer>   
            </Card.Section>  
          )
        }
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
              <p>{[
                "In the next demo we look at the traditional frequency bands. ",
                "Oscillations in the brain are important as a mechinasm of brain function and communication. ", 
                "For example, within a brain area, cellular firing becomes locked to the ongoing oscillations of the local field potential: "
              ]}</p>
            </TextContainer>
            <img 
              src={ require("./phaseLockedFiring.png")} 
              alt="phaseLocked"
              width="50%"
              height="auto"
            ></img> 
            </Stack>
            <Stack> 
            <Link url="hhttps://en.wikipedia.org/wiki/Neural_oscillation#/media/File:SimulationNeuralOscillations.png"
              external={true}>
              Image Source - Wikipedia </Link>
              <br />
            <TextContainer>
              <p>{[
                "Since oscillations can control the timing of neural firing, they can also be used to communciate information and create distributed representations. ",
                "Two nearby brain regions that oscillate in sync will have cells that also fire in sync, which also means the neurons they connect to will be more influenced. ", 
                "Different brain regions have different frequency oscillations at different times "
              ]}</p>
            </TextContainer>
          <TextContainer>
            <p>{[
              "Oscillations in the brain seem to belong to a number of basic families or frequency bands that are influenced by cognition in different ways. ",
              "We take the same spectra that was computed in Spectra and divide into five bands. ",
              "Delta (1-4 Hz), Theta (4-7 Hz), Alpha (7-12 Hz), Beta (12-30 Hz), and Gamma (30+ Hz). "
            ]}</p>
          </TextContainer>
            <img 
              src={ require("./freqBands.jpg")} 
              alt="freqBands"
              width="50%"
              height="auto"
            ></img> 
            </Stack>
            <Stack> 
            <Link url="https://upload.wikimedia.org/wikipedia/commons/5/59/Analyse_spectrale_d%27un_EEG.jpg"
              external={true}>
              Image Source - Wikipedia </Link>
              <br />
          
          <TextContainer>
            <p>{[
              "These different frequency bands are associated with different brain states. ", 
              "For example, when we pay focus attention to something, our alpha goes down and our beta oscillations increase. ",
              "Gamma oscillations are associated with neural activity, but for the most part Gamma oscillations are very difficult to measure outside the head (very small) and so we will ignore them. ",
              "Theta oscillations increase during spatial navigation and are associated with learning and memory. ",
              "Alpha oscillations are assocaited with attention and active inhbition of neural activity, we will consider them further below. "
            ]}</p>
          </TextContainer>


              </Stack>
            </Card.Section>
          <Card.Section>
          <Stack>

      <TextContainer>
            <p>{[
              "Connect a muse and watch the following bar chart of the frequency band power. There is bar for each electrode. ",
              "See if you can pick one of the frequency bands and try to control the height by relaxing."
            ]}</p>
          </TextContainer>
         <img 
              src={ require("./electrodediagram.png")} 
              alt="Electrodes"
              width="20%"
              height="auto"
            ></img> 
        </Stack>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}


// https://en.wikipedia.org/wiki/Neural_oscillation#/media/File:SimulationNeuralOscillations.png
// https://upload.wikimedia.org/wikipedia/commons/5/59/Analyse_spectrale_d%27un_EEG.jpg
//

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
    </Card>
  )
}

export function renderRecord(recordPopChange, recordPop, status, Settings, setSettings) {

  function handleSecondsToSaveRangeSliderChange(value) {
    setSettings(prevState => ({...prevState, secondsToSave: value}));
  }
  
  return (
    <Card title={'Record Data'} sectioned>
      <Stack>
          <TextContainer>
            <p>{[
              "One of the earliest and easiest to measure changes in the EEG is that of alpha oscillations when the eyes closed. ",
              "We will test these changes by recording data in two conditions, and comparing the average alpha at all four electrodes between conditions. ", 
              "We expect to replicate the following relationship: "
            ]}</p>
          </TextContainer>
            <img 
              src={ require("./alphaOpenClosed.png")} 
              alt="closedOpen"
              width="50%"
              height="auto"
            ></img> 
            </Stack>
            <Stack> 
            <Link url="https://www.semanticscholar.org/paper/Coupling-between-visual-alpha-oscillations-and-mode-Mo-Liu/82593c9b9662d4dc022d51607b313f851f670246"
              external={true}>
              Image Source - Mo et al., 2013, Neuroimage </Link>
              <br />
              <br />
              <br />

        <TextContainer>
            <p>{[
              "First go to the Raw module 3 and check the data and connection quality. ",
              "Then come back to Module 6, no need to change any settings. ",
              "We will record two sessions for each person in your group, one with eyes open and one with eyes closed. ",
              "Once recorded you can open the .csv file and observe what gets saved. Along the rows are the different frequency bands from each electrode, we are going to average over all four electrodes in this assignment. ",
              "We are also going to average over time, which is shown on different rows. ", 
              "So please compute the average ALPHA power in that output file, and do the same for the other condition, make sure to keep track of which file was created during which condition. ", 
              "Compare your values for eyes open vs eyes closed, did you find the expected difference? ",
              "Why do you think alpha differs when we close our eyes? "
             ]}</p>
          </TextContainer>
        <TextContainer>
            <p>{[
              "Once you are complete, move on to the next Module and control live animations with the values of these frequency bands. ",
             ]}</p>
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
    "delta0,delta1,delta2,delta3,deltaAux,", 
    "theta0,theta1,theta2,theta3,thetaAux,",  
    "alpha0,alpha1,alpha2,alpha3,alphaAux,",  
    "beta0,beta1,beta2,beta3,betaAux,", 
    "gamma0,gamma1,gamma2,gamma3,gammaAux\n"
  );

  // Create timer 
  const timer$ = timer(Settings.secondsToSave * 1000);

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastBands$.pipe(
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