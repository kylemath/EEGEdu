import React, { useState, useCallback } from "react";
import { MuseClient, zipSamples } from "muse-js";
import { Card, Stack, Button, ButtonGroup, Checkbox , RangeSlider, Modal, TextContainer, TextField} from "@shopify/polaris";
import { mockMuseEEG } from "./utils/mockMuseEEG";
import * as connectionText from "./utils/connectionText";
import { emptyAuxChannelData } from "./utils/chartOptions";
import { bandpassFilter, epoch, fft, sliceFFT} from "@neurosity/pipes";
import { Subject } from "rxjs";
import { multicast } from "rxjs/operators";
import { takeUntil } from "rxjs/operators";
import { timer } from "rxjs";

import { RenderModule } from "./components/EEGEduSpectra/EEGEduSpectra";

let showAux = true; // if it is even available to press (to prevent in some modules)
let source = {};

// ADDED ADDED ADDED
let socket = require('socket.io-client')('http://127.0.0.1:3000');
//


//-----Setup Constants
let thisMulticast = null;
let subscription = null;

function getSettings() {
  return {
    cutOffLow: 1,
    cutOffHigh: 100,
    interval: 100,
    bins: 256,
    sliceFFTLow: 1,
    sliceFFTHigh: 100,
    duration: 1024,
    srate: 256,
    name: 'Spectra',
    secondsToSave: 1000,
    nchans: 4
  }
};



export function PageSwitcher() {

  // connection status
  const [status, setStatus] = useState(connectionText.connect);

  // data pulled out of multicast$
  const [Data, setData] = useState(emptyAuxChannelData); 

  // pipe settings
  const [Settings, setSettings] = useState(getSettings); 

  // for popup flag when recording
  const [recordPop, setRecordPop] = useState(false);
  const recordPopChange = useCallback(() => setRecordPop(!recordPop), [recordPop]);

  // For auxEnable settings
  const [checked, setChecked] = useState(false);
  const handleChange = useCallback((newChecked) => setChecked(newChecked), []);


  const [userName, setUserName] = useState('RandomUser' + Math.floor(Math.random() * 101));
  const userNameChange = useCallback((newValue) => setUserName(newValue), []);

      
  // ---- Manage Auxillary channel

  window.enableAux = checked;
  if (window.enableAux) {
    window.nchans = 5;
  } else {
    window.nchans = 4;
  }

  showAux = true;

  //---- Main functions to build and setup called once connect pressed

  function buildPipes() {
    if (subscription) subscription.unsubscribe();

    console.log("Building Multicast for " + Settings.name);
    // Build Pipe 
    thisMulticast = zipSamples(source.eegReadings$).pipe(
      bandpassFilter({ 
        cutoffFrequencies: [Settings.cutOffLow, Settings.cutOffHigh], 
        nbChannels: Settings.nchans }),
      epoch({
        duration: Settings.duration,
        interval: Settings.interval,
        samplingRate: Settings.srate
      }),
      fft({ bins: Settings.bins }),
      sliceFFT([Settings.sliceFFTLow, Settings.sliceFFTHigh])
    ).pipe(multicast(() => new Subject()));
  }

  function subscriptionSetup() {
    console.log("Subscribing to " + Settings.name);

    if (thisMulticast) {
      thisMulticast.connect();
      subscription = thisMulticast.subscribe(data => {
        setData(inData => {
          Object.values(inData).forEach((channel, index) => {
            channel.datasets[0].data = data.psd[index];
            channel.xLabels = data.freqs;
          });

          return {
            ch0: inData.ch0,
            ch1: inData.ch1,
            ch2: inData.ch2,
            ch3: inData.ch3,
            ch4: inData.ch4
          };
        });
      });
      console.log("Subscribed to " + Settings.name);
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

      }
      if (
        source.connectionStatus.value === true &&
        source.eegReadings$
      ) {

        //Build and Setup
        buildPipes();
        subscriptionSetup();
      }

    } catch (err) {
      setStatus(connectionText.connect);
      console.log("Connection error: " + err);
    }
  }

  // For disconnect button
  function refreshPage(){
    window.location.reload();
  }

  // Show the chart
  function renderModules() {
    return <RenderModule data={Data} />;
  }
 
  // Show the record button
  function renderRecord() {
    function handleSecondsToSaveRangeSliderChange(value) {
      setSettings(prevState => ({...prevState, secondsToSave: value}));
    }

    return(
      <Card title={'Stream ' + Settings.name +' Data'} sectioned>
        <Stack>
          <RangeSlider 
            disabled={status === connectionText.connect} 
            min={2}
            max={180}
            label={'Streaming Length: ' + Settings.secondsToSave + ' Seconds'} 
            value={Settings.secondsToSave} 
            onChange={handleSecondsToSaveRangeSliderChange} 
          />
          <ButtonGroup>
            <Button 
              onClick={() => {
                saveToCSV(Settings);
                recordPopChange();
              }}
              primary={status !== connectionText.connect}
              disabled={status === connectionText.connect}
            > 
              {'Stream to websocket'}  
            </Button>
            <TextField label="Username" value={userName} onChange={userNameChange} />
          </ButtonGroup>
          <Modal
            open={recordPop}
            onClose={recordPopChange}
            title="Recording Data"
          >
            <Modal.Section>
              <TextContainer>
                <p>
                  Your data is currently recording, 
                  once complete it will be downloaded as a .csv file 
                  and can be opened with your favorite spreadsheet program. 
                  Close this window once the download completes.
                </p>
              </TextContainer>
            </Modal.Section>
          </Modal>
        </Stack>
      </Card>
    )
  }

  async function saveToCSV(Settings) {
    // var socket = await io.connect('75.152.213.182:8080');

    console.log('Streaming ' + Settings.secondsToSave + ' seconds...');
    var localObservable$ = null;

    // Create timer 
    const timer$ = timer(Settings.secondsToSave * 1000);

    // put selected observable object into local and start taking samples
    localObservable$ = thisMulticast.pipe(
      takeUntil(timer$)
    );   

    // now with header in place subscribe to each epoch and log it
    localObservable$.subscribe({
      next(x) { 
        // console.log('Next packet socket emit eeg data: ', x)
        
        // The client webpage will emit the data to the 'incoming data' socket
        // namespace. This should be handled by the server.
        x['userName'] = userName;
        socket.emit('incoming data', x )
        console.log('emit incoming data from user: ', x )

      },
      error(err) { console.log(err); },
      complete() { 
        console.log('Done streaming')
      }
    });      
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
      {renderModules()}
      {renderRecord()}
    </React.Fragment>
  );
}
