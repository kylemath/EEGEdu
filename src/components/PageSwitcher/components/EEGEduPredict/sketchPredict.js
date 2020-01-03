export default function sketchPredict (p) {

  let x = 0;

  p.setup = function () {
    p.createCanvas(300, 300);
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
    if (x % 5 === 0) {
      p.fill(0, 0, 0);  
    } else {
      p.fill(255, 255, 255);
    }
    p.noStroke();
    p.ellipse(p.width/2, p.height/2, 300);
    p.fill(255,0,0);
    p.text("+", p.width/2, p.height/2);
  }
};