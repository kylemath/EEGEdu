import React from "react";
import { catchError, multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import { TextContainer, Card, Stack } from "@shopify/polaris";

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
    interval: 1,
    srate: 256,
    duration: 1024
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
            {"Below you are now looking at an live measurement of the electrical potential created by your brain. "}
            {"Just like a AA battery stores 1.5 volts of electrical potential energy accross its positive and negative leads, "}
            {"two points on your head also have a much smaller electrical potential when measured accross them. "}
            {"Here we are watching that live, with the voltage on the vertical axis (\u03BCV are microvolts, 1 million microvolts are in a volt). "}
            {"Time is shown in milleseconds along the horizontal axis, with the right side of the chart being the current moment:"}
          </p>       
          <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
          <p>
            {"Read on to find out where this electrical potential comes from and what it means. "}
          </p>  
        </Card.Section>
      </Card>

      <Card title={"Neurons"}>
        <Card.Section>
          <p>
            {"The brain is made up of cells called neurons. "}
            {"Neurons communicate using chemical messages that change the electrical potential of the cells they connect with. "}
            {"This change in electrical potential, if large enough, can make those cells send messages as well, and so on. "}
            {"For example, an excitatory neuron releases Glutamate on another neuron, which lets in positively charged Sodium ions into the cell and make its interior less negative compared to outside. "}
            {"These changes in electrical potential create small electrical fields, which act as tiny electrical dipoles like batteries. "}
          </p>
          <img 
            src={ require("./assets/neuronarrow.png")} 
            alt="Single Neuron"
            height="400"
          ></img>
          <p>
            {"The electrical potential accross the cell membrane is small, around -70 mV at rest (1000 microvolts in a millivolt), and it changes around -20 mV during electrical changes in the cell. "}
            {"However, if a large group of these tiny dipoles are aligned in space and their electrical potentials change at the same time, "}
            {"they can create electrical potentials which are large enough to conduct through the brain tissue and be measurable comparing different points on the head. "}
          </p>         
          <img 
            src={ require("./assets/neuronmultiarrow.png")} 
            alt="Multiple Neurons"
            height="400"
          ></img> 
          <p>
            {"As you can see above, these electrical potentials measured on the outside of the head fluctuature between about -200 and 200 \u03BCV. "}
            {"You can also see cycles between high and low voltage, called oscillations, which can occur in the human brain at a number of frequencies. "}
            {"You may have heard of some of these brain waves before, but what do they mean? "}
          </p> 
        </Card.Section>
      </Card>

      <Card title={"Oscillations"}>
        <Card.Section>
          <p>
            {"Large groups of aligned neurons are all becoming more and less active together in groups. "}
            {"And these fluctuations in activity seem to occur within certain frequency bands. "}
            {"It has been proposed that these different frequencies of neural activity serve functional mechanisms in the brain. "}
            {"That is, one of the ways the brain uses to process and communicate information is through these rhythmic processes. "}
            {"These oscillations can change during different behaviours. One of the most drastic is the difference in the EEG when we fall asleep: "}

          </p>
          <img 
            src={ require("./assets/awakeasleep.gif")} 
            alt="Awake/Asleep"
            height="400"
          ></img>
          <p>
            {"When we are awake, our EEG signal is dominated by high frequency activity called Beta waves. "}
            {"When we fall asleep, our brain slows down. Larger and larger groups of neurons all fire together, in slow oscillations called Delta waves. "}
            {"We will learn more in the modules on the frequency spectra and frequency bands about what the various oscillations represent and how they change. "}
            {"We use the power of these brain waves to provide real time feedback about the state of your brain and practice Neurofeedback applications. "}
            {"We can also use these measures to control oscillations, or control some Brain Machine Interfaces (BMIs). "}
            {"But first, a little more about the tecnology we are using to measure and vizualize these signals. "}
          </p>         
        </Card.Section>
      </Card>

      <Card title={"EEG Hardware"}>
        <Card.Section>
          <p>
            {"Because the brain has a great deal of salty water in it, it conducts electricity. "}
            {"This electrical field gets smeared by the slightly electrically resistive skull and scalp. "}
            {"Therefore the signal on the outside of the head has very little spatial information about where the signal came from. "}
            {"Even worse, any potential measured on the head could have an infinite number of dipole configurations inside the head creating it. "}
            {"Nonetheless, there are still difference in voltage between different parts of the head that may be interesting. "}
          <br />
          <br />
            {"To measure the spatial distribution of the voltage signals, EEG is traditionally placed in a regular grid of electrode locations covering the surface of the head. "}
            {"Each location is given a name, with the letter indicating the location of the head (F-Frontal; C-Central; P-Parietal; T-Temporal; O-Occipital; Fp-Fronto-polar). "}
            {"The suffix has a z if along the midline, odd numbers over the left hemisphere, and even over the right. "}
            {"Numbers start along the midline and get larger for more lateral sites on the head. "}
          </p>
          <img 
            src={ require("./assets/electrodelocations.png")} 
            alt="electrode locations"
            height="400"
          ></img>
          <br />
          <br />
          <p>
            {"Voltage is electrical potential, and like a battery, is measured as the difference between two locations. "}
            {"In the case of EEG, we use a reference electrode, shown here in black, to compare each of the other electrode locations against. "}
            {"The EEG device must therefore measure the difference in voltage at each of its sensors compared to some reference location. "}
            {"It must then amplify this very small signal, and convert this voltage to some signal that can be saved by a computer (digitization), and in the case of wireless EEG, transmit the signal. "}
            {"A computer must then receive this signal, and display it, process it, or save it for later analysis. "}
          <br />
          <br />          
            {"The amplification and digitization turns the continuous voltage into a digitized signal. "}
            {"This signal now has descrete time steps and descrete difference in voltage. "}
            {"The hardware's sampling rate controls how many samples of voltage per second (in Hz) are recorded. For example Muse 2 records 256 samples per second. "}
            {"The digitization's bit depth, or how many memory bits are used to represent each voltage value, influence the smallest change in voltage that a system can measure. "}
            {"Finally, since there are multiple electrode locations, these individual signals need to be digitized quickly one after another each recording cycle, this is called mulitplexing. "}
          <br />
           <img 
            src={ require("./assets/DigitalDAQv2.png")} //https://upload.wikimedia.org/wikipedia/commons/9/97/DigitalDAQv2.pdf
            alt="electrode locations"
            height="400"
          ></img>
          <br />
            {"One important consideration is the electrical conductivity between the head and the sensor. "}
            {"An electrode is a conductive piece of material that takes the voltage difference between locations on the head and transmits it along a wire to the amplifier/digitizer. "}
            {"The signal will therefore be greatly affected by the conductivity of the electrode to head connection. "}
            {"The inverse of conductivity we call electrical resistance, and since the EEG oscillates like an alternating current power source, we call this impedance. "}
            {"Notice that the muse uses two different types of sensor material, gold on the forehead, and conductive rubber behind the ears. "}
          </p>      
        </Card.Section>
      </Card>

      <Card title={"Interaxon Muse"}>
        <Card.Section>
          <p>
            {"A decade ago, before the revolution in wireless and battery powered electronics, EEG devices were large and combersome. "}
            {"EEG devices reqired large amplifiers and digitizers, with dedicated power supplies, and desktop computers for data recording and analysis. "}
            {"Computing limitations limited live data processing and experimentation. "}
            {"Within the last decade, a series of new consumer focused EEG devices have been devleoped, drastically reducing the price and portability of the technology. "}
            {"One of the most common is the Muse and Muse 2 created by Toronto based Interaxon Inc. "}
          <br />
          <br />
           <img 
            src={ require("./assets/musepicture.png")} 
            alt="Awake/Asleep"
            height="300"
          ></img> 
          <br />
          <br />
            {"The Muse is sold as an interactive mediation device, for under 300$ US. "}
            {"Researchers have compared the signals with traditional expensive EEG devices and found very positive results. "}
            {"Therefore the muse makes for an excellent teaching tool to integrate real time brain measurement into the classroom. "}
            {"The muse records EEG data at 256 Hz, from four electrode locations shown here: "}
          <img 
            src={ require("./assets/electrodediagram.png")} 
            alt="Awake/Asleep"
            height="200"
          ></img> 
          <br />
           <img 
            src={ require("./assets/electrodelegend.png")} 
            alt="Awake/Asleep"
            height="75"
          ></img> 
          <br />
          <br />
            {"In the subsequent modules in this EEGEdu tutorial, you will use the live data from these four electrode locations. "}
          </p>  
        </Card.Section>
      </Card>

      <Card title={"Credits"}>
        <Card.Section>
          <p>
            {"EEGEdu is an open source collaborative project with NeurotechX's "}
            <a href="http://learn.neurotechedu.com/">NeurotechEdu. </a>
          </p>
          <p>
            {"This is also created in collaboration with "}
            <a href="https://choosemuse.com/muse-research/">Interaxon. </a>
          </p>
          <p>
            {"This online tutorial is made using a Muse connection by Web Bluetooth using "}
            <a href="https://github.com/urish/muse-js">muse-js </a>
            {"by Uri Shaked who has an excellent introduction to EEG "}
            <a href="https://medium.com/neurotechx/a-techys-introduction-to-neuroscience-3f492df4d3bf">A Techy's Introduction to Neuroscience. </a>
          </p>
          <p>
            {"The data is processed using Neurosity's "}
            <a href="https://github.com/neurosity/eeg-pipes">eeg-pipes </a>
            {"by Alex Castillo who also has an excellent post about EEG and the web called "}
            <a href="https://medium.com/@castillo.io/muse-2016-headband-web-bluetooth-11ddcfa74c83">Muse 2016 Headband + Web Bluetooth.</a>
          </p>
        </Card.Section>
      </Card>

    </React.Fragment>
  );
}

  
