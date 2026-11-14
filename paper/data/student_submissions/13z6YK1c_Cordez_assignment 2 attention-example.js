// Defining variables

/* defines the velocity range; we will be shifting these values as the beta waves shift */
var low_v
var high_v 

var hue;

let drops = [];



// Attention meter
function setup() {
  colorMode(HSB, 360, 100, 100);
      
  low_v = 6;
  high_v = 7;
  
  hue = map(eegData.attention, 0, 1, 0, 120);  
  
  createDrops();
}



function draw() {
  background(0, 0, 10);
  
  // Attention bar
  let barWidth = width * 0.8;
  let barHeight = 30;
  let x = (width - barWidth) / 2;
  let y = (height / 4) * 3;
  
  // Background bar
  fill(20);
  noStroke();
  rect(x, y, barWidth, barHeight);

  // Attention level
  let attentionWidth = barWidth * eegData.attention;
  hue = map(eegData.attention, 0, 1, 0, 120);  
  fill(hue, 80, 90);
  rect(x, y, attentionWidth, barHeight);
  
  // Text: "ATTENTION" label
  fill(100);  // colour of text
  textAlign(RIGHT);
  textSize(15);
  text("ATTENTION", width / 4, height / 5);
  
  // Text: attention % 
  // modified text colour so that it changes with the bar and rain
  fill(hue, 80, 900);
  textAlign(RIGHT);
  textSize(40);
  text((eegData.attention * 100).toFixed(1) + "%", width / 3.5, (height / 5) + 40);
  
  // Loop rainfall
  rainFall();
  
  // Updates the velocity range of the raindrops 
  updateVelocity();
}



/***
* Creates each raindrop with randomized x position, velocity, lengths, and thickness.
***/
function createDrops() {
  // it's always the same drops created from the start falling across the screen as no new drops are created after; this function is only called once, in setup()
  for (let i = 0; i < 50; i++) {
    drops[i] = new Raindrop(); 
  }
}



/***
* The raining animation is looped.
***/
function rainFall() {
  for (let i of drops) {
    i.show();
    i.fall();
  }
}



/***
 * Updates the lowest speed and the highest speed of raindrop fall based on shifts in the beta wave values. 
 ***/
function updateVelocity() {
  if (eegData.beta > 0.5 && high_v <= 15) {
    // while eegData.beta is closer to 1, increase range as long as it is not larger than 25
    high_v += eegData.beta;
    low_v += eegData.beta;
  } else if (eegData.beta < 0.5 && low_v >= 0.5) {
    // while eegData.beta is closer to 0, decrease range as long as it is not smaller than 0.5
    low_v -= eegData.beta;
    high_v -= eegData.beta;
  } else {  // eegData.beta == 0.5
    // set back to defaults
    low_v = 6;
    high_v = 7;
  }
}



class Raindrop {
  
  /*** 
  The constructor method of the class Rain(), defining each drop instance's:
    - x: horizontal position 
    - y: vertical position
    - vel: vertical speed of the fall 
    - h: height 
    - w: thickness 
  ***/
  constructor() {
    this.x = random(width);  
    this.y = random(0, -height);
    this.vel = random(low_v, high_v);  
    this.h = random(8, 30);
    this.w = random(1, 4);
  }
  
  /* Draws each raindrop. */
  show() {
    stroke(hue, 40, 60); // drops have the same colour shifts as the bar & percentage, but are lower in saturation and darker in shade
    strokeWeight(this.w);
    line(this.x, this.y, this.x, this.y + this.h);  
  }
  
  /* Handles fall of the raindrop; calls update() when it moves out of range. */
  fall() {
    this.y = this.y + this.vel;
     
    if (this.y > height) {
      this.update();
    }
  }
  
  /* Re-randomize all of the drop's characteristics */
  update() {
    this.x = random(width);
    this.y = random(0, -height);  // sets the raindrop back at the top
    this.vel = random(low_v, high_v);
    this.h = random(8, 30);
    this.w = random(1, 4);
  }
}
