import React, { useState, useCallback } from "react";

import { Select, Card, Stack, Button } from "@shopify/polaris";

import EEGEduRaw from "./components/EEGEduRaw/EEGEduRaw";
import EEGEduSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

import * as translations from "./translations/en.json";
import { MuseClient } from "muse-js";
import * as generalTranslations from "./components/translations/en";

export function PageSwitcher() {
  const [status, setStatus] = useState(generalTranslations.connect);
  const [selected, setSelected] = useState(translations.types.raw);
  const handleSelectChange = useCallback(value => setSelected(value), []);
  const options = [
    { label: translations.types.raw, value: translations.types.raw },
    { label: translations.types.spectra, value: translations.types.spectra }
  ];

  function renderCharts() {
    switch (selected) {
      case translations.types.raw:
        return <EEGEduRaw />;
      default:
        return <EEGEduSpectra />;
    }
  }

  async function connect() {
    window.museClient = new MuseClient();

    try {
      await window.museClient.connect();
      await window.museClient.start();
      setStatus(generalTranslations.connected);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <React.Fragment>
      <Card sectioned>
        <Stack>
          <Button
            primary={status === generalTranslations.connect}
            disabled={status === generalTranslations.connected}
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
