import p5 from 'p5'
import "p5/lib/addons/p5.sound";

export default function sketchMic (p) {
  
  let raw;
  let binCount
  let mic;
  let micLevel;
  let x; 
  let i;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 400);
    p.noStroke();
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
        }
        micLevel = mic.getLevel();
        p.fill(250,150,250);
        p.ellipse(p.width-i, p.constrain(p.height-(raw+500)*p.height/1000, 0, p.height), 10)
        p.fill(150,250,250);
        p.ellipse(p.width-i, p.constrain(p.height-micLevel*p.height*10, 0, p.height), 10)
        console.log(raw)

    }
    
  }
};