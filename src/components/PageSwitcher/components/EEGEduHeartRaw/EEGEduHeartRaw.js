import React from "react";
import { catchError, multicast, take  } from "rxjs/operators";
import { Subject } from "rxjs";

import { TextContainer, Card, Stack, ButtonGroup, Button, Modal, Link } from "@shopify/polaris";
import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";
import { saveAs } from 'file-saver';
import YouTube from 'react-youtube'
 
import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

import { generateXTics, standardDeviation } from "../../utils/chartUtils";

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    interval: 10,
    srate: 256,
    duration: 2560,
    name: 'HeartRaw'
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionHeartRaw) window.subscriptionHeartRaw.unsubscribe();

  window.pipeHeartRaw$ = null;
  window.multicastHeartRaw$ = null;
  window.subscriptionHeartRaw = null;

  // Build Pipe
  window.pipeHeartRaw$ = zipSamples(window.source.eegReadings$).pipe(
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
  window.multicastHeartRaw$ = window.pipeHeartRaw$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastHeartRaw$) {
    window.subscriptionHeartRaw = window.multicastHeartRaw$.subscribe(data => {
      setData(heartRawData => {
        Object.values(heartRawData).forEach((channel, index) => {
          channel.datasets[0].data = data.data[index];
          channel.xLabels = generateXTics(Settings.srate, Settings.duration).map(function(x) {return x / 1000});;
          channel.datasets[0].qual = standardDeviation(data.data[index])       
        });
        return {
          ch0: heartRawData.ch0,
          ch1: heartRawData.ch1
        };
      });
    });

    window.multicastHeartRaw$.connect();
    console.log("Subscribed to HeartRaw");
  }
}

