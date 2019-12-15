import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button, ButtonGroup, RangeSlider } from "@shopify/polaris";
import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT,
  powerByBand
} from "@neurosity/pipes";
import {Subject} from "rxjs";
import { catchError, multicast } from "rxjs/operators";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import { EEGEduRaw, setupRaw, buildPipeRaw } from "./components/EEGEduRaw/EEGEduRaw";
import { EEGEduSpectra, setupSpectra, buildPipeSpectra} from "./components/EEGEduSpectra/EEGEduSpectra";
import { EEGEduBands, setupBands, buildPipeBands } from "./components/EEGEduBands/EEGEduBands";

import * as translations from "./translations/en.json";
import { MuseClient } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";
import { generateXTics, numOptions, bandLabels, standardDeviation } from "./utils/chartUtils";

export function PageSwitcher() {
  const [rawPipeSettings, setRawPipeSettings] = useState({
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 50,
    srate: 256,
    duration: 1024
  });
  const [spectraPipeSettings, setSpectraPipeSettings] = useState({
    cutOffLow: 2,
    cutOffHigh: 20,
    nbChannels: 4,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 30,
    srate: 256,
    duration: 1024
  });
  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData);
  const [bandsData, setBandsData] = useState(emptyChannelData);

  const [status, setStatus] = useState(generalTranslations.connect);
  const [selected, setSelected] = useState(translations.types.raw);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    // Unsubscribe from all possible subscriptions
    if (window.subscriptionRaw$) window.subscriptionRaw$.unsubscribe();
    if (window.subscriptionSpectra$) window.subscriptionSpectra$.unsubscribe();
    if (window.subscriptionBands$) window.subscriptionBands$.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartTypes = [
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra },
    { label: translations.types.bands, value: translations.types.bands }
  ];

  function subscriptionSetup(value) {
    switch (value) {
      case translations.types.raw:
        setupRaw(setRawData, rawPipeSettings);
        break;
      case translations.types.spectra:
        setupSpectra(setSpectraData);
        break;
      case translations.types.bands:
        setupBands(setBandsData);
        break;
      default:
        console.log(
          "Error on handleSubscriptions. Couldn't switch to: " + value
        );
    }
  }

  function renderCharts() {
    switch (selected) {
      case translations.types.raw:
        console.log("Rendering Raw Component");
        return <EEGEduRaw data={rawData} />;
      case translations.types.spectra:
        console.log("Rendering Spectra Component");
        return <EEGEduSpectra data={spectraData} />;
      case translations.types.bands:
        console.log("Rendering Bands Component");
        return <EEGEduBands data={bandsData} />;
      default:
        console.log("Error on renderCharts switch.");
    }
  }

  async function connect() {
    try {
      if (window.debugWithMock) {
        // Debug with Mock EEG Data
        // Initialize the mockMuseEEG data stream with sampleRate
        console.log("Connecting to mock data source...");
        setStatus(generalTranslations.connectingMock);

        window.source$ = {};
        window.source$.connectionStatus = {};
        window.source$.connectionStatus.value = true;
        window.source$.eegReadings = mockMuseEEG(256);
        setStatus(generalTranslations.connectedMock);
      } else {
        // Connect with the Muse EEG Client
        console.log("Connecting to data source observable...");
        setStatus(generalTranslations.connecting);

        window.source$ = new MuseClient();
        await window.source$.connect();
        await window.source$.start();
        setStatus(generalTranslations.connected);
      }

      if (
        window.source$.connectionStatus.value === true &&
        window.source$.eegReadings
      ) {
        console.log("Connected to data source observable");
        console.log("Starting to build the data pipes from the data source...");

        buildPipeRaw(rawPipeSettings);
        buildPipeSpectra(spectraPipeSettings);
        buildPipeBands();

        // Build the data source from the data source
        console.log("Finished building the data pipes from the data source");

        subscriptionSetup(selected);
      }
    } catch (err) {
      setStatus(generalTranslations.connect);
      console.log("Connection error: " + err);
    }
  }

  function refreshPage(){
    window.location.reload();
  }

  function handleRawIntervalRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, interval: value}));
    buildPipeRaw(rawPipeSettings);
    setupRaw(setRawData, rawPipeSettings);
  }

  function handleRawCutoffLowRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, cutOffLow: value}));
    buildPipeRaw(rawPipeSettings);
    setupRaw(setRawData, rawPipeSettings);
  }

  function handleRawCutoffHighRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, cutOffHigh: value}));
    buildPipeRaw(rawPipeSettings);
    setupRaw(setRawData, rawPipeSettings);
  }

  function handleRawDurationRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, duration: value}));
    buildPipeRaw(rawPipeSettings);
    setupRaw(setRawData, rawPipeSettings);
  }

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

  // function handleSpectraBinsRangeSliderChange(value) {
  //   setSpectraPipeSettings(prevState => ({...prevState, bins: value}));
  //   buildPipeSpectra();
  //   setupSpectra(setSpectraData);
  // }

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

  function pipeSettingsDisplay() {
    switch(selected) {
      case translations.types.raw:
        return(
          <Card title={'Raw Settings'} sectioned>
            <RangeSlider disabled={status === generalTranslations.connect} min={128} step={128}  max={4096} label={'Epoch duration (Sampling Points): ' + rawPipeSettings.duration} value={rawPipeSettings.duration} onChange={handleRawDurationRangeSliderChange} />          
            <RangeSlider disabled={status === generalTranslations.connect} min={10} step={5} max={rawPipeSettings.duration} label={'Sampling points between epochs onsets: ' + rawPipeSettings.interval} value={rawPipeSettings.interval} onChange={handleRawIntervalRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={.01} step={.5} max={rawPipeSettings.cutOffHigh - .5} label={'Cutoff Frequency Low: ' + rawPipeSettings.cutOffLow + ' Hz'} value={rawPipeSettings.cutOffLow} onChange={handleRawCutoffLowRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={rawPipeSettings.cutOffLow + .5} step={.5} max={rawPipeSettings.srate/2} label={'Cutoff Frequency High: ' + rawPipeSettings.cutOffHigh + ' Hz'} value={rawPipeSettings.cutOffHigh} onChange={handleRawCutoffHighRangeSliderChange} />
          </Card>
        );
      case translations.types.spectra:
        return(
          <Card title={'Spectra Settings'} sectioned>
            <RangeSlider disabled={status === generalTranslations.connect} min={128} step={128} max={4096} label={'Epoch duration (Sampling Points): ' + spectraPipeSettings.duration} value={spectraPipeSettings.duration} onChange={handleSpectraDurationRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={10} step={5} max={spectraPipeSettings.duration} label={'Sampling points between epochs onsets: ' + spectraPipeSettings.interval} value={spectraPipeSettings.interval} onChange={handleSpectraIntervalRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={.01} step={.5} max={spectraPipeSettings.cutOffHigh - .5} label={'Cutoff Frequency Low: ' + spectraPipeSettings.cutOffLow + ' Hz'} value={spectraPipeSettings.cutOffLow} onChange={handleSpectraCutoffLowRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={spectraPipeSettings.cutOffLow + .5} step={.5} max={spectraPipeSettings.srate/2} label={'Cutoff Frequency High: ' + spectraPipeSettings.cutOffHigh + ' Hz'} value={spectraPipeSettings.cutOffHigh} onChange={handleSpectraCutoffHighRangeSliderChange} />
            
            {/* - comment for now since it causes crash since freq labels are not updated
            <Select
              disabled={status === generalTranslations.connect}
              label={'FTT Bins: ' + spectraPipeSettings.bins}
              options={['128','256','512','1024','2048','4096']}
              onChange={handleSpectraBinsRangeSliderChange}
              value={spectraPipeSettings.bins}
            />
            <br />
          */}
            <RangeSlider disabled={status === generalTranslations.connect} min={1} max={spectraPipeSettings.sliceFFTHigh - 1} label={'Slice FFT Lower limit: ' + spectraPipeSettings.sliceFFTLow + ' Hz'} value={spectraPipeSettings.sliceFFTLow} onChange={handleSpectraSliceFFTLowRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={spectraPipeSettings.sliceFFTLow + 1} label={'Slice FFT Upper limit: ' + spectraPipeSettings.sliceFFTHigh + ' Hz'} value={spectraPipeSettings.sliceFFTHigh} onChange={handleSpectraSliceFFTHighRangeSliderChange} />
          </Card>
        );
      default: console.log('Error rendering settings display');
    }
  }
  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <ButtonGroup>
            <Button
              primary={status === generalTranslations.connect}
              disabled={status !== generalTranslations.connect}
              onClick={() => {
                window.debugWithMock = false;
                connect();
              }}
            >
              {status}
            </Button>
            <Button
              disabled={status !== generalTranslations.connect}
              onClick={() => {
                window.debugWithMock = true;
                connect();
              }}
            >
              {status === generalTranslations.connect ? generalTranslations.connectMock : status}
            </Button>
            <Button
              destructive
              onClick={refreshPage}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            >
              {generalTranslations.disconnect}
            </Button>
          </ButtonGroup>
        </Stack>
      </Card>
      <Card title={translations.title} sectioned>
        <Select
          label={""}
          options={chartTypes}
          onChange={handleSelectChange}
          value={selected}
        />
      </Card>
      {pipeSettingsDisplay()}
      {renderCharts()}
    </React.Fragment>
  );
}
