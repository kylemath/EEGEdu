import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup, Modal, TextContainer } from "@shopify/polaris";
import { saveAs } from 'file-saver';
import { take } from "rxjs/operators";

import { mockMuseEEG } from "./utils/mockMuseEEG";
import { generateXTics } from "./utils/chartUtils";

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
  const [selected, setSelected] = useState(raw);
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

  // function saveToCSV(value) {
  //   const numSamplesToSave = 50;
  //   console.log('Saving ' + numSamplesToSave + ' samples...');
  //   var localObservable$ = null;
  //   const dataToSave = [];

  //   console.log('making ' + value + ' headers')

  //   // for each module subscribe to multicast and make header
  //   switch (value) {
  //     case raw:
  //       // take one sample from selected observable object for headers
  //       localObservable$ = window.multicastRaw$.pipe(
  //         take(1)
  //       );
  //       //take one sample to get header info
  //       localObservable$.subscribe({ 
  //         next(x) { 
  //           dataToSave.push(
  //             "Timestamp (ms),",
  //             generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch0_" + f + "ms"}) + ",", 
  //             generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch1_" + f + "ms"}) + ",", 
  //             generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch2_" + f + "ms"}) + ",", 
  //             generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "ch3_" + f + "ms"}) + ",", 
  //             generateXTics(x.info.samplingRate,x.data[0].length,false).map(function(f) {return "chAux_" + f + "ms"}) + ",", 
  //             "info", 
  //             "\n"
  //           );   
  //         }
  //       });
  //       // put selected observable object into local and start taking samples
  //       localObservable$ = window.multicastRaw$.pipe(
  //         take(numSamplesToSave)
  //       );
  //       break;
  //     case spectra:
  //       // take one sample from selected observable object for headers
  //       localObservable$ = window.multicastSpectra$.pipe(
  //         take(1)
  //       );

  //       localObservable$.subscribe({ 
  //         next(x) { 
  //           let freqs = Object.values(x.freqs);
  //           dataToSave.push(
  //             "Timestamp (ms),",
  //             freqs.map(function(f) {return "ch0_" + f + "Hz"}) + ",", 
  //             freqs.map(function(f) {return "ch1_" + f + "Hz"}) + ",", 
  //             freqs.map(function(f) {return "ch2_" + f + "Hz"}) + ",", 
  //             freqs.map(function(f) {return "ch3_" + f + "Hz"}) + ",", 
  //             freqs.map(function(f) {return "chAux_" + f + "Hz"}) + ",", 
  //             freqs.map(function(f) {return "f_" + f + "Hz"}) + "," , 
  //             "info", 
  //             "\n"
  //           );   
  //         }
  //       });
  //       // put selected observable object into local and start taking samples
  //       localObservable$ = window.multicastSpectra$.pipe(
  //         take(numSamplesToSave)
  //       );
  //       break;
  //     case bands:
  //       dataToSave.push(
  //         "Timestamp (ms),",
  //         "delta0,delta1,delta2,delta3,deltaAux,", 
  //         "theta0,theta1,theta2,theta3,thetaAux,",  
  //         "alpha0,alpha1,alpha2,alpha3,alphaAux,",  
  //         "beta0,beta1,beta2,beta3,betaAux,", 
  //         "delta0,delta1,delta2,delta3,deltaAux\n"
  //       );
  //       // put selected observable object into local and start taking samples
  //       localObservable$ = window.multicastBands$.pipe(
  //         take(numSamplesToSave)
  //       );
  //       break;
  //     default:
  //       console.log(
  //         "Error on creating header in module: " + value
  //       );
  //   }

  //   // now with header in place subscribe to each epoch and log it
  //   localObservable$.subscribe({
  //     next(x) { 
  //       dataToSave.push(Date.now() + "," + Object.values(x).join(",") + "\n");
  //       // logging is useful for debugging -yup
  //       // console.log(x);
  //     },
  //     error(err) { console.log(err); },
  //     complete() { 
  //       console.log('Trying to save')
  //       var blob = new Blob(
  //         dataToSave, 
  //         {type: "text/plain;charset=utf-8"}
  //       );
  //       saveAs(blob, value + "_Recording.csv");
  //       console.log('Completed');
  //     }
  //   });
  // }

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
          <Card title={selected + ' Settings'} sectioned>
            {funSpectra.renderSliders(setSpectraData, setSpectraSettings, status, spectraSettings)}
          </Card>
        );
      case bands: 
        return (
          <Card title={selected + ' Settings'} sectioned>
            {funBands.renderSliders(setBandsData, setBandsSettings, status, bandsSettings)}
          </Card>
        );
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
      // case intro: 
      //   return null
      case raw: 
        return(
          <React.Fragment>
          {funRaw.renderRecord()}
          </React.Fragment>
        )    
      // case spectra:
      //   return (
      //     <Card title={'Record Raw Data'} sectioned>
      //       <Card.Section>
      //         <p>
      //           {"When you are recording raw data it is recommended you set the "}
      //           {"number of sampling points between epochs onsets to be equal to the epoch duration. "}
      //           {"This will ensure that consecutive rows of your output file are not overlapping in time."}
      //           {"It will make the live plots appear more choppy."}
      //         </p>        
      //       </Card.Section>
      //       <Stack>
      //         <ButtonGroup>
      //           <Button 
      //             onClick={() => {
      //               saveToCSV(selected);
      //               recordPopChange();
      //             }}
      //             primary={status !== generalTranslations.connect}
      //             disabled={status === generalTranslations.connect}
      //           > 
      //             {'Save to CSV'}  
      //           </Button>
      //         </ButtonGroup>
      //         <Modal
      //           open={recordPop}
      //           onClose={recordPopChange}
      //           title="Recording Data"
      //         >
      //           <Modal.Section>
      //             <TextContainer>
      //               <p>
      //                 Your data is currently recording, 
      //                 once complete it will be downloaded as a .csv file 
      //                 and can be opened with your favorite spreadsheet program. 
      //                 Close this window once the download completes.
      //               </p>
      //             </TextContainer>
      //           </Modal.Section>
      //         </Modal>
      //       </Stack>
      //     </Card>
      //   )      
      // case bands:
      //   return (
      //     <Card title={'Record Data'} sectioned>
      //       <Stack>
      //         <ButtonGroup>
      //           <Button 
      //             onClick={() => {
      //               saveToCSV(selected);
      //               recordPopChange();
      //             }}
      //             primary={status !== generalTranslations.connect}
      //             disabled={status === generalTranslations.connect}
      //           > 
      //             {'Save to CSV'}  
      //           </Button>
      //         </ButtonGroup>
      //         <Modal
      //           open={recordPop}
      //           onClose={recordPopChange}
      //           title="Recording Data"
      //         >
      //           <Modal.Section>
      //             <TextContainer>
      //               <p>
      //                 Your data is currently recording, 
      //                 once complete it will be downloaded as a .csv file 
      //                 and can be opened with your favorite spreadsheet program. 
      //                 Close this window once the download completes.
      //               </p>
      //             </TextContainer>
      //           </Modal.Section>
      //         </Modal>
      //       </Stack>
      //     </Card>
      //   ) 
      // case animate:
      //   return null
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
