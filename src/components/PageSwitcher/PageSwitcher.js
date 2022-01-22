import React, { useState, useCallback } from "react";
import { MuseClient } from "muse-js";
import { Select, Card, Stack, Button, ButtonGroup } from "@shopify/polaris";

import { mockMuseEEG } from "./utils/mockMuseEEG";

import * as translations from "./translations/en.json";
import * as generalTranslations from "./components/translations/en";
import { emptyChannelData } from "./components/chartOptions";

import * as funAnimate from "./components/EEGEduAnimate/EEGEduAnimate"

import { messageService, subscriber } from './utils/messageService';

const animate = translations.types.animate;

export function PageSwitcher() {

  // data pulled out of multicast$
  const [animateData, setAnimateData] = useState(emptyChannelData);
  // pipe settings
  const [animateSettings, setAnimateSettings] = useState(funAnimate.getSettings);
  // connection status
  const [status, setStatus] = useState(generalTranslations.connect);

  // for picking a new module
  // this is where the STARTING TAB value is set
  const [selected, setSelected] = useState(animate);

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

        funAnimate.buildPipe(animateSettings);
        funAnimate.setup(setAnimateData, animateSettings)

      }
  }

  function refreshPage(){
    window.location.reload();
  }

  function pipeSettingsDisplay() {
    return (
      <Card title={selected + ' Settings'} sectioned>
        {funAnimate.renderSliders(setAnimateData, setAnimateSettings, status, animateSettings)}
      </Card>
    );
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
      
{/*      {pipeSettingsDisplay()}
*/}      {renderCharts()}
    </React.Fragment>
  );
}
