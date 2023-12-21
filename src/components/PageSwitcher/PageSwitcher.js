import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import {
  Select,
  Card,
  Stack,
  Button,
  ButtonGroup,
  Checkbox,
} from "@shopify/polaris";
import { mockMuseEEG } from "./utils/mockMuseEEG";
import * as connectionText from "./utils/connectionText";
import { emptyAuxChannelData } from "./utils/chartOptions";

import * as funRaw from "./components/EEGEduRaw/EEGEduRaw";
import * as funSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

let modules = {
  raw: "1. Raw and Filtered Data",
  spectra: "2. Frequency Spectra",
};
const raw = modules.raw;
const spectra = modules.spectra;

const chartTypes = [
  { label: raw, value: raw },
  { label: spectra, value: spectra },
];

let showAux = true; // if it is even available to press (to prevent in some modules)
let source = {};
window.multicasts = {};
window.subscriptions = {};

//-----Setup Constants
window.multicasts["Raw"] = null;
window.multicasts["Spectra"] = null;

window.subscriptions["Raw"] = null;
window.subscriptions["Spectra"] = null;

export function PageSwitcher() {
  // connection status
  const [status, setStatus] = useState(connectionText.connect);

  // data pulled out of multicast$
  const [rawData, setRawData] = useState(emptyAuxChannelData);
  const [spectraData, setSpectraData] = useState(emptyAuxChannelData);

  // for picking a new module
  const [selected, setSelected] = useState(raw);

  // pipe settings
  const [rawSettings, setRawSettings] = useState(funRaw.getSettings);
  const [spectraSettings, setSpectraSettings] = useState(
    funSpectra.getSettings
  );

  // Whenever settings changed
  const handleSelectChange = useCallback((value) => {
    setSelected(value);

    console.log("Switching to: " + value);

    if (window.subscriptionRaw) window.subscriptionRaw.unsubscribe();
    if (window.subscriptionSpectra) window.subscriptionSpectra.unsubscribe();

    buildPipes(value);
    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // for popup flag when recording
  const [recordPop, setRecordPop] = useState(false);
  const recordPopChange = useCallback(() => setRecordPop(!recordPop), [
    recordPop,
  ]);

  // For auxEnable settings
  const [checked, setChecked] = useState(false);
  const handleChange = useCallback((newChecked) => setChecked(newChecked), []);

  // const [pipeRaw] = useState();
  // const [multicastRaw] = useState('0');
  // const [subscriptionRaw] = useState();

  // const [pipeSpectra] = useState();
  // const [multicastSpectra] = useState();
  // const [subscriptionSpectra] = useState();

  // ---- Manage Auxillary channel

  window.enableAux = checked;
  if (window.enableAux) {
    window.nchans = 5;
  } else {
    window.nchans = 4;
  }

  switch (selected) {
    case raw:
      showAux = true;

      break;
    case spectra:
      showAux = true;
      break;
    default:
      console.log("Error on showAux");
  }

  //---- Main functions to build and setup called once connect pressed

  function buildPipes(value) {
    funRaw.buildPipe(source, rawSettings);
    funSpectra.buildPipe(source, spectraSettings);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case raw:
        funRaw.setup(setRawData, rawSettings, rawData);
        break;
      case spectra:
        funSpectra.setup(setSpectraData, spectraSettings, spectraData);
        break;
      default:
        console.log(
          "Error on handle Subscriptions. Couldn't switch to: " + value
        );
    }
  }

  // --- Once connect button pressed

  async function connect() {
    try {
      if (window.debugWithMock) {
        // Debug with Mock EEG Data
        setStatus(connectionText.connectingMock);
        source = {};
        source.connectionStatus = {};
        source.connectionStatus.value = true;
        source.eegReadings$ = mockMuseEEG(256);
        setStatus(connectionText.connectedMock);
      } else {
        // Connect with the Muse EEG Client
        setStatus(connectionText.connecting);
        source = new MuseClient();
        source.enableAux = window.enableAux;
        await source.connect();
        await source.start();
        source.eegReadings$ = source.eegReadings;
        setStatus(connectionText.connected);

        // Add event listener for 'disconnect' event
        if (source) {
          console.log("source", source);
          source.addEventListener("gattserverdisconnected", () => {
            console.log("Device disconnected");
            // Here you can add your reconnect logic
          });
        } else {
          console.log("source is undefined");
        }
      }
      if (source.connectionStatus.value === true && source.eegReadings$) {
        //Build and Setup
        buildPipes(selected);
        subscriptionSetup(selected);
      }
    } catch (err) {
      setStatus(connectionText.connect);
      console.log("Connection error: " + err);
    }
  }

  // For disconnect button
  function refreshPage() {
    window.location.reload();
  }

  // Display settings sliders
  function pipeSettingsDisplay() {
    switch (selected) {
      case raw:
        return funRaw.renderSliders(
          setRawData,
          setRawSettings,
          status,
          rawSettings,
          source
        );
      case spectra:
        return funSpectra.renderSliders(
          setSpectraData,
          setSpectraSettings,
          status,
          spectraSettings,
          source
        );
      default:
        console.log("Error rendering settings display");
    }
  }

  // Show the chart
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

  // Show the record button
  function renderRecord() {
    switch (selected) {
      case raw:
        return funRaw.renderRecord(
          recordPopChange,
          recordPop,
          status,
          rawSettings,
          setRawSettings
        );
      case spectra:
        return funSpectra.renderRecord(
          recordPopChange,
          recordPop,
          status,
          spectraSettings,
          setSpectraSettings
        );
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
              {status === connectionText.connect
                ? connectionText.connectMock
                : status}
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
      <Card title={"Choose your Module"} sectioned>
        <Select
          label={""}
          options={chartTypes}
          onChange={handleSelectChange}
          value={selected}
        />
      </Card>
      {renderModules()}
      {pipeSettingsDisplay()}
      {renderRecord()}
    </React.Fragment>
  );
}
