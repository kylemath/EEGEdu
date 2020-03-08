import React from "react";
import { TextContainer, Card, Stack, } from "@shopify/polaris";
import { Line } from "react-chartjs-2";
import { channelNames } from "muse-js";
import { chartStyles, generalOptions } from "../../utils/chartOptions";
import * as specificTranslations from "./translations/en";

export function RenderModule(channels) {
  function renderCharts() {
  
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
              max: 10,
              min: 0
            }
          }
        ]
      },
      elements: {
        point: {
          radius: 3
        }
      },
      title: {
        ...generalOptions.title,
        text: 'Spectra data from each electrode'
      },
      legend: {
        display: true
      }
    };


    if (channels.data.ch3.datasets[0].data) {
      const newData = {
        datasets: [{
          label: channelNames[0],
          borderColor: 'rgba(217,95,2)',
          data: channels.data.ch0.datasets[0].data,
          fill: false
        }, {
          label: channelNames[1],
          borderColor: 'rgba(27,158,119)',
          data: channels.data.ch1.datasets[0].data,
          fill: false
        }, {
          label: channelNames[2],
          borderColor: 'rgba(117,112,179)',
          data: channels.data.ch2.datasets[0].data,
          fill: false
        }, {
          label: channelNames[3],
          borderColor: 'rgba(231,41,138)',
          data: channels.data.ch3.datasets[0].data,
          fill: false  
        }, {
          label: channelNames[4],
          borderColor: 'rgba(20,20,20)',
          data: channels.data.ch4.datasets[0].data,
          fill: false  
        }],
        xLabels: channels.data.ch0.xLabels
      }

      return (
        <Card.Section key={"Card_" + 1}>
          <Line key={"Line_" + 1} data={newData} options={options} />
        </Card.Section>
      );
    } else {
      return (
        <Card.Section>
          <Stack>
            <TextContainer>
              <p>{'Connect the device above to see the plot'}</p>
            </TextContainer>
          </Stack>
        </Card.Section>
      )
    }
  }

  return (
    <Card title={specificTranslations.title}>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
    </Card>
  );
}

