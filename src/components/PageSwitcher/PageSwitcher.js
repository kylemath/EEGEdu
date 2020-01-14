 import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup, Checkbox } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";
import * as translations from "./translations/en.json";
import * as generalTranslations from "./components/translations/en";
import { emptyAuxChannelData } from "./components/chartOptions";

import * as funIntro from "./components/EEGEduIntro/EEGEduIntro"
import * as funHeartRaw from "./components/EEGEduHeartRaw/EEGEduHeartRaw"
import * as funHeartSpectra from "./components/EEGEduHeartSpectra/EEGEduHeartSpectra"
import * as funRaw from "./components/EEGEduRaw/EEGEduRaw";
import * as funSpectra from "./components/EEGEduSpectra/EEGEduSpectra";
import * as funBands from "./components/EEGEduBands/EEGEduBands";
import * as funAnimate from "./components/EEGEduAnimate/EEGEduAnimate";
import * as funSpectro from "./components/EEGEduSpectro/EEGEduSpectro";
import * as funAlpha from "./components/EEGEduAlpha/EEGEduAlpha";
import * as funSsvep from "./components/EEGEduSsvep/EEGEduSsvep";
import * as funEvoked from "./components/EEGEduEvoked/EEGEduEvoked";
import * as funPredict from "./components/EEGEduPredict/EEGEduPredict";

