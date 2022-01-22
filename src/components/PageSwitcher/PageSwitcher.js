import React, { useState } from "react";
import { MuseClient } from "muse-js";
import { Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";

import {
  settings as animateSettings,
  Animate,
} from "./components/EEGEduAnimate/EEGEduAnimate";

// import { messageService, subscriber } from './utils/messageService';

import { zipSamples } from "muse-js";

import { multicast } from "rxjs/operators";
import { Subject } from "rxjs";

import { bandpassFilter, epoch, fft, powerByBand } from "@neurosity/pipes";

export function PageSwitcher() {
  const [channelData, setChannelData] = useState(emptyChannelData);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    type: undefined,
  });

  async function connect(connectionType) {
    let isConnected = false;

    if (connectionType === "mock") {
      window.source = {};
      window.source.eegReadings$ = mockMuseEEG(256);

      isConnected = true;
      setConnectionStatus({ connected: true, type: "mock" });
    } else {
      window.source = new MuseClient();
      await window.source.connect();
      await window.source.start();
      window.source.eegReadings$ = window.source.eegReadings;

      isConnected = true;
      setConnectionStatus({ connected: true, type: "muse" });
    }

    if (isConnected && window.source.eegReadings$) {
      window.pipeBands$ = zipSamples(window.source.eegReadings$).pipe(
        bandpassFilter({
          cutoffFrequencies: [
            animateSettings.cutOffLow,
            animateSettings.cutOffHigh,
          ],
          nbChannels: animateSettings.nbChannels,
        }),
        epoch({
          duration: animateSettings.duration,
          interval: animateSettings.interval,
          samplingRate: animateSettings.srate,
        }),
        fft({ bins: animateSettings.bins }),
        powerByBand()
      );
      window.multicastBands$ = window.pipeBands$.pipe(
        multicast(() => new Subject())
      );

      if (window.multicastBands$) {
        window.multicastBands$.subscribe((data) => {
          setChannelData((bandsData) => {
            Object.values(bandsData).forEach((channel, index) => {
              if (index < 4) {
                channel.datasets[0].data = [
                  data.delta[index],
                  data.theta[index],
                  data.alpha[index],
                  data.beta[index],
                  data.gamma[index],
                ];
              }
            });

            return {
              ch0: bandsData.ch0,
              ch1: bandsData.ch1,
              ch2: bandsData.ch2,
              ch3: bandsData.ch3,
            };
          });
        });

        window.multicastBands$.connect();
      }
    }
  }

  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <ButtonGroup>
            <Button
              primary
              disabled={connectionStatus.connected}
              onClick={() => {
                connect("muse");
              }}
            >
              {connectionStatus.connected && connectionStatus.type === "muse"
                ? "Connected"
                : generalTranslations.connectMuse}
            </Button>
            <Button
              primary
              disabled={connectionStatus.connected}
              onClick={() => {
                connect("mock");
              }}
            >
              {connectionStatus.connected && connectionStatus.type === "mock"
                ? "Connected"
                : generalTranslations.connectMock}
            </Button>
            <Button
              destructive
              onClick={() => window.location.reload()}
              primary={!connectionStatus.connected}
              disabled={!connectionStatus.connected}
            >
              {generalTranslations.disconnect}
            </Button>
          </ButtonGroup>
        </Stack>
      </Card>

      <Animate data={channelData} />
    </React.Fragment>
  );
}
