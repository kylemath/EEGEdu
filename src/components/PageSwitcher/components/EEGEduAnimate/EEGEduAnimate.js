import React, { useState, useCallback } from "react";

import { Card, Button, ButtonGroup } from "@shopify/polaris";

import { chartStyles } from "../chartOptions";

import Sketch from "react-p5";

import styled from "styled-components";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";

import theme from "./p5Theme";

export const settings = {
  cutOffLow: 2,
  cutOffHigh: 20,
  nbChannels: 4,
  interval: 16,
  bins: 256,
  duration: 128,
  srate: 256,
};

export function Animate(channels) {
  function RenderCharts() {
    const [sketchPop, setSketchPop] = useState(false);
    const sketchPopChange = useCallback(() => setSketchPop(!sketchPop), [
      sketchPop,
    ]);

    window.headerProps = {
      delta: 0,
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      textMsg: "No data.",
    };

    return Object.values(channels.data).map((channel, index) => {
      //only left frontal channel
      if (index === 1) {
        if (channel.datasets[0].data) {
          window.delta = channel.datasets[0].data[0];
          window.theta = channel.datasets[0].data[1];
          window.alpha = channel.datasets[0].data[2];
          window.beta = channel.datasets[0].data[3];
          window.gamma = channel.datasets[0].data[4];

          window.headerProps = {
            delta: 10 * window.delta,
            theta: 10 * window.theta,
            alpha: 10 * window.alpha,
            beta: 10 * window.beta,
            gamma: 10 * window.gamma,
            textMsg: "Data Recieved.",
          };
        }
        const brain = window.headerProps;
        const scope = { styled, brain, React, Sketch };
        const code = `class MySketch extends React.Component {
  setup(p5, whereToPlot) {
    p5.createCanvas(500, 500, p5.WEBGL).parent(whereToPlot)
  }
  draw(p5) {
    HEIGHT = p5.height
    WIDTH = p5.width;
    MOUSEX = p5.mouseX;
    MOUSEY = p5.mouseY;

    DELTA = brain.delta;
    THETA = brain.theta;
    ALPHA = brain.alpha;
    BETA = brain.alpha;
    GAMMA = brain.gamma;

    //Change the code here:

    p5.background(255,200,200);
    p5.fill(0,0,0);
    p5.stroke(10,10,10);
    // p5.noStroke();
    p5.ellipse(MOUSEX-250,MOUSEY-250,DELTA*10);
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
render(
  <MySketch />
)


`;

        if (sketchPop) {
          return (
            <React.Fragment key={"dum"}>
              <ButtonGroup>
                <Button
                  onClick={() => {
                    sketchPopChange();
                  }}
                  primary={true}
                  disabled={false}
                >
                  {"Run Code and Show Sketch"}
                </Button>
              </ButtonGroup>
              <LiveProvider
                code={code}
                scope={scope}
                noInline={true}
                theme={theme}
              >
                <LiveEditor />
                <LiveError />
                <LivePreview />
              </LiveProvider>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={"dum"}>
              <ButtonGroup>
                <Button
                  onClick={() => {
                    sketchPopChange();
                  }}
                  primary={true}
                  disabled={false}
                >
                  {"Run Code and Show Sketch"}
                </Button>
              </ButtonGroup>
              <LiveProvider
                code={code}
                scope={scope}
                noInline={true}
                theme={theme}
              >
                <LiveEditor />
              </LiveProvider>
            </React.Fragment>
          );
        }
      } else {
        // if single channel
        return null;
      }
    });
  }

  return (
    <Card>
      <Card.Section>
        <div style={chartStyles.wrapperStyle.style}>{RenderCharts()}</div>
      </Card.Section>
    </Card>
  );
}
