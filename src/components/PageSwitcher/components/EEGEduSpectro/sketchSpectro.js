import "p5/lib/addons/p5.sound";

export default function sketchSpectro (p) {
  
  let spectrum;
  let binCount;
  let speed = 4;

  // canvas is global so we can copy it
  let cnv;
  
  p.setup = function () {
    cnv = p.createCanvas(p.windowWidth*.6, 400);
    p.noStroke();
    p.colorMode(p.RGB);
  };

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    spectrum = props.psd;
    binCount = props.bins;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.6, 400);
  }

  p.draw = function () {
    if (spectrum) {
      // copy the sketch and move it over based on the speed
      p.copy(cnv, 0, 0, p.width.toFixed(0), p.height.toFixed(0), -speed, 0, p.width.toFixed(0), p.height.toFixed(0));

      // iterate thru current freq spectrum
      for (let i = 0; i < binCount; i++) {
        let value;
        value = spectrum[i];

        let c = (value/5)*255;
        p.fill(c, c, c);
        let percent = i / binCount;
        let y = percent * p.height;
        p.rect(p.width - speed, p.height - y, speed, p.height / binCount);
      }
    }
  }
};