import p5 from 'p5'
import "p5/lib/addons/p5.sound";

export default function sketchMic (p) {
  
  let raw;
  let binCount
  let mic;
  let micLevel;
  let x; 
  let i;
  let thisx;
  let thisyMic;
  let thisyMic2;
  let thisyRaw;
  let lastx;
  let lastyMic;
  let lastyMic2;
  let lastyRaw;


  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 400);
    // p.noStroke();
    p.colorMode(p.RGB);
    mic = new p5.AudioIn();
    mic.start();
    i = p.width;

  };

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    raw = props.raw;
    binCount = props.bins;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.6, 400);
  }

  p.draw = function () {
    if (raw) {
        i = i-1;
        if (i < 0) {
          i = p.width;
          p.background(255)
          lastx = 0;
        }
        thisx = p.width-i
        thisyRaw = p.constrain((p.height/2)+(raw/1.1), 0, p.height);

        p.stroke(255,0,0);
        p.line(lastx, lastyRaw, thisx, thisyRaw)

        micLevel = mic.getLevel();
        thisyMic = p.constrain((p.height/2)+(micLevel*p.height*20), 0, p.height);
        thisyMic2 = p.constrain((p.height/2)-(micLevel*p.height*20), 0, p.height);

        p.stroke(0,0,0);
        p.line(lastx, lastyMic, thisx, thisyMic);
        p.line(lastx, lastyMic2, thisx, thisyMic2);
        lastx = thisx;
        lastyMic = thisyMic;
        lastyMic2 = thisyMic2;
        lastyRaw = thisyRaw;

    }
    
  }
};