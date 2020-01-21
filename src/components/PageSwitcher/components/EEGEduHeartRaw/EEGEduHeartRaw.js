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
            <p>{specificTranslations.description}</p>
          </TextContainer>
        </Stack>
      </Card.Section>
    </Card>
    <Card title={'Title'}>
      <Card.Section>
        <p>
          {'Something...'}
        <br />
        <br />
         <img 
          src={ require("./ECG_Principle_fast.gif")} 
          alt="ECGPrinciples"
          width="25%"
          height="auto"
        ></img> 
        <br />
        <Link url="https://commons.wikimedia.org/wiki/File:ECG_Principle_fast.gif"> Image Source - Wikipedia </Link>
        <br />
        <br />
          {'Something else'}
        <br />
       <br />
        <br />

        <img 
          src={ require("./LimbLead.png")} 
          alt="LeftHand"
          width="25%"
          height="auto"
        ></img>  
        <br />
        <Link url="https://en.wikipedia.org/wiki/Electrocardiography#/media/File:Limb_leads_of_EKG.png"> Image Source - Wikipedia </Link>
        <br />      
        <br />      
          {'One more thing'}
        <br />
        <br />    
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
        <br />      
          {'One more thing'}
        <br />        
        <img 
          src={ require("./electrodediagram2.png")} 
          alt="F7Electrode"
          width="25%"
          height="auto"
        ></img>
        <br />      
          {'One more thing'}
        <br />


        </p>  
      </Card.Section>

      <Card.Section>
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
        <p>
          {"Clicking this button will begin the experiment so check your data quality on the raw module first. "}

        </p>   
      </Card.Section>
      <Stack>
        <ButtonGroup>
          <Button 
            onClick={() => {
              recordPopChange()
              saveToCSV(Settings);
            }}
            primary={status !== generalTranslations.connect}
            disabled={status === generalTranslations.connect}
          > 
            {'Record Raw Data'}  
          </Button>
        </ButtonGroup>
        <p>

        <br />      
          {'One more thing'}
        <br />
        <br />

        <img 
          src={ require("./PlotEKG_Sheets.png")} 
          alt="F7Electrode"
          width="75%"
          height="auto"
        ></img>
        <br />      
          {'One more thing'}
        <br />
        <br />      
        </p>
        <YouTube 
          videoId="GyIofXQUOvE"
          opts={opts}
        />
        <p>
        <Link url="https://docs.google.com/spreadsheets/d/1v2JfPkkiSiXizY9SZOhsliSpCyWDv6oW0ESu-wAL-DY/edit?usp=sharing">
         Link to example google sheet from video 
        </Link>
        <br />
        </p>

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

      </Stack>
    </Card>
  );

  // _onReady(event) {
  //   // access to player in all event handlers via event.target
  //   event.target.pauseVideo();
  // }
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