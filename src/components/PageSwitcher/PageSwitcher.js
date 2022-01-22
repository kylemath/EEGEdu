import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as translations from "./translations/en.json";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";

import * as funAnimate from "./components/EEGEduAnimate/EEGEduAnimate"

const animate = translations.types.animate;

export function PageSwitcher() {

  // data pulled out of multicast$
  const [animateData, setAnimateData] = useState(emptyChannelData);

  // pipe settings
  const [animateSettings, setAnimateSettings] = useState(funAnimate.getSettings);

  // connection status
  const [status, setStatus] = useState(generalTranslations.connect);

  // for picking a new module
  // this is where the STARTING TAB value is set
  const [selected, setSelected] = useState(animate);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    if (window.subscriptionAnimate) window.subscriptionAnimate.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const chartTypes = [
    { label: animate, value: animate }
  ];

  function buildPipes(value) {
    funAnimate.buildPipe(animateSettings);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case animate:
        funAnimate.setup(setAnimateData, animateSettings)
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
        window.source.eegReadings$ = window.source.eegReadings;
        setStatus(generalTranslations.connected);
      }

      if (
        window.source.connectionStatus.value === true &&
        window.source.eegReadings$
      ) {
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
      case animate:
        return (
          <Card title={selected + ' Settings'} sectioned>
            {funAnimate.renderSliders(setAnimateData, setAnimateSettings, status, animateSettings)}
          </Card>
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderCharts() {
    console.log("Rendering " + selected + " Component");
    switch (selected) {
      case animate:
        return <funAnimate.renderModule 
          data={animateData}
          />;
      default:
        console.log("Error on renderCharts switch.");
    }
  }

  function renderRecord() {
    switch (selected) {
      case animate:
        return null
      default:   
        console.log("Error on renderRecord.");
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
      {renderRecord()}
    </React.Fragment>
  );
}
