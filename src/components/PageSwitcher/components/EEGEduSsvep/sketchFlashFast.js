export default function sketchFlash (p) {


  const freq = 11; 
  let x = 0;
  let startTime = 0;
  let newOnset = true;
  const delay = 1000/freq;

  p.setup = function () {
    p.createCanvas(300, 300);
    p.frameRate(60);
  };

  p.windowResized = function() {
    p.createCanvas(300, 300);
  }


  p.mousePressed = function () {
    p.background(256);
  }

  p.draw = function () {
    p.background(255);
    x = x+1;
    if ((p.millis() - startTime) > delay) {
      newOnset = true;
    } else {
      newOnset = false;
    }
    if (newOnset) {
      p.fill(0, 0, 0);
      startTime = p.millis();  
    } else {
      p.fill(255, 255, 255);
    }
    p.noStroke();
    p.ellipse(p.width/2, p.height/2, 300);
    p.fill(255,0,0);
    p.text("+", p.width/2, p.height/2);
  }
};