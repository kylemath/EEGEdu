import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as Raw from "./components/EEGEduRaw/EEGEduRaw";
import * as Spectra from "./components/EEGEduSpectra/EEGEduSpectra";
import { EEGEduBands, setupBands, buildPipeBands } from "./components/EEGEduBands/EEGEduBands";

import * as translations from "./translations/en.json";
import { MuseClient } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";

export function PageSwitcher() {

  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData);
  const [bandsData, setBandsData] = useState(emptyChannelData);

  const [spectraPipeSettings, setSpectraPipeSettings] = useState(Spectra.getSpectraSettings);
  const [rawPipeSettings, setRawPipeSettings] = useState(Raw.getRawSettings);

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
        Raw.setupRaw(setRawData, rawPipeSettings);
        break;
      case translations.types.spectra:
        Spectra.setupSpectra(setSpectraData);
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

        Raw.buildPipeRaw(rawPipeSettings);
        Spectra.buildPipeSpectra(spectraPipeSettings);
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

  function pipeSettingsDisplay() {
    switch(selected) {
      case translations.types.raw:
        return(
          <Card title={'Raw Settings'} sectioned>
            {Raw.renderSlidersRaw(setRawData, status, setRawPipeSettings, rawPipeSettings)}
          </Card>
        );
      case translations.types.spectra:
        return(
          <Card title={'Spectra Settings'} sectioned>
            {Spectra.renderSlidersSpectra(setSpectraData, status, setSpectraPipeSettings, spectraPipeSettings)}
          </Card>
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderCharts() {
    switch (selected) {
      case translations.types.raw:
        console.log("Rendering Raw Component");
        return <Raw.EEGEduRaw data={rawData} />;
      case translations.types.spectra:
        console.log("Rendering Spectra Component");
        return <Spectra.EEGEduSpectra data={spectraData} />;
      case translations.types.bands:
        console.log("Rendering Bands Component");
        return <EEGEduBands data={bandsData} />;
      default:
        console.log("Error on renderCharts switch.");
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
