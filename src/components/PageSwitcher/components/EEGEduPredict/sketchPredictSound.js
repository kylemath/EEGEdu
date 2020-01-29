import p5 from "p5";
import "p5/lib/addons/p5.sound";


 export default function sketchPredict (p) {

  let label;
  let confidence;
  let osc;
  let soundOn = false;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 300);
    p.background(255);
    osc = new p5.Oscillator();
    osc.setType('sine');
  };

  p.startSound = function () {
    osc.freq(262);
    osc.amp(0);
    osc.start();
  }

  p.mouseClicked = function () {
    if (p.mouseX > 1 && p.mouseX < p.windowWidth*.6 && p.mouseY > 1 && p.mouseY < 300) {
      if (soundOn) {
        osc.amp(0, .05)
        osc.stop();
        soundOn = false;
      } else {
        p.startSound();
        soundOn = true;
      }
    }
  }

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.6, 300);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    label = props.label;
    confidence = props.confidences[label];
  };

  p.draw = function () {
    p.fill(0);
    p.strokeWeight(5);
    if (label === 'A') {
      if (confidence > .5) {
        p.fill(120, 120, 250);
        osc.amp(1, .1);
        osc.freq(262);
      } else {
        p.fill(60, 60, 1250);
        osc.amp(.5, .1);
        osc.freq(262);
      }
    } else if (label === 'B') {
      if (confidence > .5) {
        p.fill(120, 250, 120);  
        osc.amp(1, .1);
        osc.freq(327.5);
      } else {
        p.fill(60, 125, 60);
        osc.amp(.5, .1)
        osc.freq(327.5);
      }
    } else {
      if (confidence > .5) {
        p.fill(250, 120, 120);  
        osc.amp(1, .1);
        osc.freq(393);
      } else {
        p.fill(125, 60, 60);
        osc.amp(.5, .1)
        osc.freq(393);
      }

    }
    p.rect(20,20,p.windowWidth*.5,200);

  }
};