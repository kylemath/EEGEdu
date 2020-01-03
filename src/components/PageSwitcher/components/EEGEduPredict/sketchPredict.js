 export default function sketchPredict (p) {

  let psd;
  let freqs;

  p.setup = function () {
    p.createCanvas(1000, 500);
  };

  p.windowResized = function() {
    p.createCanvas(1000, 500);
  }


  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    psd = props.psd;
    freqs = props.freqs;
    // theta = props.theta;
    // alpha = props.alpha;
    // beta = props.beta;
    // gamma = props.gamma;
  };

  p.mousePressed = function () {
    p.background(256);
  }

  p.draw = function () {
    console.log(psd);
    p.background(255);
    p.fill(255,0,0);
    if (freqs) {
      for (let i = 0; i < freqs.length; i++) {
        p.point(freqs[i]*2,psd[i]*10)
      }
    } 
  }
};