export function renderModule(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      if (index === 1) {
        const options = {
          ...generalOptions,
          scales: {
            xAxes: [{
              scaleLabel: {
                ...generalOptions.scales.xAxes[0].scaleLabel,
                labelString: specificTranslations.xlabel
              },
              gridLines: {
                color: "rgba(50,50,50)"
              },
              ticks: {
                maxTicksLimit: 10
              }

            }],
            yAxes: [
              {
                scaleLabel: {
                  ...generalOptions.scales.yAxes[0].scaleLabel,
                  labelString: specificTranslations.ylabel
                }
              }
            ]
          },
          elements: {
            line: {
              borderColor: 'rgba(' + channel.datasets[0].qual + ', 128, 128)',
              fill: false
            },
            point: {
              radius: 0
            }
          },
          animation: {
            duration: 0
          },
          title: {
            ...generalOptions.title,
            text: generalTranslations.channel + channelNames[index] + ' --- SD: ' + channel.datasets[0].qual 
          },

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
    <React.Fragment>
    <Card title={specificTranslations.title}>
      <Card.Section>
        <Stack>
          <TextContainer>
            <p> {[
              "As a first introduction to measurement of electrical potentials from the body we will look at something accessible. ",
              "As the heart beats and pumps blood throuhgouts our body, a series of electrical potentials are created, which can be measured using electrodes placed around the heart. ",
              "This is referred to as the Electrocardiogram (ECG). You have seen this hundreds of times in movies and TV beside hospital beds. "
            ]} </p>
          </TextContainer>
        <br />
        <br />
        <img 
          src={ require("./ECG_Principle_fast.gif")} 
          alt="ECGPrinciples"
          width="50%"
          height="auto"
        ></img> 
        <Link url="https://commons.wikimedia.org/wiki/File:ECG_Principle_fast.gif"> Image Source - Wikipedia </Link>
        <br />
        <TextContainer>
          <p> {[
            "The ECG is best measured by comparing the electrical potential accross the left vs. right side of the body. ",
            "Depending on where on the body the measurements are taken, they pick up a different view of the electrical potentials generated by the heart. ",
            "One of the easiest places to measure is comparing the voltage between the left and right hands. ",
            "For example, this is how treadmills can read your heart rate when you place one hand on each of the two holds. "
          ]} </p>
        </TextContainer>
        <br />
        <img 
          src={ require("./LimbLead.png")} 
          alt="LeftHand"
          width="50%"
          height="auto"
        ></img>  
        <Link url="https://en.wikipedia.org/wiki/Electrocardiography#/media/File:Limb_leads_of_EKG.png"> Image Source - Wikipedia </Link>
        <br /> 
        <TextContainer>
          <p> {[
            "Therefore, you can see your own ECG today using the muse. ",
            "You can take off the muse from your head and place a finger on your right hand on the muse's reference electrode (in the center of the forehead). ",
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
          <TextContainer>
            <p> {[
              "If you haven't already, connect your muse and try to plot your heart rate before moving on to the data recording and analysis below. ",
              "Soon you should see spikes in voltage measured between those two electrodes each time your heart beats. ", 
              "Watch what happens when you move your body or fingers, and notice how delicate the signal is. " 
           ]} </p>
          </TextContainer>
        </Stack>

        
        <br />
      </Card.Section>
    </Card>
    <Card title={"Live Data"}>
      <Card.Section>
        <TextContainer>
          <p> {[
            "Here time is on the horizontal axis, and the voltage is on the vertical axis. ",
            "There are 10 Seconds of data shown, with the current time shown on the right. ",
            "There is a vertical line every second so you can estimate your heart rate roughly. ",
            "Below we will save data and use it to estimate your heart more accurately in a spreadsheet. ",
            "the signal will be red if it is noisy, and when you relax and hold still it will turn green/black"
            ]} </p>
        </TextContainer>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
    </React.Fragment>
  );
}
  
export function renderRecord(recordPopChange, recordPop, status, Settings) {

  const opts = {
    height: '195',
    width: '320',
    playerVars: { // https://developers.google.com/youtube/player_parameters
      autoplay: false
    }
  };

  return (
    <Card title={'Collect Raw Heart Rate Data'} sectioned>
      <Card.Section>
        <Stack>
        <TextContainer>
        <p> {[
          "Clicking this button will immediately record a 10 second long segment of data just like it is shown in the plot above. ",
          "Therefore, make sure the chart above looks clean and you can see you heart beat clearly before pressing record. ",
           "We are going to compare two conditions that show a clear difference in heart rate due to blood pressure changes: ",
           "Standing and Sitting. ",
           "You will record two sessions, one standing and one sitting, pick the order randomly but keep track of which output file is which"
           ]} </p>
        </TextContainer> 
        <ButtonGroup>
          <Button 
            onClick={() => {
              recordPopChange()
              saveToCSV(Settings);
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect}
          > 
            {'Record Raw ECG Data'}  
          </Button>
        </ButtonGroup>
        <TextContainer>
          <p> {[
            "A .csv file will be saved that can be opened in your favorite spreadsheet software like Microsoft Excel or in our examples, Google Sheets. ",
            "Remember for each person at your computer to record two files, one while they are standing and one while they are sitting. ", 
            "Here is an example of what the data will look like once loaded. ",
            "The top row shows the millsecond ellapsed in the data segment from 4 to 10,000. ",
            "The bottom row shows the voltage measured from the difference between the two electrode, for each of those moments in time. ",
            "The plot is plotting the data for each time point, this time with zero on the left. " 

          ]} </p>
        </TextContainer>
        <img 
          src={ require("./PlotEKG_Sheets.png")} 
          alt="F7Electrode"
          width="75%"
          height="auto"
        ></img>
        <TextContainer>
          <p> {[
            "The following youtube video will show you how to open the file in Google Sheets, rename it, plot the data, find the peaks,  ",
            "Record them and find their difference in time, then take the average difference to estimate your average heart period. ",
            "This value is then used to estimate your heart rate in beats per minute. "
            ]} 
        <Link url="https://docs.google.com/spreadsheets/d/1v2JfPkkiSiXizY9SZOhsliSpCyWDv6oW0ESu-wAL-DY/edit?usp=sharing">
         Link to example google sheet from video. 
        </Link>  
        </p>
        </TextContainer>

        <br />    
        <br />
        <YouTube 
          videoId="GyIofXQUOvE"
          opts={opts}
        />
        <br />
        <TextContainer>
          <p> {[
            "Finally each of you will enter this number for both sitting and standing into a google sheet that we are sharing as a class. ", 
            "We will use this shared google sheet which combines all our data in order to compute group statistics. "  
          ]} </p>
        </TextContainer>
        <br />
        </Stack>
      </Card.Section>

        <Modal
          open={recordPop}
          onClose={recordPopChange}
          title={"Data is recording"}
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

    </Card>
  );
}

function saveToCSV(Settings) {
  console.log('Saving ' + Settings.secondsToSave + ' seconds...');
  var localObservable$ = null;
  const dataToSave = [];

  console.log('making ' + Settings.name + ' headers')

 
  // for each module subscribe to multicast and make header
  // take one sample from selected observable object for headers
  localObservable$ = window.multicastHeartRaw$.pipe(
    take(1)
  );
  //take one sample to get header info
  localObservable$.subscribe({ 
  next(x) { 
    dataToSave.push(
      generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(t) {return t }) + ",", 
      "\n"
    );   
  }
  });

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastHeartRaw$.pipe(
    take(1)
  );

  // now with header in place subscribe to each epoch and log it
  localObservable$.subscribe({
    next(x) { 
      console.log(x)
      dataToSave.push(Object.values(x.data[1]).join(",") + "\n");
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