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

import EEGEduRaw from "./components/EEGEduRaw/EEGEduRaw";
import EEGEduSpectra from "./components/EEGEduSpectra/EEGEduSpectra";
import EEGEduBands from "./components/EEGEduBands/EEGEduBands";

import * as translations from "./translations/en.json";
import { MuseClient, zipSamples } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";
import { generateXTics, numOptions, bandLabels } from "./utils/chartUtils";

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
        setupRaw();
        break;
      case translations.types.spectra:
        setupSpectra();
        break;
      case translations.types.bands:
        setupBands();
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

  function setupRaw() {
    console.log("Subscribing to Raw");

    if (window.multicastRaw$) {
      window.subscriptionRaw$ = window.multicastRaw$.subscribe(data => {
        setRawData(rawData => {
          Object.values(rawData).forEach((channel, index) => {
            if (index < 4) {
              channel.datasets[0].data = data.data[index];
              channel.xLabels = generateXTics(rawPipeSettings.srate, rawPipeSettings.duration);
            }
          });

          return {
            ch0: rawData.ch0,
            ch1: rawData.ch1,
            ch2: rawData.ch2,
            ch3: rawData.ch3
          };
        });
      });

      window.multicastRaw$.connect();
      console.log("Subscribed to Raw");
    }
  }

  function setupSpectra() {
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

  function setupBands() {
    console.log("Subscribing to Bands");

    if (window.multicastBands$) {
      window.subscriptionBands$ = window.multicastBands$.subscribe(data => {
        setBandsData(bandsData => {
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
      console.log("Subscribed to Bands");
    }
  }

  function pipeRawData() {
    if (window.subscriptionRaw$) window.subscriptionRaw$.unsubscribe();

    window.pipeRaw$ = null;
    window.multicastRaw$ = null;
    window.subscriptionRaw$ = null;

    // Build Pipe Raw
    window.pipeRaw$ = zipSamples(window.source$.eegReadings).pipe(
      bandpassFilter({ cutoffFrequencies: [rawPipeSettings.cutOffLow, rawPipeSettings.cutOffHigh], nbChannels: rawPipeSettings.nbChannels }),
      epoch({
        duration: rawPipeSettings.duration,
        interval: rawPipeSettings.interval,
        samplingRate: rawPipeSettings.srate
      }),
      catchError(err => {
        console.log(err);
      })
    );
    window.multicastRaw$ = window.pipeRaw$.pipe(
      multicast(() => new Subject())
    );
  }

  function pipeSpectraData() {
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

  function pipeBandsData() {
    if (window.subscriptionBands$) window.subscriptionBands$.unsubscribe();

    window.pipeBands$ = null;
    window.multicastBands$ = null;
    window.subscriptionBands$ = null;

    window.pipeBands$ = zipSamples(window.source$.eegReadings).pipe(
      bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
      epoch({
        duration: numOptions.duration,
        interval: 100,
        samplingRate: numOptions.srate
      }),
      fft({ bins: 256 }),
      powerByBand(),
      catchError(err => {
        console.log(err);
      })
    );
    window.multicastBands$ = window.pipeBands$.pipe(
      multicast(() => new Subject())
    );
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

        // Build Pipe Raw
        pipeRawData();

        // Build Pipe Spectra
        pipeSpectraData();

        // Build Pipe Bands
        pipeBandsData();

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
    pipeRawData();
    setupRaw();
  }

  function handleRawNbChannelsRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, nbChannels: value}));
    pipeRawData();
    setupRaw();
  }

  function handleRawCutoffLowRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, cutOffLow: value}));
    pipeRawData();
    setupRaw();
  }

  function handleRawCutoffHighRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, cutOffHigh: value}));
    pipeRawData();
    setupRaw();
  }

  function handleRawSrateRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, srate: value}));
    pipeRawData();
    setupRaw();
  }

  function handleRawDurationRangeSliderChange(value) {
    setRawPipeSettings(prevState => ({...prevState, duration: value}));
    pipeRawData();
    setupRaw();
  }

  function handleSpectraIntervalRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, interval: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraNbChannelsRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, nbChannels: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraCutoffLowRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, cutOffLow: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraCutoffHighRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, cutOffHigh: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraBinsRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, bins: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraSliceFFTLowRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, sliceFFTLow: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraSliceFFTHighRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, sliceFFTHigh: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraSrateRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, srate: value}));
    pipeSpectraData();
    setupSpectra();
  }

  function handleSpectraDurationRangeSliderChange(value) {
    setSpectraPipeSettings(prevState => ({...prevState, duration: value}));
    pipeSpectraData();
    setupSpectra();
  }


  function pipeSettingsDisplay() {
    switch(selected) {
      case translations.types.raw:
        return(
          <Card title={'Raw Settings'} sectioned>
            <RangeSlider disabled={status === generalTranslations.connect} min={512} max={4096} label={'Epoch duration: ' + rawPipeSettings.duration} value={rawPipeSettings.duration} onChange={handleRawDurationRangeSliderChange} />          
            <RangeSlider disabled={status === generalTranslations.connect} min={12} label={'Interval betweem epochs: ' + rawPipeSettings.interval} value={rawPipeSettings.interval} onChange={handleRawIntervalRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={1} max={rawPipeSettings.cutOffHigh - 1} label={'Cutoff Frequency Low: ' + rawPipeSettings.cutOffLow} value={rawPipeSettings.cutOffLow} onChange={handleRawCutoffLowRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={rawPipeSettings.cutOffLow + 1} label={'Cutoff Frequency High: ' + rawPipeSettings.cutOffHigh} value={rawPipeSettings.cutOffHigh} onChange={handleRawCutoffHighRangeSliderChange} />
          </Card>
        );
      case translations.types.spectra:
        return(
          <Card title={'Spectra Settings'} sectioned>
            <RangeSlider disabled={status === generalTranslations.connect} min={1} max={200} label={'Interval: ' + spectraPipeSettings.interval} value={spectraPipeSettings.interval} onChange={handleSpectraIntervalRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={1} label={'nbChannels: ' + spectraPipeSettings.nbChannels} value={spectraPipeSettings.nbChannels} onChange={handleSpectraNbChannelsRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={1} max={spectraPipeSettings.cutOffHigh - 1} label={'Cutoff Frequency Low: ' + spectraPipeSettings.cutOffLow} value={spectraPipeSettings.cutOffLow} onChange={handleSpectraCutoffLowRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={spectraPipeSettings.cutOffLow + 1} label={'Cutoff Frequency High: ' + spectraPipeSettings.cutOffHigh} value={spectraPipeSettings.cutOffHigh} onChange={handleSpectraCutoffHighRangeSliderChange} />
            <Select
              disabled={status === generalTranslations.connect}
              label={'FTT Bins: ' + spectraPipeSettings.bins}
              options={['256', '128', '64', '32', '16', '8', '4', '2', '1']}
              onChange={handleSpectraBinsRangeSliderChange}
              value={spectraPipeSettings.bins}
            />
            <br />
            <RangeSlider disabled={status === generalTranslations.connect} min={1} max={spectraPipeSettings.sliceFFTHigh - 1} label={'Slice FFT Low: ' + spectraPipeSettings.sliceFFTLow} value={spectraPipeSettings.sliceFFTLow} onChange={handleSpectraSliceFFTLowRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={spectraPipeSettings.sliceFFTLow + 1} label={'Slice FFT High: ' + spectraPipeSettings.sliceFFTHigh} value={spectraPipeSettings.sliceFFTHigh} onChange={handleSpectraSliceFFTHighRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={150} max={600} label={'srate: ' + spectraPipeSettings.srate} value={spectraPipeSettings.srate} onChange={handleSpectraSrateRangeSliderChange} />
            <RangeSlider disabled={status === generalTranslations.connect} min={500} max={2500} label={'Duration: ' + spectraPipeSettings.duration} value={spectraPipeSettings.duration} onChange={handleSpectraDurationRangeSliderChange} />
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
