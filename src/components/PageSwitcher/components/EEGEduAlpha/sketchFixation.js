export default function sketchFixation (p) {

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
    p.fill(255,0,0);
    p.text("+", p.width/2, p.height/2);

  }

};