import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button } from "@shopify/polaris";
import { bandpassFilter, epoch, fft, sliceFFT } from "@neurosity/pipes";
import { catchError } from "rxjs/operators";

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
    handleUnsubscribe().then();
    setSelected(value);
  }, []);
  const options = [
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra }
  ];

  window.rawZippedData$ = null;
  window.rawSubscription$ = null;
  window.spectraZippedData$ = null;
  window.spectraSubscription$ = null;

  function renderCharts() {
    switch (selected) {
      case translations.types.raw:
        return <EEGEduRaw data={rawData} />;
      default:
        return <EEGEduSpectra data={spectraData} />;
    }
  }

  async function connect() {
    window.museClient = new MuseClient();
    setStatus(generalTranslations.connecting);

    try {
      await window.museClient.connect();
      await window.museClient.start();
      setStatus(generalTranslations.connected);

      if (window.museClient && window.museClient.eegReadings) {
        switch (selected) {
          case translations.types.raw:
            if (window.rawZippedData$ === null) {
              window.rawZippedData$ = zipSamples(
                window.museClient.eegReadings
              ).pipe(
                bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
                epoch({ duration: 1024, interval: 50, samplingRate: 256 }),
                catchError(err => {
                  console.log(err);
                })
              );
            }

            window.rawSubscription$ = window.rawZippedData$.subscribe(data => {
              setRawData(rawData => {
                Object.values(rawData).forEach(
                  (channel, index) => {
                    if (index < 4) {
                      const sRate = data.info.samplingRate;

                      channel.datasets[0].data = data.data[index];
                      channel.xLabels = customCount(
                        (1000 / sRate) * data.data[2].length,
                        1000 / sRate,
                        -(1000 / sRate)
                      ).map(function(each_element) {
                        return Number(each_element.toFixed(0));
                      });
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

          case translations.types.spectra:
            if (window.spectraZippedData$ === null) {
              window.spectraZippedData$ = zipSamples(
                window.museClient.eegReadings
              ).pipe(
                bandpassFilter({ cutoffFrequencies: [2, 20], nbChannels: 4 }),
                epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
                fft({ bins: 256 }),
                sliceFFT([1, 30]),
                catchError(err => {
                  console.log(err);
                })
              );
            }

            window.spectraSubscription$ = window.spectraZippedData$.subscribe(
              data => {
                setSpectraData(spectraData => {
                  Object.values(spectraData).forEach((channel, index) => {
                    if (index < 4) {
                      channel.datasets[0].data = data.psd[index];
                      channel.xLabels = data.freqs;
                    }
                  });

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
        }
      }
    } catch (err) {
      setStatus(generalTranslations.connect);
      console.log(err);
    }
  }

  async function handleUnsubscribe() {
    window.rawSubscription$ = null;
    window.spectraSubscription$ = null;
    window.rawZippedData$ = null;
    window.spectraZippedData$ = null;
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
