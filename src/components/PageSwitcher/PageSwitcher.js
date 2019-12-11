import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button } from "@shopify/polaris";
import { bandpassFilter, epoch, fft, sliceFFT } from "@neurosity/pipes";
import { Subject } from "rxjs";
import { catchError, multicast } from "rxjs/operators";

import EEGEduRaw from "./components/EEGEduRaw/EEGEduRaw";
import EEGEduSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

import * as translations from "./translations/en.json";
import { MuseClient, zipSamples } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";
import { generateXTics, numOptions } from "./utils/chartUtils";

export function PageSwitcher() {
  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData);
  const [status, setStatus] = useState(generalTranslations.connect);
  const [selected, setSelected] = useState(translations.types.raw);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    // Unsubscribe from all possible subscriptions
    if (window.subscriptionRaw$) window.subscriptionRaw$.unsubscribe();
    if (window.subscriptionSpectra$) window.subscriptionSpectra$.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartTypes = [
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra }
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
      default:
        console.log("Error on renderCharts switch.");
    }
  }

  function setupRaw() {
    console.log("Subscribing to Raw");
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

  function setupSpectra() {
    console.log("Subscribing to Spectra");
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

  async function connect() {
    console.log("Connecting to data source observable...");
    setStatus(generalTranslations.connecting);

    try {
      // 1) create real eeg data source
      window.source$ = new MuseClient();

      // 2) For debugging
      // window.source$ = interval(1000);

      await window.source$.connect();
      await window.source$.start();
      setStatus(generalTranslations.connected);

      if (
        window.source$.connectionStatus.value === true &&
        window.source$.eegReadings
      ) {
        console.log("Connected to data source observable");
        setStatus(generalTranslations.connected);

        console.log("Starting to build the data pipes from the data source...");

        //Build Pipe Raw
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

        //Build Pipe Spectra
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

        // Build the data source from the data source
        console.log("Finished building the data pipes from the data source");

        subscriptionSetup(selected);
      }
    } catch (err) {
      setStatus(generalTranslations.connect);
      console.log("Connection error: " + err);
    }
  }

  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <Button
            primary={status === generalTranslations.connect}
            disabled={status !== generalTranslations.connect}
            onClick={connect}
          >
            {status}
          </Button>
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
