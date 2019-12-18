import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import { Card } from "@shopify/polaris";

import { Line } from "react-chartjs-2";

import { zipSamples } from "muse-js";

import {
  bandpassFilter,
  epoch
} from "@neurosity/pipes";

import { chartStyles, generalOptions } from "../chartOptions";

import * as specificTranslations from "./translations/en";

import { generateXTics, standardDeviation } from "../../utils/chartUtils";

export function getSettings () {
  return {
    name: "Intro",
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 2,
    srate: 256,
    duration: 512
  }
};

export function buildPipe(Settings) {
  if (window.subscriptionIntro$) window.subscriptionIntro$.unsubscribe();

  window.pipeIntro$ = null;
  window.multicastIntro$ = null;
  window.subscriptionIntro$ = null;

  // Build Pipe
  window.pipeIntro$ = zipSamples(window.source$.eegReadings).pipe(
    bandpassFilter({ 
      cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
      nbChannels: Settings.nbChannels }),
    epoch({
      duration: Settings.duration,
      interval: Settings.interval,
      samplingRate: Settings.srate
    }),
    catchError(err => {
      console.log(err);
    })
  );
  window.multicastIntro$ = window.pipeIntro$.pipe(
    multicast(() => new Subject())
  );
}

export function setup(setData, Settings) {
  console.log("Subscribing to " + Settings.name);

  if (window.multicastIntro$) {
    window.subscriptionIntro$ = window.multicastIntro$.subscribe(data => {
      setData(introData => {
        Object.values(introData).forEach((channel, index) => {
          if (index === 0) {
            channel.datasets[0].data = data.data[index];
            channel.xLabels = generateXTics(Settings.srate, Settings.duration);
            channel.datasets[0].qual = standardDeviation(data.data[index])          
          }
        });

        return {
          ch0: introData.ch0,
          ch1: introData.ch1,
          ch2: introData.ch2,
          ch3: introData.ch3
        };
      });
    });

    window.multicastIntro$.connect();
    console.log("Subscribed to " + Settings.name);
  }
}

export function EEGEdu(channels) {
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
                max: 300,
                min: -300
              }
            }
          ]
        },
        elements: {
          line: {
            borderColor: 'rgba(' + channel.datasets[0].qual*10 + ', 128, 128)',
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
          text: 'Voltage signal over time'
        }
      };

      if (index === 0) {
        return (
          <Card.Section key={"Card_" + index}>
            <Line key={"Line_" + index} data={channel} options={options} />
          </Card.Section>
        );
      } else {
        return null
      };
    });
  }

  return (
    <React.Fragment>

      <Card title={"Introduction"}>
        <Card.Section>
          <p>
            {specificTranslations.intro1}
          </p>       
            <div style={chartStyles.wrapperStyle.style}>
              {renderCharts()}
            </div>
          <p>
            {specificTranslations.intro2}
          </p>  
        </Card.Section>
      </Card>

      <Card title={specificTranslations.neuronsHead}>
        <Card.Section>
          <p>
            {specificTranslations.neurons1}
          </p>
          <img 
            src={ require("./assets/neuronarrow.png")} 
            alt="Single Neuron"
            width="100%"
            height="auto"
          ></img>
          <p>
            {specificTranslations.neurons2}
          </p>         
          <img 
            src={ require("./assets/neuronmultiarrow.png")} 
            alt="Multiple Neurons"
            width="100%"
            height="auto"
          ></img> 
          <p>
            {specificTranslations.neurons3}
          </p> 
        </Card.Section>
      </Card>

      <Card title={specificTranslations.oscillationsHead}>
        <Card.Section>
          <p>
            {specificTranslations.oscillations1}
          </p>
          <img 
            src={ require("./assets/awakeasleep.gif")} 
            alt="Awake/Asleep"
            width="100%"
            height="auto"
          ></img>
          <p>
            {specificTranslations.oscillations2}
          </p>         
        </Card.Section>
      </Card>

      <Card title={specificTranslations.hardwareHead}>
        <Card.Section>
          <p>
            {specificTranslations.hardware1}
          <br />
          <br />
            {specificTranslations.hardware2}
          </p>
          <br />
          <img 
            src={ require("./assets/electrodelocations.png")} 
            alt="electrode locations"
            width="50%"
            height="auto"
          ></img>
          <br />
          <br />
          <p>
            {specificTranslations.hardware3}
          <br />
          <br />          
            {specificTranslations.hardware4}
          <br />
           <img 
            src={ require("./assets/DigitalDAQv2.png")} //https://upload.wikimedia.org/wikipedia/commons/9/97/DigitalDAQv2.pdf
            alt="DAQ diagram"
            width="100%"
            height="auto"
          ></img>
          <br />
            {specificTranslations.hardware5}
          </p>      
        </Card.Section>
      </Card>

      <Card title={specificTranslations.museHead}>
        <Card.Section>
          <p>
            {specificTranslations.muse1}
          <br />
          <br />
           <img 
            src={ require("./assets/musepicture.png")} 
            alt="Awake/Asleep"
            width="75%"
            height="auto"
          ></img> 
          <br />
          <br />
            {specificTranslations.muse2}
          <br />
          <img 
            src={ require("./assets/electrodediagram.png")} 
            alt="Muse Electrodes"
            width="50%"
            height="auto"
          ></img> 
          <br />
           <img 
            src={ require("./assets/electrodelegend.png")} 
            alt="ElectrodeLegend"
            width="50%"
            height="auto"
          ></img> 
          <br />
          <br />
            {specificTranslations.muse3}
          </p>  
        </Card.Section>
      </Card>

      <Card title={specificTranslations.museHead}>
        <Card.Section>
          <p>
            {specificTranslations.signal1}
          <br />
          <img 
            src={ require("./assets/electrodediagram1.png")} 
            alt="SingleElectrode"
            width="50%"
            height="auto"
          ></img> 
          </p>       
            <div style={chartStyles.wrapperStyle.style}>
              {renderCharts()}
            </div>
          <p>
            {specificTranslations.signal2}
          </p>  
        </Card.Section>
      </Card>


      <Card title={specificTranslations.creditsHead}>
        <Card.Section>
          <p>
            {specificTranslations.credits1}
            <a href="http://learn.neurotechedu.com/">NeurotechEdu. </a>
          </p>
          <p>
            {specificTranslations.credits2}
            <a href="https://choosemuse.com/muse-research/">Interaxon. </a>
          </p>
          <p>
            {specificTranslations.credits3}
            <a href="https://github.com/urish/muse-js">muse-js </a>
            {specificTranslations.credits4}
            <a href="https://medium.com/neurotechx/a-techys-introduction-to-neuroscience-3f492df4d3bf">A Techy's Introduction to Neuroscience. </a>
          </p>
          <p>
            {specificTranslations.credits5}
            <a href="https://github.com/neurosity/eeg-pipes">eeg-pipes </a>
            {specificTranslations.credits6}
            <a href="https://medium.com/@castillo.io/muse-2016-headband-web-bluetooth-11ddcfa74c83">Muse 2016 Headband + Web Bluetooth.</a>
          </p>
        </Card.Section>
      </Card>

    </React.Fragment>
  );
}