const intro = translations.types.intro;
const heartRaw = translations.types.heartRaw;
const heartSpectra = translations.types.heartSpectra;
const raw = translations.types.raw;
const spectra = translations.types.spectra;
const bands = translations.types.bands;
const animate = translations.types.animate;
const spectro = translations.types.spectro;
const alpha = translations.types.alpha;
const ssvep = translations.types.ssvep;
const evoked = translations.types.evoked;
const predict = translations.types.predict;

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
  const [introData, setIntroData] = useState(emptyAuxChannelData)
  const [heartRawData, setHeartRawData] = useState(emptyAuxChannelData);
  const [heartSpectraData, setHeartSpectraData] = useState(emptyAuxChannelData);
  const [rawData, setRawData] = useState(emptyAuxChannelData);
  const [spectraData, setSpectraData] = useState(emptyAuxChannelData); 
  const [bandsData, setBandsData] = useState(emptyAuxChannelData);
  const [animateData, setAnimateData] = useState(emptyAuxChannelData);
  const [spectroData, setSpectroData] = useState(emptyAuxChannelData);
  const [alphaData, setAlphaData] = useState(emptyAuxChannelData);
  const [ssvepData, setSsvepData] = useState(emptyAuxChannelData);
  const [evokedData, setEvokedData] = useState(emptyAuxChannelData);
  const [predictData, setPredictData] = useState(emptyAuxChannelData);

  // pipe settings
  const [introSettings] = useState(funIntro.getSettings);
  const [heartRawSettings] = useState(funHeartRaw.getSettings);
  const [heartSpectraSettings] = useState(funHeartSpectra.getSettings);
  const [rawSettings, setRawSettings] = useState(funRaw.getSettings); 
  const [spectraSettings, setSpectraSettings] = useState(funSpectra.getSettings); 
  const [bandsSettings, setBandsSettings] = useState(funBands.getSettings);
  const [animateSettings, setAnimateSettings] = useState(funAnimate.getSettings);
  const [spectroSettings, setSpectroSettings] = useState(funSpectro.getSettings);
  const [alphaSettings, setAlphaSettings] = useState(funAlpha.getSettings);
  const [ssvepSettings, setSsvepSettings] = useState(funSsvep.getSettings);
  const [evokedSettings] = useState(funEvoked.getSettings);
  const [predictSettings, setPredictSettings] = useState(funPredict.getSettings);

  // connection status
  const [status, setStatus] = useState(generalTranslations.connect);

  // for picking a new module
  const [selected, setSelected] = useState(heartSpectra);
  const handleSelectChange = useCallback(value => {
    setSelected(value);

    console.log("Switching to: " + value);

    if (window.subscriptionIntro) window.subscriptionIntro.unsubscribe();
    if (window.subscriptionHeartRaw) window.subscriptionHeartRaw.unsubscribe();
    if (window.subscriptionHeartSpectra) window.subscriptionHeartSpectra.unsubscribe();
    if (window.subscriptionRaw) window.subscriptionRaw.unsubscribe();
    if (window.subscriptionSpectra) window.subscriptionSpectra.unsubscribe();
    if (window.subscriptionBands) window.subscriptionBands.unsubscribe();
    if (window.subscriptionAnimate) window.subscriptionAnimate.unsubscribe();
    if (window.subscriptionSpectro) window.subscriptionSpectro.unsubscribe();
    if (window.subscriptionAlpha) window.subscriptionAlpha.unsubscribe();
    if (window.subscriptionSsvep) window.subscriptionSsvep.unsubscribe();
    if (window.subscriptionEvoked) window.subscriptionEvoked.unsubscribe();
    if (window.subscriptionPredict) window.subscriptionPredict.unsubscribe();

    subscriptionSetup(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // for popup flag when recording
  const [recordPop, setRecordPop] = useState(false);
  const recordPopChange = useCallback(() => setRecordPop(!recordPop), [recordPop]);

  // for popup flag when recording 2nd condition
  const [recordTwoPop, setRecordTwoPop] = useState(false);
  const recordTwoPopChange = useCallback(() => setRecordTwoPop(!recordTwoPop), [recordTwoPop]);

  switch (selected) {
    case intro:
      showAux = false;
      break
    case heartRaw:
      showAux = false;
      break
    case heartSpectra:
      showAux = false;
      break
    case raw:
      showAux = true;
      break
    case spectra:
      showAux = true;
      break
    case bands: 
      showAux = true;
      break
    case animate: 
      showAux = false;
      break
    case spectro:
      showAux = false;
      break
    case alpha:
      showAux = true;
      break
    case ssvep:
      showAux = true;
      break
    case evoked:
      showAux = true;
      break
    case predict:
      showAux = false;
      break
    default:
      console.log("Error on showAux");
  }


  const chartTypes = [
    { label: intro, value: intro },
    { label: heartRaw, value: heartRaw },
    { label: heartSpectra, value: heartSpectra },
    { label: raw, value: raw },
    { label: spectra, value: spectra }, 
    { label: bands, value: bands },
    { label: animate, value: animate },
    { label: spectro, value: spectro },
    { label: alpha, value: alpha },
    { label: ssvep, value: ssvep },
    { label: evoked, value: evoked },
    { label: predict, value: predict }

  ];

  function buildPipes(value) {
    funIntro.buildPipe(introSettings);
    funHeartRaw.buildPipe(heartRawSettings);
    funHeartSpectra.buildPipe(heartSpectraSettings);
    funRaw.buildPipe(rawSettings);
    funSpectra.buildPipe(spectraSettings);
    funBands.buildPipe(bandsSettings);
    funAnimate.buildPipe(animateSettings);
    funSpectro.buildPipe(spectroSettings);
    funAlpha.buildPipe(alphaSettings);
    funSsvep.buildPipe(ssvepSettings);
    funEvoked.buildPipe(evokedSettings);
    funPredict.buildPipe(predictSettings);
  }

  function subscriptionSetup(value) {
    switch (value) {
      case intro:
        funIntro.setup(setIntroData, introSettings);
        break;
      case heartRaw:
        funHeartRaw.setup(setHeartRawData, heartRawSettings);
        break;
      case heartSpectra:
        funHeartSpectra.setup(setHeartSpectraData, heartSpectraSettings);
        break;
      case raw:
        funRaw.setup(setRawData, rawSettings);
        break;
      case spectra:
        funSpectra.setup(setSpectraData, spectraSettings);
        break;
      case bands:
        funBands.setup(setBandsData, bandsSettings);
        break;
      case animate:
        funAnimate.setup(setAnimateData, animateSettings);
        break;
      case spectro: 
        funSpectro.setup(setSpectroData, spectroSettings);
        break;
      case alpha:
        funAlpha.setup(setAlphaData, alphaSettings);
        break;
      case ssvep:
        funSsvep.setup(setSsvepData, ssvepSettings);
        break;
      case evoked:
        funEvoked.setup(setEvokedData, evokedSettings);
        break;
      case predict:
        funPredict.setup(setPredictData, predictSettings);
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
        setStatus(generalTranslations.connectingMock);
        window.source = {};
        window.source.connectionStatus = {};
        window.source.connectionStatus.value = true;
        window.source.eegReadings$ = mockMuseEEG(256);
        setStatus(generalTranslations.connectedMock);
      } else {
        // Connect with the Muse EEG Client
        setStatus(generalTranslations.connecting);
        window.source = new MuseClient();
        window.source.enableAux = window.enableAux;
        await window.source.connect();
        await window.source.start();
        window.source.eegReadings$ = window.source.eegReadings;
        setStatus(generalTranslations.connected);
      }
      if (
        window.source.connectionStatus.value === true &&
        window.source.eegReadings$
      ) {
        buildPipes(selected);
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
      case intro:
        return null
      case heartRaw:
        return null
      case heartSpectra:
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
      case spectro:
        return (
          funSpectro.renderSliders(setSpectroData, setSpectroSettings, status, spectroSettings)
        );
      case alpha:
        return (
          funAlpha.renderSliders(setAlphaData, setAlphaSettings, status, alphaSettings)
        );
      case ssvep:
        return (
          funSsvep.renderSliders(setSsvepData, setSsvepSettings, status, ssvepSettings)
        );
      case evoked:
        return null
      case predict: 
        return (
          funPredict.renderSliders(setPredictData, setPredictSettings, status, predictSettings)
        );
      default: console.log('Error rendering settings display');
    }
  }

  function renderModules() {
    switch (selected) {
      case intro:
        return <funIntro.renderModule data={introData} />;
      case heartRaw:
        return <funHeartRaw.renderModule data={heartRawData} />;
      case heartSpectra:
        return <funHeartSpectra.renderModule data={heartSpectraData} />;
      case raw:
        return <funRaw.renderModule data={rawData} />;
      case spectra:
        return <funSpectra.renderModule data={spectraData} />;
      case bands:
        return <funBands.renderModule data={bandsData} />;
      case animate:
        return <funAnimate.renderModule data={animateData} />;
      case spectro:
        return <funSpectro.renderModule data={spectroData} />;
      case alpha: 
        return <funAlpha.renderModule data={alphaData} />;
      case ssvep:
        return <funSsvep.renderModule data={ssvepData} />;
      case evoked:
        return <funEvoked.renderModule data={evokedData} />;
      case predict:
        return <funPredict.renderModule data={predictData} />;
      default:
        console.log("Error on renderCharts switch.");
    }
  }
 
  function renderRecord() {
    switch (selected) {
      case intro: 
        return null
      case heartRaw:
        return null
      case heartSpectra:
        return (
          funHeartSpectra.renderRecord(recordPopChange, recordPop, status, heartSpectraSettings)
        )
      case raw: 
        return (
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
      case spectro:
        return null
      case alpha:
        return (
          funAlpha.renderRecord(recordPopChange, recordPop, status, alphaSettings, recordTwoPopChange, recordTwoPop)
        )
      case ssvep:
        return (
          funSsvep.renderRecord(recordPopChange, recordPop, status, ssvepSettings, recordTwoPopChange, recordTwoPop)
        )
      case evoked:
        return (
          funEvoked.renderRecord(recordPopChange, recordPop, status, evokedSettings)
        )
      case predict:
        return (
          funPredict.renderRecord(status)
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
          <Checkbox
            label="Enable Muse Auxillary Channel"
            checked={checked}
            onChange={handleChange}
            disabled={!showAux || status !== generalTranslations.connect}
          />
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
      {renderModules()}
      {renderRecord()}
    </React.Fragment>
  );
}
