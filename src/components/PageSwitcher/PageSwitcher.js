import React, { useState } from "react";
import { Card, Stack, Button, ButtonGroup } from "@shopify/polaris";
import { Animate } from "./components/EEGEduAnimate/EEGEduAnimate";

import * as generalTranslations from "./components/translations/en";

export function PageSwitcher() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    type: undefined,
  });

  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <ButtonGroup>
            <Button
              primary
              disabled={connectionStatus.connected}
              onClick={() => {
                setConnectionStatus({ connected: true, type: "muse" });
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
                setConnectionStatus({ connected: true, type: "mock" });
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
      <Animate status={connectionStatus} />
    </React.Fragment>
  );
}
