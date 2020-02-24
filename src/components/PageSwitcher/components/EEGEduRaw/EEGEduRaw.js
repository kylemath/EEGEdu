 import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject, timer } from "rxjs";

import { TextContainer, Card, Stack, RangeSlider, Button, ButtonGroup, Modal, Link } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { take, takeUntil } from "rxjs/operators";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";
import YouTube from 'react-youtube'

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
    cutOffLow: .1,
    cutOffHigh: 100,
    interval: 25,
    srate: 256,
    duration: 1024,
    name: 'Raw',
    secondsToSave: 10
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionRaw) window.subscriptionRaw.unsubscribe();

  window.pipeRaw$ = null;
  window.multicastRaw$ = null;
  window.subscriptionRaw = null;

  // Build Pipe
  window.pipeRaw$ = zipSamples(window.source.eegReadings$).pipe(
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
  window.multicastRaw$ = window.pipeRaw$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastRaw$) {
    window.subscriptionRaw = window.multicastRaw$.subscribe(data => {
      setData(rawData => {
        Object.values(rawData).forEach((channel, index) => {
            channel.datasets[0].data = data.data[index];
            channel.xLabels = generateXTics(Settings.srate, Settings.duration);
            channel.datasets[0].qual = standardDeviation(data.data[index])          
        });

        return {
          ch0: rawData.ch0,
          ch1: rawData.ch1,
          ch2: rawData.ch2,
          ch3: rawData.ch3,
          ch4: rawData.ch4
        };
      });
    });

    window.multicastRaw$.connect();
    console.log("Subscribed to Raw");
  }
}

