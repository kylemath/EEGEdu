import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer, RangeSlider } from "@shopify/polaris";
import { Subject } from "rxjs";

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

import P5Wrapper from 'react-p5-wrapper';
import p5 from "p5";
import "p5/lib/addons/p5.sound";

export function getSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 100,
    bins: 256,
    duration: 1024,
    srate: 256
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
      nbChannels: Settings.nbChannels }),
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
          if (index < 4) {
            channel.datasets[0].data = [
              data.delta[index],
              data.theta[index],
              data.alpha[index],
              data.beta[index],
              data.gamma[index]
            ];
            channel.xLabels = bandLabels;
          }
        });

        return {
          ch0: bandsData.ch0,
          ch1: bandsData.ch1,
          ch2: bandsData.ch2,
          ch3: bandsData.ch3
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
                max: 50,
                min: 0
              }
            }
          ]
        },
        title: {
          ...generalOptions.title,
          text: generalTranslations.channel + channelNames[index]
        }
      };
      // console.log(channel) 
      if (channel.datasets[0].data) {
        // console.log( channel.datasets[0].data[2])
        window.delta = channel.datasets[0].data[0];
        window.theta = channel.datasets[0].data[1];
        window.alpha = channel.datasets[0].data[2];
        window.beta  = channel.datasets[0].data[3];
        window.gamma = channel.datasets[0].data[4];
      }   

      if (index === 0) {
        return (
          <React.Fragment>
            <Card.Section key={"Card_" + index}>
              <Bar key={"Line_" + index} data={channel} options={options} />
            </Card.Section>
            <Card.Section key={"Dum_ " + index}>
              <P5Wrapper sketch={sketch} 
                delta={window.delta}
                theta={window.theta}
                alpha={window.alpha}
                beta={window.beta}
                gamma={window.gamma}
              />
            </Card.Section>
          </React.Fragment>
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
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}


export function sketch (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let osc, envelope, fft;

  let scaleArray = [50, 50, 50, 50];
  let note = 0;

  p.setup = function () {
    p.createCanvas(710, 200);
    osc = new p5.SinOsc();

    // Instantiate the envelope
    envelope = new p5.Env();

    // set attackTime, decayTime, sustainRatio, releaseTime
    envelope.setADSR(0.001, 0.5, 0.1, 0.5);

    // set attackLevel, releaseLevel
    envelope.setRange(1, 0);

    osc.start();

    fft = new p5.FFT();
    p.noStroke();
  };

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = props.delta;
    theta = props.theta;
    alpha = props.alpha;
    beta = props.beta;
    gamma = props.gamma;

    // if (props.rotation){
    //   rotation = props.rotation * Math.PI / 180;
    // }
  };

  p.draw = function () {
    p.background(20);

    if (p.frameCount % Math.floor(alpha)*100 === 0 || p.frameCount === 1) {
      let midiValue = scaleArray[note];
      let freqValue = p.midiToFreq(midiValue);
      osc.freq(freqValue);

      envelope.play(osc, 0, 0.1);
      note = (note + 1) % scaleArray.length;
    }

    let spectrum = fft.analyze();
    for (let i = 0; i < spectrum.length / 20; i++) {
      p.fill(spectrum[i], spectrum[i] / 10, 0);
      let x = p.map(i, 0, spectrum.length / 20, 0, p.width);
      let h = p.map(spectrum[i], 0, 255, 0, p.height);
      p.rect(x, p.height, spectrum.length / 20, -h);
    }


    // p.background(256);
    // p.ambientMaterial(250);
    // p.noStroke();

    // let locX = p.mouseX - p.height / 2;
    // let locY = p.mouseY - p.width / 2;

    // p.ambientLight(60, 60, 60);
    // p.pointLight(255, 255, 255, locX, locY, 100);


    // p.push();
    // p.translate(-100,0);
    // p.rotateY(50);
    // p.rotateX(50);
    // p.box(50, delta* 10, 100);
    // p.pop();

    // p.push();
    // p.translate(-50,0);
    // p.rotateY(50);
    // p.rotateX(50);
    // p.box(50, theta* 10, 100);
    // p.pop();

    // p.push();
    // p.translate(0,0);
    // p.rotateY(50);
    // p.rotateX(50);
    // p.box(50, alpha* 10, 100);
    // p.pop();

    // p.push();
    // p.translate(50,0);
    // p.rotateY(50);
    // p.rotateX(50);
    // p.box(50, beta* 10, 100);
    // p.pop();

    // p.push();
    // p.translate(100,0);
    // p.rotateY(50);
    // p.rotateX(50);
    // p.box(50, gamma* 10, 100);
    // p.pop();
  };

};


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
    <React.Fragment>
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
    </React.Fragment>
  )
}

