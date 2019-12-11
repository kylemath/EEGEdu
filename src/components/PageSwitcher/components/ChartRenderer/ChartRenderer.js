import React from "react";

import { TextContainer, Card, Stack } from "@shopify/polaris";

import { channelNames } from "muse-js";
import { Line } from "react-chartjs-2";

import { chartStyles, rawOptions, spectraOptions } from "./options";

import * as generalTranslations from "../../translations/en";
import * as chartTranslations from "./translations/en";

export default function ChartRenderer(chart) {
  function renderCharts() {
    return Object.values(chart.channels).map((channel, index) => {
      let options;

      switch (chart.type) {
        case generalTranslations.types.raw:
          options = rawOptions;
          break;
        case generalTranslations.types.spectra:
          options = spectraOptions;
          break;
        default:
          console.log("Error on ChartRenderer. Couldn't switch to: " + chart);
      }

      options = {
        ...options,
        title: {
          text: generalTranslations.channel + channelNames[index]
        }
      };

      return (
        <Card.Section key={"Card_" + index}>
          <Line key={"Line_" + index} data={channel} options={options} />
        </Card.Section>
      );
    });
  }

  function translate(value) {
    switch (chart.type) {
      case generalTranslations.types.raw:
        return chartTranslations.charts.raw[value];
      case generalTranslations.types.spectra:
        return chartTranslations.charts.spectra[value];
      default:
        console.log(
          "Error on translate. Couldn't translate: " +
            value +
            " with in chart type " +
            chart.type
        );
    }
  }

  return (
    <Card title={translate("title")}>
      <Card.Section>
        <Stack>
          <TextContainer>
            <p>{translate("description")}</p>
          </TextContainer>
        </Stack>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}
