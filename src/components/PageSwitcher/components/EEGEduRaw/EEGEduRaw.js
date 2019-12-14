import React from "react";

import { TextContainer, Card, Stack } from "@shopify/polaris";

import { Line } from "react-chartjs-2";
import { channelNames } from "muse-js";

import { chartStyles, generalOptions } from "../chartOptions";

import * as generalTranslations from "../translations/en";
import * as specificTranslations from "./translations/en";

export default function EEGEduRaw(channels) {
  function renderCharts() {
    return Object.values(channels.data).map((channel, index) => {
      const options = {
        ...generalOptions,
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...generalOptions.scales.xAxes[0].scaleLabel,
                labelString: specificTranslations.xlabel
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...generalOptions.scales.yAxes[0].scaleLabel,
                labelString: specificTranslations.ylabel
              },
              ticks: {
                max: 300,
                min: -300
              }
            }
          ]
        },
        elements: {
          line: {
            borderColor: 'rgba(' + channel.datasets[0].qual*10 + ', 128, ' + channel.datasets[0].qual*10  +')',
            fill: false
          },
          point: {
            radius: 0
          }
        },
        animation: {
          duration: 0
        },
        title: {
          ...generalOptions.title,
          text: generalTranslations.channel + channelNames[index] + '---- SD: ' + channel.datasets[0].qual 
        }
      };

      return (
        <Card.Section key={"Card_" + index}>
          <Line key={"Line_" + index} data={channel} options={options} />
        </Card.Section>
      );
    });
  }

  return (
    <Card title={specificTranslations.title}>
      <Card.Section>
        <Stack>
          <TextContainer>
            <p>{specificTranslations.description}</p>
          </TextContainer>
        </Stack>
      </Card.Section>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}
