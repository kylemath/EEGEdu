import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup, } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as translations from "./translations/en.json";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData, emptyObs } from "./components/chartOptions";

import * as funIntro from "./components/EEGEduIntro/EEGEduIntro"
import * as funRaw from "./components/EEGEduRaw/EEGEduRaw";

const intro = translations.types.intro;
const raw = translations.types.raw;


export function PageSwitcher() {

  // Object to store all the observables
  const obs = {
    intro: {
      emptyObs
    },
     raw: { 
      emptyObs
    }
  };

  const [introData, setIntroData] = useState(emptyChannelData)
  const [rawData, setRawData] = useState(emptyChannelData);
 
  const [introSettings] = useState(funIntro.getSettings);
  const [rawSettings, setRawSettings] = useState(funRaw.getSettings); 
  
  const [status, setStatus] = useState(generalTranslations.connect);

  // module at load:
  const [selected, setSelected] = useState(intro);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    // Unsubscribe from all possible subscriptions
    if (obs.intro.subscription) obs.intro.subscription.unsubscribe();
    if (obs.raw.subscription) obs.raw.subscription.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartTypes = [
    { label: intro, value: intro },
    { label: raw, value: raw },
  ];

  function buildPipes(value) {
    funIntro.buildPipe(introSettings, obs.intro);
    funRaw.buildPipe(rawSettings, obs.raw);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case intro:
        funIntro.setup(setIntroData, introSettings, obs.intro, introData);
        break;
      case raw:
        funRaw.setup(setRawData, rawSettings, obs.raw, rawData);
        break;
      default:
        console.log(
          "Error on handle Subscriptions. Couldn't switch to: " + value
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

        window.source = {};
        window.source.connectionStatus = {};
        window.source.connectionStatus.value = true;
        window.source.eegReadings$ = mockMuseEEG(256);
        setStatus(generalTranslations.connectedMock);
      } else {
        // Connect with the Muse EEG Client
        console.log("Connecting to data source observable...");
        setStatus(generalTranslations.connecting);

        window.source = new MuseClient();
        await window.source.connect();
        await window.source.start();
        setStatus(generalTranslations.connected);
      }

      if (
        window.source.connectionStatus.value === true &&
        window.source.eegReadings$
      ) {
        console.log("Connected to data source observable");

        // Build the data source
        console.log("Starting to build the data pipes from the data source...");
        buildPipes(selected);
        console.log("Finished building the data pipes from the data source");
        subscriptionSetup(selected);
        console.log("Finished subscribing to the data source");

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
      case intro:
        return null
      case raw:
        return(
          <Card title={'Raw Settings'} sectioned>
            {funRaw.renderSliders(setRawData, setRawSettings, status, rawSettings, obs.selected)}
          </Card>
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderCharts() {
    switch (selected) {
      case intro:
        console.log("Rendering Intro Component");
        return <funIntro.EEGEdu data={introData} />;
      case raw:
        console.log("Rendering Raw Component");
        return <funRaw.EEGEdu data={rawData} />;
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
