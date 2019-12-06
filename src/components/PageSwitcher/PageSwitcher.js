import React, { useState, useCallback } from "react";
import { Select, Card } from "@shopify/polaris";
import EEGEduRaw from "./components/EEGEduRaw/EEGEduRaw";
import EEGEduSpectra from "./components/EEGEduSpectra/EEGEduSpectra";

export function PageSwitcher() {
  const [selected, setSelected] = useState("Raw");

  const handleSelectChange = useCallback(value => setSelected(value), []);

  const options = [
    { label: "Raw", value: "Raw" },
    { label: "Spectra", value: "Spectra" }
  ];

  function renderCharts() {
    switch (selected) {
      case "Raw":
        return <EEGEduRaw />;
      default:
        return <EEGEduSpectra />;
    }
  }

  return (
    <React.Fragment>
      <Card title={"Choose your data type"} sectioned>
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
