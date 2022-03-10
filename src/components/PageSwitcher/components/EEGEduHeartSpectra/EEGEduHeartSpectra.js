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
    sliceFFTLow: 0.5,
    sliceFFTHigh: 2.5,
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
          duration: 200
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
            <p> {[
              "In the previous module we each estimated our heart rate in two conditions, while we were sitting, and while we were standing. ", 
              "We used a shared google sheet which combines all our data in order to compute group statistics. ",
              "The following video shows how to use the data to make plots of the data, compute statistics, and test the difference. "  
            ]} 
          <Link url="https://docs.google.com/spreadsheets/d/1_R4ViDw5VQv72F-lzi9BJyRPx1-BhQsj7XFckrvSW-Y/edit?usp=sharing"
                external={true}>
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
          <TextContainer>
            <p> {[
              "There are a few problems with the way we estimated heart rate in the previous module. ",
              "We used only a single 10 second segment of data which adds variability. ",
              "We also used peak detection to find each heart beat, which takes alot of time and is difficult with noisy data. ", 
              "This required us to make arbirary thesholds to find peaks, and led to some poor estimates in heart rate, as indicated by the number of outliers we needed to remove (~15). ", 
              "Therefore in this module we will use some signal processing to get a better estimate of heart rate. "  
            ]} </p>
          </TextContainer>
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
          </Stack>
          <Link url="https://en.wikipedia.org/wiki/Electrocardiography#/media/File:Limb_leads_of_EKG.png"
          external={true}>
           Image Source - Wikipedia </Link>
          <Stack>
          <br />
          <TextContainer>
            <p> {[
                "Now we can use the muse to estimate our heart rates, but in different ways. Instead of looking at the voltage over time, ",
                "We now transform the data to show us what frequencies are present in the continuous signal. ",
                "In this frequency domain, we now ignore time and consider how much power of each frequency there is in a segment of data. ",
                "If you place your fingers the same way you did when looking at your ECG, you should start to see a peak. ",
                "It may help to return to Module 2 and look at the raw data first. "
              ]} </p>
          </TextContainer>
                 <TextContainer>
          <p> {[
            "If you missed Module 2, here are the instructions: You can take off the muse from your head and place a finger on your right hand on the muse's reference electrode (in the center of the forehead). ",
            "We can then place a finger of our left hand on one of the eeg electrodes. Lets use the left forehead electrode (position AF7). ",
            "So place your left fingers pinching the left forehead electrode, and your right fingers pinching the center electrode. ",
            "Otherwise try to hold the Muse as still as possible, and relax your body. " 
         ]} </p>
        </TextContainer>
        <br />
        </Stack>
        <img 
          src={ require("./LeftHand.png")} 
          alt="LeftHand"
          width="25%"
          height="auto"
        ></img>  
        <img 
          src={ require("./RightHand.png")} 
          alt="RightHand"
          width="25%"
          height="auto"
        ></img> 
        <br />   
        <Stack>
          <br />        
          <img 
            src={ require("./electrodediagram2.png")} 
            alt="F7Electrode"
            width="25%"
            height="auto"
          ></img>
          <Link url="https://github.com/NeuroTechX/eeg-101/blob/master/EEG101/src/assets/electrodediagram2.png"
                external={true}>
            Image Source - EEG101 </Link>
 
          <TextContainer>
            <p> {[
                "In this new plot, Along the horizontal axis is the beats per minute, or the frequency of the peaks in your ECG. ", 
                "The vertical y-axis shows the power of the rhythms in the data at each frequency, or how large the changes are between peak and through of the oscillations. ",
                "The pink ball shows the estimated peak of the spectra, or your estimated heart rate. ",
                "In the following experiment, it is only this pink value that will be saved over time while we record. ",
                "Here is an example of what the plot should look like with a strong heart rate signal. ",
                "Notice that there are two peaks, 60 BPM and 120 BPM. The larger peak is called the 1st Harmonic, a multiple of the true heart rate. ",
                "These harmonics are common in the frequency domain: "
              ]} </p>
          </TextContainer>
           <img 
            src={ require("./exampleSpectra.png")} 
            alt="exampleSpectra"
            width="50%"
            height="auto"
          ></img>
        </Stack>
      </Card.Section>
    </Card>
    <Card title="Live spectra plot">
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
          "Clicking this button will immediately record the value of the pink dot above for ",
          Settings.secondsToSave,
          " seconds. ",
          "Therefore, make sure the chart above looks clean and you can see a clear peak in the spectra before pressing record. ",
           "We are going to compare two conditions that show a clear difference in heart rate due to blood pressure changes: ",
           "Standing and Sitting. ",
           "You will record two sessions, one standing and one sitting, pick the order randomly but keep track of which output file is which"
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
            "Remember for each person to record two files, one while  standing and one while  sitting. ", 
            "Here is an example of what the data will look like once loaded. ",
            "The first column shows the time in msec of each estimate of heart rate. The second column shows the heart rate estimate in BPM. ",
            "Each row represents an estimate from the previous 8 seconds of data. ",
            "This is because you need a long segment of time to estimate frequency of rhythms over time. ",
            "Each subsequent row is from an 8 second chunk of data, but is taken about 400 ms after the previous row. ",
            "You can see the time values increase about 10000 ms during the recording, representing the 10 seconds of data. ",
            "So 10000 milliseconds divided into ~400 ms shifts per row gives us the rough number of rows (~25). ", 
            "The graph shows the values plotted over time, showing that the 1st Harmonic value of 120 BPM was incorrectly recorded on a few windows. "
          ]} </p>
        </TextContainer>
        <img 
          src={ require("./exampleOutput.png")} 
          alt="exampleOutput"
          width="75%"
          height="auto"
        ></img>
        <TextContainer>
          <p> {[
            "In this module the analysis will be much easier, since much of the work has been done by the webpage with the fourier transform and peak detection. ",
            "The following youtube video will show you how to open the file in Google Sheets, rename it, plot the data, remove any harmonics or outliers,  ",
            "then take the average heart rate over the window as an estimate of your heart rate. "
            ]} 
        <Link url="https://docs.google.com/spreadsheets/d/1AcFxuIZDMNfOifgql2vrFy2nSS3g7c14fOxAdptOgQY/edit?usp=sharing"
             external={true}>

         Link to example google sheet from video. 
        </Link>  
        </p>
        </TextContainer>
        <br />
        <YouTube 
          videoId="6EtzwGXjB9Q"
          opts={opts}
        />
        <TextContainer>
          <p> {[
            "Finally each of you will enter this estimated heart rate for both sitting and standing into a new anonymized google sheet that we are sharing as a class. ", 
            "We will use this shared google sheet which combines all our data in order to compute group statistics and to compare the two methods of estimating our heart rate. "  
          ]} </p>

        <ol>
          <li>Open up the Module 2&amp;3 Anonymized Data Log and make a copy to work on:&nbsp;
            <Link url="https://docs.google.com/spreadsheets/d/1_R4ViDw5VQv72F-lzi9BJyRPx1-BhQsj7XFckrvSW-Y/edit?usp=sharing" 
              external={true}>
              https://docs.google.com/spreadsheets/d/1_R4ViDw5VQv72F-lzi9BJyRPx1-BhQsj7XFckrvSW-Y/edit?usp=sharing
            </Link>
          </li>
          <li>This time your report will focus on comparing the results from module 2 to module 3. Start by explaining that in your report, and explain what the difference was between the two modules measurement.</li>
          <li>I have already removed outliers from Module 2, Why are there no outliers in Module 3? Include this in your report.</li>
          <li>Recompute the statistics you did for the Module 2 data comparing sitting vs standing, and do the same for module 3. Compute the average, count, standard deviation, and standard error for each column. In our summary Report the mean and standard deviation in each of the four conditions.&nbsp;</li>
          <li>Notice how some participants only have a score in one module, let us ignore that for now.</li>
          <li>Now for both module 2 and module 3, compute a paired samples t-test comparing sitting vs standing. (You have already done this for module 2). Report the two result in apa format (eg. - <i>t</i>(df) = 3.904; p = .003).&nbsp;</li>
          <li>Include bar graphs showing the sitting and standing HR in each of the four conditions.&nbsp;&nbsp;</li>
          <li>For both module 2 and module 3, make a new column and compute the difference in heart rate Sitting minus standing (Sitting - Standing). Report the average difference in each condition, as well as the standard deviation of the difference. Show a bar graph of the differences and their standard error.</li>
          <li>In which module is the standard deviation larger? What does this mean</li><li>It seems we found the same effect in module 2 and module 3. Both t-tests should be significant, but we also want to test how the scores on each module are related.&nbsp;</li>
          <li>The following two steps require individuals to have a score for all four conditions, so first REMOVE ROWS where individuals only had values from one of the modules. This should leave 65 individuals (remember the row names are on the first row).&nbsp;</li>
          <li>First we want to test if there is a difference between the differences. This would occur if our methods in module 2 and our methods in module 3 gave different changes in heart rate. Compute a t-test comparing the two difference columns. Report the results in APA format. Interpret the results.</li>
          <li>Compute the correlation between the difference measured in module 2 and the difference measured in module 3, show a scatter plot comparing them as well. Interpret the strength of the relationship between the change we measured in module 2 and the change we measured in module 3.</li>
          <li>Make a final concluding statement about which methods is better for estimating heart rate and why.</li>
        </ol>

        </TextContainer>
        <br />

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
