import React, { useRef } from "react";
import { Card } from "@shopify/polaris";
import { zipSamples, MuseClient } from "muse-js";
import { bandpassFilter, epoch, fft, powerByBand } from "@neurosity/pipes";
import { catchError, multicast } from "rxjs/operators";
import { Subject } from "rxjs";
import Sketch from "react-p5";
import styled from "styled-components";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";

import { mockMuseEEG } from "../../utils/mockMuseEEG";
import { chartStyles } from "../chartOptions";
import theme from "./p5Theme";

const animateSettings = {
  cutOffLow: 2,
  cutOffHigh: 20,
  nbChannels: 4,
  interval: 16,
  bins: 256,
  duration: 128,
  srate: 256,
};

export function Animate(connection) {
  const brain = useRef({
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
    textMsg: "No data.",
  });

  let channelData$;
  let pipeBands$;
  let multicastBands$;
  let museClient;

  async function connectMuse() {
    museClient = new MuseClient();
    await museClient.connect();
    await museClient.start();

    return;
  }

  async function buildBrain() {
    if (connection.status.connected) {
      if (connection.status.type === "mock") {
        channelData$ = mockMuseEEG(256);
      } else {
        await connectMuse();
        channelData$ = museClient.eegReadings;
      }

      pipeBands$ = zipSamples(channelData$).pipe(
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
        powerByBand(),
        catchError((err) => {
          console.log(err);
        })
      );

      multicastBands$ = pipeBands$.pipe(multicast(() => new Subject()));

      multicastBands$.subscribe((data) => {
        brain.current = {
          delta: 10 * data.alpha[0],
          theta: 10 * data.alpha[1],
          alpha: 10 * data.alpha[2],
          beta: 10 * data.alpha[3],
          gamma: 10 * data.alpha[4],
          textMsg: "Data received",
        };
      });

      multicastBands$.connect();
    }
  }

  buildBrain();

  function renderCharts() {
    const scope = { styled, brain, React, Sketch };
    const code = `
    class MySketch extends React.Component {
      setup(p5, whereToPlot) {
        p5.createCanvas(500, 500, p5.WEBGL).parent(whereToPlot)
      }

      draw(p5) {
        HEIGHT = p5.height
        WIDTH = p5.width;
        MOUSEX = p5.mouseX;
        MOUSEY = p5.mouseY;
        DELTA = brain.current.delta;
        THETA = brain.current.theta;
        ALPHA = brain.current.alpha;
        BETA = brain.current.alpha;
        GAMMA = brain.current.gamma;
        //Change the code here:
        p5.background(255,200,200);
        p5.fill(0,0,0);
        p5.stroke(10,10,10);
        // p5.noStroke();
        p5.ellipse(MOUSEX-250,MOUSEY-250,20);
        // p5.rect(40,120,120,40);
        // p5.triangle(30,10,32,10,31,8);
        // p5.translate();
        // p5.rotate();
        //Done change below here
      }

      render() {
        return (
           <Sketch setup={this.setup} draw={this.draw} />
        )
      }

    }

    render (
      <MySketch />
    )
    `;

    return (
      <LiveProvider code={code} scope={scope} noInline={true} theme={theme}>
        <LiveEditor />
        <LiveError />
        <LivePreview />
      </LiveProvider>
    );
  }

  return (
    <Card title="Animate your brain waves">
      <Card.Section>
        <p>
          The code below is editable. Play around with the numbers and see what
          happens. The Alpha, Beta, Gamma, Delta, Theta variables are only
          available if there is a data source connected.
        </p>
      </Card.Section>

      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{renderCharts()}</div>
      </Card.Section>
    </Card>
  );
}
