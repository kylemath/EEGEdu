import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button, ButtonGroup } from "@shopify/polaris";
import {
  bandpassFilter,
  epoch,
  fft,
  sliceFFT,
  powerByBand
} from "@neurosity/pipes";
import { Subject } from "rxjs";
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
  const xTics = generateXTics();

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
              channel.xLabels = xTics;
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
        window.pipeRaw$ = zipSamples(window.source$.eegReadings).pipe(
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({
            duration: numOptions.duration,
            interval: 50,
            samplingRate: numOptions.srate
          }),
          catchError(err => {
            console.log(err);
          })
        );
        window.multicastRaw$ = window.pipeRaw$.pipe(
          multicast(() => new Subject())
        );

        // Build Pipe Spectra
        window.pipeSpectra$ = zipSamples(window.source$.eegReadings).pipe(
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({
            duration: numOptions.duration,
            interval: 100,
            samplingRate: numOptions.srate
          }),
          fft({ bins: 256 }),
          sliceFFT([1, 30]),
          catchError(err => {
            console.log(err);
          })
        );
        window.multicastSpectra$ = window.pipeSpectra$.pipe(
          multicast(() => new Subject())
        );

        // Build Pipe Bands
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

        // Build the data source from the data source
        console.log("Finished building the data pipes from the data source");

        subscriptionSetup(selected);
      }
    } catch (err) {
      setStatus(generalTranslations.connect);
      console.log("Connection error: " + err);
    }
  }

  // function disconnect() { 
  //   console.log('Disconnecting from data source...'); 

  //   window.source$ = {};  
  //   // Unsubscribe from all possible subscriptions  
  //   if (window.subscriptionRaw$) window.subscriptionRaw$.unsubscribe(); 
  //   if (window.subscriptionSpectra$) window.subscriptionSpectra$.unsubscribe(); 
  //   if (window.subscriptionBands$) window.subscriptionBands$.unsubscribe(); 

  //   setStatus(generalTranslations.connect); 
  //   console.log('Disconnected from data source.');  
  // } 

  function refreshPage(){
    window.location.reload();
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

      {renderCharts()}
    </React.Fragment>
  );
}
