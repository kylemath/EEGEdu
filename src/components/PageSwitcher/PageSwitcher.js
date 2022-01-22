import React, { useState } from "react";
import { MuseClient } from "muse-js";
import { Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";

import * as funAnimate from "./components/EEGEduAnimate/EEGEduAnimate"

// import { messageService, subscriber } from './utils/messageService';

import { zipSamples } from "muse-js";

import { multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import {
  bandpassFilter,
  epoch,
  fft,
  powerByBand
} from "@neurosity/pipes";

export function PageSwitcher() {
  
  // data pulled out of multicast$
  const [animateData, setAnimateData] = useState(emptyChannelData);
  // pipe settings
  const [animateSettings] = useState(funAnimate.getSettings);
  // connection status
  const [status, setStatus] = useState(generalTranslations.connect);

   //setup


  async function connect() {
      if (window.debugWithMock) {
        setStatus(generalTranslations.connectingMock);
        window.source = {};
        window.source.connectionStatus = {};
        window.source.connectionStatus.value = true;
        window.source.eegReadings$ = mockMuseEEG(256);
        setStatus(generalTranslations.connectedMock);
      } else {
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

        window.pipeBands$ = zipSamples(window.source.eegReadings$).pipe(
          bandpassFilter({ 
            cutoffFrequencies: [animateSettings.cutOffLow, animateSettings.cutOffHigh], 
            nbChannels: animateSettings.nbChannels }),
          epoch({
            duration: animateSettings.duration,
            interval: animateSettings.interval,
            samplingRate: animateSettings.srate
          }),
          fft({ bins: animateSettings.bins }),
          powerByBand()
        );
        window.multicastBands$ = window.pipeBands$.pipe(
          multicast(() => new Subject())
        );

        if (window.multicastBands$) {
            window.multicastBands$.subscribe(data => {
              setAnimateData(bandsData => {
                Object.values(bandsData).forEach((channel, index) => {
                  if (index < 4) {
                    channel.datasets[0].data = [
                      data.delta[index],
                      data.theta[index],
                      data.alpha[index],
                      data.beta[index],
                      data.gamma[index]
                    ];
                  }
                });

                return {
                  ch0: bandsData.ch0,
                  ch1: bandsData.ch1,
                  ch2: bandsData.ch2,
                  ch3: bandsData.ch3
                };
              });
            });

            window.multicastBands$.connect();
          }
      }
  }

  function refreshPage(){
    window.location.reload();
  }

  function renderCharts() {
    return <funAnimate.renderModule data={animateData} />;
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
    
      {renderCharts()}

    </React.Fragment>
  );
}
