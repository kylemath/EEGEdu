import p5 from "p5";
import "p5/lib/addons/p5.sound";


export default function sketchTone (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let osc, envelope, fft;

  let scaleArray = [50, 50, 50, 50];
  let note = 0;

  p.setup = function () {
    p.createCanvas(710, 200);
    osc = new p5.SinOsc();
    // Instantiate the envelope
    envelope = new p5.Env();
    // set attackTime, decayTime, sustainRatio, releaseTime
    envelope.setADSR(0.001, 0.5, 0.1, 0.5);
    // set attackLevel, releaseLevel
    envelope.setRange(1, 0);
    osc.start();
    fft = new p5.FFT();
    p.noStroke();
  };

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = props.delta;
    theta = props.theta;
    alpha = props.alpha;
    beta = props.beta;
    gamma = props.gamma;
  };

  p.draw = function () {
    p.background(20);

    if (p.frameCount % Math.floor(alpha)*100 === 0 || p.frameCount === 1) {
      let midiValue = scaleArray[note];
      let freqValue = p.midiToFreq(midiValue);
      osc.freq(freqValue);

      envelope.play(osc, 0, 0.1);
      note = (note + 1) % scaleArray.length;
    }

    let spectrum = fft.analyze();
    for (let i = 0; i < spectrum.length / 20; i++) {
      p.fill(spectrum[i], spectrum[i] / 10, 0);
      let x = p.map(i, 0, spectrum.length / 20, 0, p.width);
      let h = p.map(spectrum[i], 0, 255, 0, p.height);
      p.rect(x, p.height, spectrum.length / 20, -h);
    }
  };
};