import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as translations from "./translations/en.json";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";

import * as funIntro from "./components/EEGEduIntro/EEGEduIntro"
import * as funRaw from "./components/EEGEduRaw/EEGEduRaw";
import * as funSpectra from "./components/EEGEduSpectra/EEGEduSpectra";
import * as funBands from "./components/EEGEduBands/EEGEduBands";
import * as funAnimate from "./components/EEGEduAnimate/EEGEduAnimate"

const intro = translations.types.intro;
const raw = translations.types.raw;
const spectra = translations.types.spectra;
const bands = translations.types.bands;
const animate = translations.types.animate;

export function PageSwitcher() {

  // data pulled out of multicast$
  const [introData, setIntroData] = useState(emptyChannelData)
  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData); 
  const [bandsData, setBandsData] = useState(emptyChannelData);
  const [animateData, setAnimateData] = useState(emptyChannelData);

  // pipe settings
  const [introSettings] = useState(funIntro.getSettings);
  const [rawSettings, setRawSettings] = useState(funRaw.getSettings); 
  const [spectraSettings, setSpectraSettings] = useState(funSpectra.getSettings); 
  const [bandsSettings, setBandsSettings] = useState(funBands.getSettings);
  const [animateSettings, setAnimateSettings] = useState(funAnimate.getSettings);

  // connection status
  const [status, setStatus] = useState(generalTranslations.connect);

  // for picking a new module
  const [selected, setSelected] = useState(intro);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    if (window.subscriptionIntro) window.subscriptionIntro.unsubscribe();
    if (window.subscriptionRaw) window.subscriptionRaw.unsubscribe();
    if (window.subscriptionSpectra) window.subscriptionSpectra.unsubscribe();
    if (window.subscriptionBands) window.subscriptionBands.unsubscribe();
    if (window.subscriptionAnimate) window.subscriptionAnimate.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // for popup flag when recording
  const [recordPop, setRecordPop] = useState(false);
  const recordPopChange = useCallback(() => setRecordPop(!recordPop), [recordPop]);

  const chartTypes = [
    { label: intro, value: intro },
    { label: raw, value: raw },
    { label: spectra, value: spectra }, 
    { label: bands, value: bands },
    { label: animate, value: animate }
  ];

  function buildPipes(value) {
    funIntro.buildPipe(introSettings);
    funRaw.buildPipe(rawSettings);
    funSpectra.buildPipe(spectraSettings);
    funBands.buildPipe(bandsSettings);
    funAnimate.buildPipe(animateSettings);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case intro:
        funIntro.setup(setIntroData, introSettings);
        break;
      case raw:
        funRaw.setup(setRawData, rawSettings);
        break;
      case spectra:
        funSpectra.setup(setSpectraData, spectraSettings);
        break;
      case bands:
        funBands.setup(setBandsData, bandsSettings)
        break;
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
      case intro:
        return null
      case raw:
        return (
          funRaw.renderSliders(setRawData, setRawSettings, status, rawSettings)
        );
      case spectra:
        return (
          funSpectra.renderSliders(setSpectraData, setSpectraSettings, status, spectraSettings)
        );
      case bands: 
        return (
          funBands.renderSliders(setBandsData, setBandsSettings, status, bandsSettings)
        );
      case animate:
        return (
          funAnimate.renderSliders(setAnimateData, setAnimateSettings, status, animateSettings)
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderCharts() {
    console.log("Rendering " + selected + " Component");
    switch (selected) {
      case intro:
        return <funIntro.renderModule data={introData} />;
      case raw:
        return <funRaw.renderModule data={rawData} />;
      case spectra:
        return <funSpectra.renderModule data={spectraData} />;
      case bands:
        return <funBands.renderModule data={bandsData} />;
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
      case intro: 
        return null
      case raw: 
        return(
          funRaw.renderRecord(recordPopChange, recordPop, status, rawSettings)
        )    
      case spectra:
        return (
          funSpectra.renderRecord(recordPopChange, recordPop, status, spectraSettings)
        )      
      case bands:
        return (
          funBands.renderRecord(recordPopChange, recordPop, status, bandsSettings)
        ) 
      case animate:
        return null
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
