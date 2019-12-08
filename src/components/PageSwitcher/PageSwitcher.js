import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button } from "@shopify/polaris";
import { bandpassFilter, epoch, fft, sliceFFT, createEEG } from "@neurosity/pipes";
import { interval, Subject, of } from "rxjs";
import { catchError, multicast } from "rxjs/operators";

import EEGEduRaw from "./components/EEGEduRaw/EEGEduRaw";
import EEGEduSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

import * as translations from "./translations/en.json";
import { MuseClient, zipSamples } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";
import { customCount } from "./components/chartUtils";

export function PageSwitcher() {
  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData);
  const [status, setStatus] = useState(generalTranslations.connect);
  const [selected, setSelected] = useState(translations.types.raw);
  const handleSelectChange = useCallback(value => {
    setSelected(value);
    handleSubscriptions(value);
  }, []);
  const options = [
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra },
  ];

  function renderCharts() {
    switch (selected) {
      case translations.types.spectra:
        console.log('Rendering Spectra Component');
        return <EEGEduSpectra data={spectraData} />;
      case translations.types.raw:
        console.log('Rendering Raw Component');
        return <EEGEduRaw data={rawData} />;
      default:
        console.log('Error on renderCharts switch.')
    }
  }

  async function connect() { 
    console.log('Connecting to createEEG observable...');
    setStatus(generalTranslations.connecting);
    
    try {
      // create real eeg data source
      window.source$ = new MuseClient();
      // create mock eeg data source
      // window.source$ = createEEG();
      // For debugging
      // window.source$ = interval(1000);

      // wait for the appropriate client connections to start
      await window.source$.connect();
      await window.source$.start();
      setStatus(generalTranslations.connected);

      // ensure that the client is connected and eegReadings are coming in
      if (window.source$ && window.source$.eegReadings) {
        if (window.source$) {
          console.log('Successfully connected to createEEG Observable.')
          setStatus(generalTranslations.connected);

          // Build the data source from the data source
          console.log('Build the data pipes from the data source.')
          // need to zipSamples 
          window.pipedDataRaw$ = zipSamples(window.source$.eegReadings).pipe(
            // implement the eeg operations 
            bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
            epoch({ duration: 1024, interval: 50, samplingRate: 256 }),
            
            // ensure we are catching errors correctly, and logging
            catchError(err => {
              throw 'Error in pipedData. Details: ' + err;
            }),
          );

          // need to zipSamples here
          window.pipedDataSpectra$ = zipSamples(window.source$.eegReadings).pipe(
            // implement the fft operations here
            bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
            epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
            fft({ bins: 256 }),
            sliceFFT([1, 30]),
            // ensure we are catching errors correctly, and logging
            catchError(err => {
              throw 'Error in pipedData. Details: ' + err;
            }),
          );

          switch (selected) {
            case translations.types.spectra:
              // Subscribe to observable with spectra data view
              console.log('spectra view subscribed');
              window.subscriptionSpectra$ = window.pipedDataSpectra$.subscribe(
                (v) => console.log('spectra view: ' + v),
                (err) => console.log(err)
              );
              break;
            case translations.types.raw:
              // Subscribe to observable with raw data view
              console.log('raw view subscribed');
              window.subscriptionRaw$ = window.pipedDataRaw$.subscribe(
                (v) => console.log('raw view: ' + v)
              );
              break;
            default:
              console.log('Error on first subscription switch.')
            }
          } 
        }
      } catch (err) {
        // Catch the connection error here.
        setStatus(generalTranslations.connect);
        console.log(err);
      }
  
  }

  function handleSubscriptions(switchToward) {
    console.log('Switching to: ' + switchToward)
    switch (switchToward) {
      case 'Raw':
        if (window.subscriptionSpectra$) {
          console.log('Unsubscribing from Spectra subscription...');
          window.subscriptionSpectra$.unsubscribe();
          console.log('Successfully unsubscribed from Spectra');
          
          // Resubscribe to observable with raw data view
          window.subscriptionRaw$ = window.pipedDataRaw$.subscribe(
            (v) => console.log('raw view: ' + v)
          );
          console.log('Resubscribed to Raw');
        }
        break;
      
      case 'Spectra':
        if (window.subscriptionRaw$) {
          console.log('Unsubscribing from Raw subscription...');
          window.subscriptionRaw$.unsubscribe();
          console.log('Successfully unsubscribed from Raw');
          
          // Subscribe to observable with spectra data view
          window.subscriptionSpectra$ = window.pipedDataSpectra$.subscribe(
            (v) => console.log('spectra view: ' + v),
            (err) => console.log(err)
          );
          console.log('Resubscribed to Spectra');
        }
        break;
      
      default:
        console.log('Error on handleSubscriptions, switchToward: '+ switchToward);
    }
  }

  // async function connect() {
  //   window.museClient = new MuseClient();
  //   setStatus(generalTranslations.connecting);

  //   try {
  //     await window.museClient.connect();
  //     await window.museClient.start();
  //     setStatus(generalTranslations.connected);

  //     if (window.museClient && window.museClient.eegReadings) {
  //       switch (selected) {
  //         case translations.types.raw:
  //           if (window.rawZippedData$ === null) {
  //             window.rawZippedData$ = zipSamples(
  //               window.museClient.eegReadings
  //             ).pipe(
  //               bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
  //               epoch({ duration: 1024, interval: 50, samplingRate: 256 }),
  //               catchError(err => {
  //                 console.log(err);
  //               })
  //             );
  //           }

  //           window.rawSubscription$ = window.rawZippedData$.subscribe(data => {
  //             setRawData(rawData => {
  //               Object.values(rawData).forEach(
  //                 (channel, index) => {
  //                   if (index < 4) {
  //                     const sRate = data.info.samplingRate;

  //                     channel.datasets[0].data = data.data[index];
  //                     channel.xLabels = customCount(
  //                       (1000 / sRate) * data.data[2].length,
  //                       1000 / sRate,
  //                       -(1000 / sRate)
  //                     ).map(function(each_element) {
  //                       return Number(each_element.toFixed(0));
  //                     });
  //                   }
  //                 },
  //                 err => {
  //                   console.log(err);
  //                 }
  //               );

  //               return {
  //                 ch0: rawData.ch0,
  //                 ch1: rawData.ch1,
  //                 ch2: rawData.ch2,
  //                 ch3: rawData.ch3
  //               };
  //             });
  //           });
  //           break;

  //         case translations.types.spectra:
  //           if (window.spectraZippedData$ === null) {
  //             window.spectraZippedData$ = zipSamples(
  //               window.museClient.eegReadings
  //             ).pipe(
  //               bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
  //               epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
  //               fft({ bins: 256 }),
  //               sliceFFT([1, 30]),
  //               catchError(err => {
  //                 console.log(err);
  //               })
  //             );
  //           }

  //           window.spectraSubscription$ = window.spectraZippedData$.subscribe(
  //             data => {
  //               setSpectraData(spectraData => {
  //                 Object.values(spectraData).forEach((channel, index) => {
  //                   if (index < 4) {
  //                     channel.datasets[0].data = data.psd[index];
  //                     channel.xLabels = data.freqs;
  //                   }
  //                 });

  //                 return {
  //                   ch0: spectraData.ch0,
  //                   ch1: spectraData.ch1,
  //                   ch2: spectraData.ch2,
  //                   ch3: spectraData.ch3
  //                 };
  //               });
  //             }
  //           );
  //           break;
  //       }
  //     }
  //   } catch (err) {
  //     setStatus(generalTranslations.connect);
  //     console.log(err);
  //   }
  // }

  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <Button
            primary={status === generalTranslations.connect}
            disabled={status !== generalTranslations.connect}
            onClick={connect}
          >
            {status}
          </Button>
        </Stack>
      </Card>
      <Card title={translations.title} sectioned>
        <Select
          label={""}
          options={options}
          onChange={handleSelectChange}
          value={selected}
        />
      </Card>

      {renderCharts()}
    </React.Fragment>
  );
}
