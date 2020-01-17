export default function sketchEvoked (p) {

 const targProp = 0.25;
 const stimDuration = 500;
 const minISI = 1500;
 const maxISI = 2500;

 let thisRand = 0.5; //for random choice of target type
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

    // how lnog has it been since last target onset
    ellapsedTime = p.millis()-startTime;

    if (ellapsedTime < stimDuration) {
      waitForStim = true;
    } else {
      waitForStim = false;
    }

    // If time to present next stimulus
    if (ellapsedTime > nextDelay) {
      newOnset = true;
    } else {
      newOnset = false;
    }

    // if this draw is the start of a new target onset
    if (newOnset) {

      // pick a new delay for next trial(1500-2500 ms)
      nextDelay = minISI + p.int(p.random() * (maxISI-minISI));  
      // timer for interstimulus interval
      startTime = p.millis();

      // log for testing
      targCount++; 
      console.log(targCount, nextDelay)

      // Decide if target or standard
      thisRand = p.random();
      if (thisRand < targProp) { // targets 20% of the time
        isTarget = true;
      } else {
        isTarget = false;
      }
    }

    // pick colour and assign marker number
    // if stim just came on or staying on
    if (waitForStim) {
      if (isTarget) {   
        p.fill(250, 150, 150);  
        window.marker = 20;  
      } else {
        p.fill(150,150,250);
        window.marker = 10;
      }
    // all other times
    } else {
      p.fill(255, 255, 255);
      window.marker = 0;
    }

    //actually draw the circle or blank, then fixation
    p.background(255);
    p.ellipse(p.width/2, p.height/2, 300);
    p.fill(255,0,0);
    p.text("+", p.width/2, p.height/2);
  }
};