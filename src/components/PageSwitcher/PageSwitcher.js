import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button } from "@shopify/polaris";
import { bandpassFilter, epoch, fft, sliceFFT } from "@neurosity/pipes";
import { Subject } from "rxjs";
import { catchError, multicast } from "rxjs/operators";

import EEGEduRaw from "./components/EEGEduRaw/EEGEduRaw";
import EEGEduSpectra from "./components/EEGEduSpectra/EEGEduSpectra";
import EEGEduBands from "./components/EEGEduBands/EEGEduBands";

import * as translations from "./translations/en.json";
import { MuseClient, zipSamples } from "muse-js";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";
import { customCount } from "./components/chartUtils";

export function PageSwitcher() {
  const [rawData, setRawData] = useState(emptyChannelData);
  const [spectraData, setSpectraData] = useState(emptyChannelData);
  const [bandsData, setBandsData] = useState(emptyChannelData);
  const [status, setStatus] = useState(generalTranslations.connect);
  const [selected, setSelected] = useState(translations.types.raw);
  const handleSelectChange = useCallback(value => {
    setSelected(value);
    handleSubscriptions(value);
  }, []);
  const options = [
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra },
    { label: translations.types.bands, value: translations.types.bands }
  ];
  const numOptions = {
    srate: 256, 
    duration: 1024, 
  }; 
  const xTics = customCount(
                  (1000 / numOptions.srate) * numOptions.duration,
                  1000 / numOptions.srate,
                  -(1000 / numOptions.srate)
                ).map(function(each_element) {
                  return Number(each_element.toFixed(0));
                });
  const bandLabels = ["Delta", "Theta", "Alpha", "Beta", "Gamma"];
 

  function renderCharts() {
    switch (selected) {
      case translations.types.bands:
        console.log('Rendering Bands Component');
        return <EEGEduBands data={bandsData} />;
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
    console.log('Connecting to data source observable...');
    setStatus(generalTranslations.connecting);
    
    try {
      // 1) create real eeg data source
      window.source$ = new MuseClient();
      // window.source$ = window.museClient.eegReadings;
      
      // 2) For debugging
      // window.source$ = interval(1000);

      // wait for the appropriate client connections to start
      // these awaits is why we need THIS funciton to be async
      await window.source$.connect();
      await window.source$.start();
      setStatus(generalTranslations.connected);

      // ensure that the client is connected and eegReadings are coming in
      if (window.source$ && window.source$.eegReadings) {
        console.log('Successfully connected to data source Observable.')
        setStatus(generalTranslations.connected);

        // Build the data source from the data source
        console.log('Build the data pipes from the data source.')

        // RAW DATA HANDLED HERE
        // zipSamples here
        window.pipeRaw$ = zipSamples(
          window.source$.eegReadings
        ).pipe(
          // implement the eeg operations here
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({ duration: numOptions.duration, interval: 50, samplingRate: numOptions.srate }),
          catchError(err => {
            console.log(err);
          }),
        );

        // SPECTRA DATA HANDLED HERE
        // zipSamples here
        window.pipeSpectra$ = zipSamples(
          window.source$.eegReadings
        ).pipe(
          // implement the fft operations here
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({ duration: numOptions.duration, interval: 100, samplingRate: numOptions.srate }),
          fft({ bins: 256 }),
          sliceFFT([1, 30]),
          catchError(err => {
            console.log(err);
          }),
        );

        // BANDS DATA HANDLED HERE
        // zipSamples here
        window.pipeBands$ = zipSamples(
          window.source$.eegReadings
        ).pipe(
          // implement the fft operations here
          bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
          epoch({ duration: numOptions.duration, interval: 100, samplingRate: numOptions.srate }),
          fft({ bins: 256 }),
          powerByBand(),
          catchError(err => {
            console.log(err);
          }),
        );

        window.multiCastRaw$ = window.pipeRaw$.pipe(
          multicast(() => new Subject())
        );

        window.multiCastSpectra$ = window.pipeSpectra$.pipe(
          multicast(() => new Subject())
        );

        window.multiCastBands$ = window.pipeBands$.pipe(
          multicast(() => new Subject())
        );

        console.log(selected)
        switch (selected) {
          case translations.types.bands:
            // Subscribe to observable with bands data view
            console.log('bands view subscribed');
            window.subscriptionBands$ = window.multiCastBands$.subscribe(
              data => {
                setBandsData(bandsData => {
                  Object.values(bandsData).forEach(
                    (channel, index) => {
                      if (index < 4) {
                        channel.datasets[0].data = [
                          data.delta[index],
                          data.theta[index],
                          data.alpha[index],
                          data.beta[index],
                          data.gamma[index]
                        ];
                        channel.xLabels = bandLabels;
                      }
                    }
                  );

                  return {
                    ch0: bandsData.ch0,
                    ch1: bandsData.ch1,
                    ch2: bandsData.ch2,
                    ch3: bandsData.ch3
                  };
                });
              }
            );
            break;
          case translations.types.spectra:
            // Subscribe to observable with spectra data view
            console.log('spectra view subscribed');
            window.subscriptionSpectra$ = window.multiCastSpectra$.subscribe(
              data => {
                setSpectraData(spectraData => {
                  Object.values(spectraData).forEach(
                    (channel, index) => {
                      if (index < 4) {
                        channel.datasets[0].data = data.psd[index];
                        channel.xLabels = data.freqs;
                      }
                    }
                  );

                  return {
                    ch0: spectraData.ch0,
                    ch1: spectraData.ch1,
                    ch2: spectraData.ch2,
                    ch3: spectraData.ch3
                  };
                });
              }
            );
            break;
          case translations.types.raw:
            // Subscribe to observable with raw data view
            console.log('raw view subscribed');
            window.subscriptionRaw$ = window.multiCastRaw$.subscribe(data => {
              setRawData(rawData => {
                Object.values(rawData).forEach(
                  (channel, index) => {
                    if (index < 4) {
                      channel.datasets[0].data = data.data[index];
                      channel.xLabels = xTics;
                    }
                  },
                  err => {
                    console.log(err);
                  }
                );

                return {
                  ch0: rawData.ch0,
                  ch1: rawData.ch1,
                  ch2: rawData.ch2,
                  ch3: rawData.ch3
                };
              });
            });
            break;
          default:
            console.log('Error on first subscription switch.')
          }
        } 
        
        window.multiCastRaw$.connect();
        window.multiCastSpectra$.connect();
        window.multiCastBands$.connect();
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
        if (window.subscriptionSpectra$ || window.subscriptionBands$) {
          console.log('Unsubscribing from Spectra and Bands subscription...');
          window.subscriptionSpectra$.unsubscribe();
          window.subscriptionBands$.unsubscribe();
          console.log('Successfully unsubscribed from Spectra and Bands');
          
          // Resubscribe to observable with raw data view
          window.subscriptionRaw$ = window.multiCastRaw$.subscribe(
            data => {
              setRawData(rawData => {
                Object.values(rawData).forEach(
                  (channel, index) => {
                    if (index < 4) {
                      channel.datasets[0].data = data.data[index];
                      channel.xLabels = xTics;
                    }
                  }
                );

                return {
                  ch0: rawData.ch0,
                  ch1: rawData.ch1,
                  ch2: rawData.ch2,
                  ch3: rawData.ch3
                };
              });
            });
           console.log('Resubscribed to Raw');
          
          // Ensure that the raw is connected
          window.multiCastRaw$.connect();
        }
        break;
      
      case 'Spectra':
        if (window.subscriptionRaw$ || window.subscriptionBands$) {
          console.log('Unsubscribing from Raw and Bands subscription...');
          window.subscriptionRaw$.unsubscribe();
          window.subscriptionBands$.unsubscribe();
          console.log('Successfully unsubscribed from Raw and Bands');
          
          // Subscribe to observable with spectra data view
          window.subscriptionSpectra$ = window.multiCastSpectra$.subscribe(
            data => {
              setSpectraData(spectraData => {
                Object.values(spectraData).forEach(
                  (channel, index) => {
                    if (index < 4) {
                      channel.datasets[0].data = data.psd[index];
                      channel.xLabels = data.freqs;
                    }
                  }
                );

                return {
                  ch0: spectraData.ch0,
                  ch1: spectraData.ch1,
                  ch2: spectraData.ch2,
                  ch3: spectraData.ch3
                };
              });
            }
          );
          console.log('Resubscribed to Spectra');
          // Ensure that the spectra is connected
          window.multiCastSpectra$.connect();
        }
        break;

      case 'Bands':
        if (window.subscriptionRaw$ || window.subscriptionSpectra$) {
          console.log('Unsubscribing from Raw and Spectra subscription...');
          window.subscriptionRaw$.unsubscribe();
          window.subscriptionSpectra$.unsubscribe();         
          console.log('Successfully unsubscribed from Raw and Spectra');
          
          // Subscribe to observable with bands data view
          window.subscriptionBands$ = window.multiCastBands$.subscribe(
            data => {
              setBandsData(bandsData => {
                Object.values(bandsData).forEach(
                  (channel, index) => {
                    if (index < 4) {
                      channel.datasets[0].data = [
                        data.delta[index],
                        data.theta[index],
                        data.alpha[index],
                        data.beta[index],
                        data.gamma[index]
                      ];
                      channel.xLabels = bandLabels;
                    }
                  }
                );

                return {
                  ch0: bandsData.ch0,
                  ch1: bandsData.ch1,
                  ch2: bandsData.ch2,
                  ch3: bandsData.ch3
                };
              });
            }
          );
          console.log('Resubscribed to Bands');
          // Ensure that the bands is connected
          window.multiCastBands$.connect();
        }
        break;

      default:
        console.log('Error on handleSubscriptions, switchToward: '+ switchToward);
    }
  }

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