export function renderModule(channels) {
  function renderCharts() {
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
          }
        ]
      },
      animation: {
        duration: 0
      },
      title: {
        ...generalOptions.title,
        text: 'Raw data from EEG electrdoes'
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
          data: channels.data.ch0.datasets[0].data.map(function(x) {return x + 300}),
          fill: false
        }, {
          label: channelNames[1],
          borderColor: 'rgba(27,158,119)',
          data: channels.data.ch1.datasets[0].data.map(function(x) {return x + 200}),
          fill: false
        }, {
          label: channelNames[2],
          borderColor: 'rgba(117,112,179)',
          data: channels.data.ch2.datasets[0].data.map(function(x) {return x + 100}),
          fill: false
        }, {
          label: channelNames[3],
          borderColor: 'rgba(231,41,138)',
          data: channels.data.ch3.datasets[0].data.map(function(x) {return x + 0}),
          fill: false  
        }, {
          label: channelNames[4],
          borderColor: 'rgba(20,20,20)',
          data: channels.data.ch4.datasets[0].data.map(function(x) {return x + -100}),
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
              "Next we will move onto the head and look at the raw EEG data that is recorded and transmitted by the EEG headset. ",
              "If you have not already, spend a few minutes going through the Introduction Module 1, which will give you an intro into the EEG signal. " 
            ]} </p>
            <p>{specificTranslations.description}</p>
          </TextContainer>
          <img 
            src={ require("./electrodelocations.png")} 
            alt="exampleSpectra"
            width="50%"
            height="auto"
          ></img>  
          </Stack>
          <br />
          <Link url="https://github.com/NeuroTechX/eeg-101/blob/master/EEG101/src/assets/electrodediagram2.png"
                external={true}
          > Image Source - EEG101 </Link>
          <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>

      </Card.Section>
      <Card.Section>
        <TextContainer>
          <p> {[
            "If you have not already, it is now time to place the muse on your head. ",
            "Getting a good connection between the device and your head is crucial. ",
            "The following video gives tips on how to get a great connection: "
          ]} </p>
          <YouTube 
            videoId="v8xUYqqJAIg"
            opts={opts}
          />
          <p> {[
            "The above chart shows the data coming from each of the four eeg electrodes. ",
            "Time, again, is on the horizontal X-axis and voltage is on the Y-axis. ",
            "An offset has been added to the electrodes to separate them vertically. ",
            "The saturation of the lines is controlled by the amount of noise in the data. ",
            "That is, the cleaner the data, the more rich the colours will become. ",
            "Conversely, when the line gets dim, there is too much noise present in the signal. ", 
            "I have set the filter settings above very loose (.1 to 100 Hz) to let in as much noise as possible so we can learn, we will restrict them in future modules. "
          ]} </p>
        </TextContainer>      
      </Card.Section>
      <Card.Section title="Artifacts">
        <TextContainer>
          <p> {[
              "Before we try to use the EEG to estimate brain activity, we first need to observe what other things can influence the signal. ",
              "Artifacts refer to non-EEG noise in the EEG recording that will cloud the results we want from the brain. ",
              "There are many sources of noise that the EEG can pickup because all it is doing is recording the voltage changes on the head. ",
              "Any other source of voltage or change in resistance of the sensor can affect the signal. ",
              "Here is a great overview of the range of possible EEG artifacts that you might come accross. " 
            ]} </p>
        </TextContainer>
        <br />
        <iframe src="//www.slideshare.net/slideshow/embed_code/key/BbKErrb1x7Xf3" title="dum" width="60%" height="400" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"> 
        </iframe> 
        <div> 
            <Link url="//www.slideshare.net/SudhakarMarella/eeg-artifacts-15175461" external={true}>EEG artifacts</Link> 
           from  
            <Link url="https://www.slideshare.net/SudhakarMarella" external={true}> Sudhakar Marella</Link>
        </div>
      </Card.Section>
      <Card.Section title="Weekly Assignment:">
        <TextContainer>
          <p> {[
              "Your assignment this week will be to record plots of four different types of EEG artifact. ",
              "I will show you examples that I made using screenshots of the plot above. ", 
              "To take a screenshot on a mac, press (⌘Command + ⇧Shift + 4) and select the area of the screen you want to save. ",
              "You can also record data into a .csv file below and plot artifacts using Google Sheets. ", 
              "After making your plots, play around with the filter settings above (cutoff Low and cutoff High) and observe how they change the plotted data. ", 
              "How can we use these filters to help collect cleaner data free from some of these artifacts?"
            ]} </p>
        </TextContainer>  

      </Card.Section>

      <Card.Section title="👁️ Eye Blinks/Movements 👀">
        <TextContainer>
          <p> {[
              "The eye balls create an electrical field, as they move around they create electrical potentials that are picked up by the EEG sensors. ",
              "Also, the eye lids, as the pass over the eye, create an electrical field that is picked up by the EEG electrodes. ", 
              "Eye movement and Blink artifacts are some of the largest and most difficult to remove from the data. ", 
              "The best way to get clean data is to try to limit blinking and eye movements. ",
              "These eye movement signals can also be treated as a signal of interest, called the Electrooculogram (EOG)"
            ]} </p>
        </TextContainer>
        <br />
        <p> {"Eye Blinks: "} </p>
         <img 
            src={ require("./blinks.png")} 
            alt="blinks"
            width="60%"
            height="auto"
          ></img>  
          <br />
          <p> {"Horizontal Eye Movements: "} </p>
          <img 
            src={ require("./horizontal.png")} 
            alt="horizontal"
            width="60%"
            height="auto"
          ></img>  
          <br />
          <p> {"Vertical Eye Movements: "} </p>
          <img 
            src={ require("./vertical.png")} 
            alt="vertical"
            width="60%"
            height="auto"
          ></img>  
       </Card.Section>

      <Card.Section title="💪🏿 Muscle Activity 💪🏻">
        <TextContainer>
          <p> {[
              "When signals are sent from our brain to our muscles the motor neurons release Acetylcholine onto the muscle fibres. ",
              "This release causes the muscles to contract, and these contractions create electrical potentials that are also picked up by electrodes. ",
              "This signal is called the Electromyogram (EMG), and can be measured over any muscle on your body. ", 
              "EEG electrodes therefore pickup muscle signals from your face muscles when you smile or frown, and from your chewing muscles. ", 
              "You should make sure to not be chewing gum for this reason while recording EEG. "
            ]} </p>
        </TextContainer>
        <br />
        <p> {"Example of Jaw Clenching: "} </p>
         <img 
            src={ require("./muscle.png")} 
            alt="muscle"
            width="60%"
            height="auto"
          ></img>  
          <br />
          <p> {"Zoomed in chewing (notice the difference horizontal axis time range): "} </p>
          <img 
            src={ require("./muscleClose.png")} 
            alt="muscleClose"
            width="60%"
            height="auto"
          ></img>         
       </Card.Section>

      <Card.Section title="🧑‍🔧 Mechanical artifacts 🧑🏾‍🔧">
        <TextContainer>
          <p> {[
              "The EEG electrodes measure the voltage of the human body between two points. Voltage, according to Ohms' law, ",
              "is modified both by the current and by the resistance (V = IR). ", 
              "Therefore, if current stays the same, changes in the electrical resistance of the electrode-body connection can change the voltage. ", 
              "These changes in voltage will not be distinguishable from real changes in voltage from the brain. ",
              "This is one reason that mobile recording of EEG is difficult, movement of the electrodes against the head leads to large voltage changes not due to brain activity. ", 
              "Therefore we want the muse to be firmly secured to the head, as tight as possible, and we want to avoid excessive movement during recording. "
            ]} </p>
        </TextContainer>
        <br />
        <p> {"Tapping on the muse moves the electrodes against the head: "} </p>
         <img 
            src={ require("./mechanical.png")} 
            alt="mechanical"
            width="60%"
            height="auto"
          ></img>    
       </Card.Section>

      <Card.Section title="😓 Drifts 😰">
        <TextContainer>
          <p> {[
              "Resistance between the sensor and the body leads to less current and smaller measured voltage. ", 
              "While out salty wet skin conducts electricity well, the dry skin and air does not, nor do oils and dirt that our skin is covered in. ",
              "Because voltage changes as resistance changes, we can sometimes see slow drifts in our EEG data as the connection strength changes. ",
              "One example is the moment you place the muse on your head, as the resistance decreases the voltage decreases as well as you can see here. ", 
              "These slow drifts can also occur due to sweating, which decreases the resistance slowly over time between the head and the sensor. "
            ]} </p>
        </TextContainer>
        <br />
        <p> {"When you first put on the muse or when you sweat long drifts occur: "} </p>      
         <img 
            src={ require("./drift.png")} 
            alt="drift"
            width="60%"
            height="auto"
          ></img>  
       </Card.Section>              

      <Card.Section title="🔌 Electrical Noise 💡">
        <TextContainer>
          <p> {[
              "Finally, there is electrical noise all around you. Buildings are supplied with 120 Volts of alternating current to power our lights and electronics. ",
              "This electrical alternates in polarity 60 times a second, allowing for much more efficient transportation accross distance locations. ", 
              "Most of our modern electronics convert this AC electrity to DC power (usually around 5 Volts and 2 Amps). ", 
              "All the computers in the room take in AC power from the building and convert it to DC in their power supply. ",
              "Therefore, there is alot of 60 Hz electrical noise in any building. ", 
              "Most EEG systems have filters to remove some of this noise, but even still, it is so strong that it is easily picked up by EEG electrodes. ", 
              "We can use filtering to remove this type of noise from our data. "
            ]} </p>
        </TextContainer>
       <br />
        <p> {"Electical noise at 60Hz from the AC power in the room (I held my wired headphones up to one side then the other of my head): "} </p>
         <img 
            src={ require("./lineNoise.png")} 
            alt="lineNoise"
            width="60%"
            height="auto"
          ></img>  
          <br />
          <p> {"Zoomed in 60-Hz electrical noise (notice the difference horizontal axis time range): "} </p>
          <img 
            src={ require("./lineNoiseClose.png")} 
            alt="lineNoiseClose"
            width="60%"
            height="auto"
          ></img> 
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
        min={1} step={1} max={4096}
        label={'Epoch duration (Sampling Points): ' + Settings.duration} 
        value={Settings.duration} 
        onChange={handleDurationRangeSliderChange} 
      />          
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        min={1} step={1} max={Settings.duration}
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
    <Card title={'Record ' + Settings.name + ' Data'} sectioned>
      <Card.Section>
        <p>
          {"When you are recording raw data it is recommended you "}
          {"first set the sampling point between epochs to 1, then set the epoch duration to 1. "}
          {"Once the live chart disappears entirely you have done it correctly. "}
          {"This will make it so every row of the output file is a single time point and make the data much easier to work with."}
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

 
  // for each module subscribe to multicast and make header
  // take one sample from selected observable object for headers
  localObservable$ = window.multicastRaw$.pipe(
    take(1)
  );
  //take one sample to get header info
  localObservable$.subscribe({ 
  next(x) { 
    dataToSave.push(
      "Timestamp (ms),",
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

   // Create timer 
  const timer$ = timer(Settings.secondsToSave * 1000);

  // put selected observable object into local and start taking samples
  localObservable$ = window.multicastRaw$.pipe(
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