import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup, Checkbox } from "@shopify/polaris";
import { mockMuseEEG } from "./utils/mockMuseEEG";
import * as connectionText from "./utils/connectionText";
import { emptyAuxChannelData } from "./utils/chartOptions";
import * as funRaw from "./components/EEGEduRaw/EEGEduRaw";
import * as funSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

let modules = {
  "raw": "1. Raw and Filtered Data",
  "spectra": "2. Frequency Spectra"
};

const raw = modules.raw;
console.log(raw)
const spectra = modules.spectra;

export function PageSwitcher() {

  // For auxEnable settings
  const [checked, setChecked] = useState(false);
  const handleChange = useCallback((newChecked) => setChecked(newChecked), []);
  window.enableAux = checked;
  if (window.enableAux) {
    window.nchans = 5;
  } else {
    window.nchans = 4;
  }
  let showAux = true; // if it is even available to press (to prevent in some modules)

  // data pulled out of multicast$
  const [rawData, setRawData] = useState(emptyAuxChannelData);
  const [spectraData, setSpectraData] = useState(emptyAuxChannelData); 

  // pipe settings
  const [rawSettings, setRawSettings] = useState(funRaw.getSettings); 
  const [spectraSettings, setSpectraSettings] = useState(funSpectra.getSettings); 

  // connection status
  const [status, setStatus] = useState(connectionText.connect);

  // for picking a new module
  const [selected, setSelected] = useState(raw);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    if (window.subscriptionRaw) window.subscriptionRaw.unsubscribe();
    if (window.subscriptionSpectra) window.subscriptionSpectra.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // for popup flag when recording
  const [recordPop, setRecordPop] = useState(false);
  const recordPopChange = useCallback(() => setRecordPop(!recordPop), [recordPop]);

  switch (selected) {
    case raw:
      showAux = true;
      break
    case spectra:
      showAux = true;
      break
    default:
      console.log("Error on showAux");
  }


  const chartTypes = [
    { label: raw, value: raw },
    { label: spectra, value: spectra }
  ];

  function buildPipes(value) {
    funRaw.buildPipe(rawSettings);
    funSpectra.buildPipe(spectraSettings);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case raw:
        funRaw.setup(setRawData, rawSettings);
        break;
      case spectra:
        funSpectra.setup(setSpectraData, spectraSettings);
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
        setStatus(connectionText.connectingMock);
        window.source = {};
        window.source.connectionStatus = {};
        window.source.connectionStatus.value = true;
        window.source.eegReadings$ = mockMuseEEG(256);
        setStatus(connectionText.connectedMock);
      } else {
        // Connect with the Muse EEG Client
        setStatus(connectionText.connecting);
        window.source = new MuseClient();
        window.source.enableAux = window.enableAux;
        await window.source.connect();
        await window.source.start();
        window.source.eegReadings$ = window.source.eegReadings;
        setStatus(connectionText.connected);
      }
      if (
        window.source.connectionStatus.value === true &&
        window.source.eegReadings$
      ) {
        buildPipes(selected);
        subscriptionSetup(selected);
      }
    } catch (err) {
      setStatus(connectionText.connect);
      console.log("Connection error: " + err);
    }
  }

  function refreshPage(){
    window.location.reload();
  }

  function pipeSettingsDisplay() {
    switch(selected) {
      case raw:
        return (
          funRaw.renderSliders(setRawData, setRawSettings, status, rawSettings)
        );
      case spectra:
        return (
          funSpectra.renderSliders(setSpectraData, setSpectraSettings, status, spectraSettings)
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderModules() {
    switch (selected) {
      case raw:
        return <funRaw.renderModule data={rawData} />;
      case spectra:
        return <funSpectra.renderModule data={spectraData} />;
      default:
        console.log("Error on renderCharts switch.");
    }
  }
 
  function renderRecord() {
    switch (selected) {
      case raw: 
        return (
          funRaw.renderRecord(recordPopChange, recordPop, status, rawSettings, setRawSettings)
        )    
      case spectra:
        return (
          funSpectra.renderRecord(recordPopChange, recordPop, status, spectraSettings, setSpectraSettings)
        )      
      default:   
        console.log("Error on renderRecord.");
    }
  }

  // Render the entire page using above functions
  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <ButtonGroup>
            <Button
              primary={status === connectionText.connect}
              disabled={status !== connectionText.connect}
              onClick={() => {
                window.debugWithMock = false;
                connect();
              }}
            >
              {status}
            </Button>
            <Button
              disabled={status !== connectionText.connect}
              onClick={() => {
                window.debugWithMock = true;
                connect();
              }}
            >
              {status === connectionText.connect ? connectionText.connectMock : status}
            </Button>
            <Button
              destructive
              onClick={refreshPage}
              primary={status !== connectionText.connect}
              disabled={status === connectionText.connect}
            >
              {connectionText.disconnect}
            </Button>     
          </ButtonGroup>
          <Checkbox
            label="Enable Muse Auxillary Channel"
            checked={checked}
            onChange={handleChange}
            disabled={!showAux || status !== connectionText.connect}
          />
        </Stack>
      </Card>
      <Card title={'Choose your Module'} sectioned>
        <Select
          label={""}
          options={chartTypes}
          onChange={handleSelectChange}
          value={selected}
        />
      </Card>
      {pipeSettingsDisplay()}
      {renderModules()}
      {renderRecord()}
    </React.Fragment>
  );
}
