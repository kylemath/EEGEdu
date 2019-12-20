import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as Intro from "./components/EEGEduIntro/EEGEduIntro"
import * as Raw from "./components/EEGEduRaw/EEGEduRaw";
import * as Spectra from "./components/EEGEduSpectra/EEGEduSpectra";
import * as Bands from "./components/EEGEduBands/EEGEduBands";

import * as translations from "./translations/en.json";
import { MuseClient } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";
import { saveAs } from 'file-saver';
import { take } from "rxjs/operators";

export function PageSwitcher() {

  const [introData, setIntroData] = useState(emptyChannelData)
  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData);
  const [bandsData, setBandsData] = useState(emptyChannelData);

  const [introSettings] = useState(Intro.getSettings);
  const [spectraSettings, setSpectraSettings] = useState(Spectra.getSettings);
  const [rawSettings, setRawSettings] = useState(Raw.getSettings); 
  const [bandsSettings, setBandsSettings] = useState(Bands.getSettings);

  const [status, setStatus] = useState(generalTranslations.connect);
  // module at load:
  const [selected, setSelected] = useState(translations.types.bands);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    // Unsubscribe from all possible subscriptions
    if (window.subscriptionIntro$) window.subscriptionIntro$.unsubscribe();
    if (window.subscriptionRaw$) window.subscriptionRaw$.unsubscribe();
    if (window.subscriptionSpectra$) window.subscriptionSpectra$.unsubscribe();
    if (window.subscriptionBands$) window.subscriptionBands$.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartTypes = [
    { label: translations.types.intro, value: translations.types.intro },
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra },
    { label: translations.types.bands, value: translations.types.bands }
  ];

  function subscriptionSetup(value) {
    switch (value) {
      case translations.types.intro:
        Intro.setup(setIntroData, introSettings);
        break;
      case translations.types.raw:
        Raw.setup(setRawData, rawSettings);
        break;
      case translations.types.spectra:
        Spectra.setup(setSpectraData);
        break;
      case translations.types.bands:
        Bands.setup(setBandsData);
        break;
      default:
        console.log(
          "Error on handleSubscriptions. Couldn't switch to: " + value
        );
    }
  }

  function saveToCSV(value) {
    const numSamplesToSave = 1;
    console.log('Saving ' + numSamplesToSave + ' samples...');
    var localObservable$ = null;
    const dataToSave = [];



    switch (value) {
      case translations.types.intro:
        localObservable$ = window.pipeIntro$.pipe(
          take(numSamplesToSave)
        );
        break;
      case translations.types.raw:
        localObservable$ = window.pipeRaw$.pipe(
          take(numSamplesToSave)
        );
        break;
      case translations.types.spectra:
        localObservable$ = window.pipeSpectra$.pipe(
          take(numSamplesToSave)
        );
        break;
      case translations.types.bands:
        console.log('making headers')
        dataToSave.push(
          "delta0,delta1,delta2,delta3,deltaAux,", 
          "theta0,theta1,theta2,theta3,thetaAux,",  
          "alpha0,alpha1,alpha2,alpha3,alphaAux,",  
          "beta0,beta1,beta2,beta3,betaAux,", 
          "delta0,delta1,delta2,delta3,deltaAux\n"
        );
        localObservable$ = window.pipeBands$.pipe(
          take(numSamplesToSave)
        );
        console.log(localObservable$)
        break;
      default:
        console.log(
          "Error on saveto CSV: " + value
        );
    }
    
    localObservable$.subscribe({
      next(x) { 
        console.log('here?')
        // something in here doesn't run on real data
        dataToSave.push(Object.values(x).join(",") + "\n");
        // logging is useful for debugging
        console.log(x);
      },
      error(err) { console.log(err); },
      complete() { 
        console.log('Trying to save')
        var blob = new Blob(
          dataToSave, 
          {type: "text/plain;charset=utf-8"}
        );
        saveAs(blob, "Bands_Recording.csv");
        console.log('Completed');
      }
    });
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

        Intro.buildPipe(introSettings);
        Raw.buildPipe(rawSettings);
        Spectra.buildPipe(spectraSettings);
        Bands.buildPipe(bandsSettings);

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
      case translations.types.intro:
        return null
      case translations.types.raw:
        return(
          <Card title={'Raw Settings'} sectioned>
            {Raw.renderSliders(setRawData, setRawSettings, status, rawSettings)}
          </Card>
        );
      case translations.types.spectra:
        return(
          <Card title={'Spectra Settings'} sectioned>
            {Spectra.renderSliders(setSpectraData, setSpectraSettings, status, spectraSettings)}
          </Card>
        );
      case translations.types.bands:
        return(
          <Card title={'Bands Settings'} sectioned>
            {Bands.renderSliders(setBandsData, setBandsSettings, status, bandsSettings)}
          </Card>
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderCharts() {
    switch (selected) {
      case translations.types.intro:
        console.log("Rendering Intro Component");
        return <Intro.EEGEdu data={introData} />;
      case translations.types.raw:
        console.log("Rendering Raw Component");
        return <Raw.EEGEdu data={rawData} />;
      case translations.types.spectra:
        console.log("Rendering Spectra Component");
        return <Spectra.EEGEdu data={spectraData} />;
      case translations.types.bands:
        console.log("Rendering Bands Component");
        return <Bands.EEGEdu data={bandsData} />;
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
      <Card title={'Record Data'} sectioned>
        <Stack>
          <ButtonGroup>
            <Button 
              onClick={() => {saveToCSV(selected);}}
              primary={status !== generalTranslations.connect}
              disabled={status === generalTranslations.connect}
            > 
              {'Save to CSV'}  
            </Button>
          </ButtonGroup>
        </Stack>
      </Card>
    </React.Fragment>
  );
}
