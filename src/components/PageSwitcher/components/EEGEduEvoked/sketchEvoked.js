export default function sketchEvoked (p) {

 let x = 0;
 let thisRand = 0.5; //for random choice of target type
 let targProp = 0.25;
 let isTarget = false;
 

 p.setup = function () {
    p.createCanvas(300, 300);
    p.frameRate(30);
    p.noStroke();

  };

  p.windowResized = function() {
    p.createCanvas(300, 300);
  }

  p.touchStarted = function() {
  if (window.touchMarker === 0) {
    window.touchMarker = 255;
  } else {
    window.touchMarker = 0;
  }
}

  p.draw = function () {

    if (p.keyIsPressed === true) {
      window.responseMarker = p.keyCode;
    } else {
      window.responseMarker = 0;
    }
    p.background(255);
    x = x+1;
    // var num = int(random(0, 11));
    if (x % 20 === 0) { // When a target shown (every ith frame for now)

      thisRand = p.random();
      if (thisRand < targProp) { // targets 20% of the time
        isTarget = true;
      } else {
        isTarget = false;
      }

      if (isTarget) {   
        p.fill(250, 150, 150);  
        window.marker = 20;  
      } else {
        p.fill(150,150,250);
        window.marker = 10;
      }

    } else { // during time between targets 
      p.fill(255, 255, 255);
      window.marker = 0;
    }
    p.ellipse(p.width/2, p.height/2, 300);
    p.fill(255,0,0);
    p.text("+", p.width/2, p.height/2);
  }

};