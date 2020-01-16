 export default function sketchEvoked (p) {

 let x = 0;
 let thisRand = 0.5; //for random choice of target type
 let targProp = 0.25;
 let isTarget = false;
 let ellapsedTime = 0;
 let nextDelay = 1000;
 let newOnset = true;
 let startTime = 0;
 let targCount = 0;
 let waitForStim = 0;

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

    x = x+1;

    if (waitForStim == 1){
      if (p.millis() - startTime > 500){
        waitForStim = 0;
        p.background(255);
        ellapsedTime = p.millis()-startTime;
        p.fill(255, 255, 255);
        window.marker = 0;
        p.ellipse(p.width/2, p.height/2, 300);
        p.fill(255,0,0);
        p.text("+", p.width/2, p.height/2);
      }
    } else {
      p.background(255);
      ellapsedTime = p.millis()-startTime;

      if (ellapsedTime > nextDelay) {
        newOnset = true;
      } else {
        newOnset = false;
      }

      if (newOnset) {
        targCount++;
        nextDelay = 1500 + p.int(p.random() * 1000);
        //console.log(targCount, nextDelay)

        startTime = p.millis();
        waitForStim = 1;

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
    }.
  }
};