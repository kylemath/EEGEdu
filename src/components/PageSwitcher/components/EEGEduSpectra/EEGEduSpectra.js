import React from "react";
import { catchError, multicast } from "rxjs/operators";

import { Card, Stack, TextContainer, RangeSlider } from "@shopify/polaris";
import { Subject } from "rxjs";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

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

export function getSpectraSettings () {
  return {
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 30,
    srate: 256,
    duration: 1024
  }
};

export function buildPipeSpectra (spectraPipeSettings) {
  if (window.subscriptionSpectra$) window.subscriptionSpectra$.unsubscribe();

    window.pipeSpectra$ = null;
    window.multicastSpectra$ = null;
    window.subscriptionSpectra$ = null;

    window.pipeSpectra$ = zipSamples(window.source$.eegReadings).pipe(
      bandpassFilter({ cutoffFrequencies: [spectraPipeSettings.cutOffLow, spectraPipeSettings.cutOffHigh], nbChannels: spectraPipeSettings.nbChannels }),
      epoch({
        duration: spectraPipeSettings.duration,
        interval: spectraPipeSettings.interval,
        samplingRate: spectraPipeSettings.srate
      }),
      fft({ bins: spectraPipeSettings.bins }),
      sliceFFT([spectraPipeSettings.sliceFFTLow, spectraPipeSettings.sliceFFTHigh]),
      catchError(err => {
        console.log(err);
      })
  );

  window.multicastSpectra$ = window.pipeSpectra$.pipe(
    multicast(() => new Subject())
  );
}

export function setupSpectra(setSpectraData) {
  console.log("Subscribing to Spectra");

  if (window.multicastSpectra$) {
    window.subscriptionSpectra$ = window.multicastSpectra$.subscribe(data => {
      setSpectraData(spectraData => {
        Object.values(spectraData).forEach((channel, index) => {
          if (index < 4) {
            channel.datasets[0].data = data.psd[index];
            channel.xLabels = data.freqs;
          }
        });

        return {
          ch0: spectraData.ch0,
          ch1: spectraData.ch1,
          ch2: spectraData.ch2,
          ch3: spectraData.ch3
        };
      });
    });

    window.multicastSpectra$.connect();
    console.log("Subscribed to Spectra");
  }
}

export function EEGEduSpectra(channels) {
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
                max: 100,
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

export function renderSlidersSpectra(setSpectraData, status, setSpectraPipeSettings, spectraPipeSettings) {

  function handleSpectraIntervalRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, interval: value}));
    buildPipeSpectra(spectraPipeSettings);
    setupSpectra(setSpectraData);
  }

  function handleSpectraCutoffLowRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, cutOffLow: value}));
    buildPipeSpectra(spectraPipeSettings);
    setupSpectra(setSpectraData);
  }

  function handleSpectraCutoffHighRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, cutOffHigh: value}));
    buildPipeSpectra(spectraPipeSettings);
    setupSpectra(setSpectraData);
  }

  function handleSpectraSliceFFTLowRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, sliceFFTLow: value}));
    buildPipeSpectra(spectraPipeSettings);
    setupSpectra(setSpectraData);
  }

  function handleSpectraSliceFFTHighRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, sliceFFTHigh: value}));
    buildPipeSpectra(spectraPipeSettings);
    setupSpectra(setSpectraData);
  }

  function handleSpectraDurationRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, duration: value}));
    buildPipeSpectra(spectraPipeSettings);
    setupSpectra(setSpectraData);
  }

  return (
    <React.Fragment>
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Epoch duration (Sampling Points): ' + spectraPipeSettings.duration} 
        value={spectraPipeSettings.duration} 
        onChange={handleSpectraDurationRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Sampling points between epochs onsets: ' + spectraPipeSettings.interval} 
        value={spectraPipeSettings.interval} 
        onChange={handleSpectraIntervalRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Cutoff Frequency Low: ' + spectraPipeSettings.cutOffLow + ' Hz'} 
        value={spectraPipeSettings.cutOffLow} 
        onChange={handleSpectraCutoffLowRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Cutoff Frequency High: ' + spectraPipeSettings.cutOffHigh + ' Hz'} 
        value={spectraPipeSettings.cutOffHigh} 
        onChange={handleSpectraCutoffHighRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Slice FFT Lower limit: ' + spectraPipeSettings.sliceFFTLow + ' Hz'} 
        value={spectraPipeSettings.sliceFFTLow} 
        onChange={handleSpectraSliceFFTLowRangeSliderChange} 
      />
      <RangeSlider 
        disabled={status === generalTranslations.connect} 
        label={'Slice FFT Upper limit: ' + spectraPipeSettings.sliceFFTHigh + ' Hz'} 
        value={spectraPipeSettings.sliceFFTHigh} 
        onChange={handleSpectraSliceFFTHighRangeSliderChange} 
      />
    </React.Fragment>
  )
}



