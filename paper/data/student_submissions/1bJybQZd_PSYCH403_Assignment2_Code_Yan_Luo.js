// Fully dynamic EEG-responsive mandala + snake + fruit
// Layers grow and spin with attention, mandala breathes with beta waves.

let angle = 0;

// Snake variables
let gridWidth = 30;
let gridHeight = 30;
let startingSegments = 10;
let xStart = 0;
let yStart = 15;
let segments = [];
let score = 0;

// Fruit variables
let fruit;
let fruitAlpha = 0;
let fadeSpeed = 0.05;

// --- Vector helpers since p5.Vector is not available ---
function vec(x, y) {
  return { x: x, y: y };
}
function copyVec(v) {
  return { x: v.x, y: v.y };
}
function distVec(a, b) {
  let dx = a.x - b.x;
  let dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function setup() {
  colorMode(HSB, 360, 100, 100);
  textAlign(CENTER, CENTER);

  // Initialize snake
  segments = [];
  for (let x = xStart; x < xStart + startingSegments; x++) {
    segments.unshift(vec(x, yStart));
  }

  // Initialize fruit
  fruit = vec(floor(random(gridWidth)), floor(random(gridHeight)));
  fruitAlpha = 0;
}

function draw() {
  background(0, 0, 0, 0.05);

  // Extract EEG values safely
  let attention = eegData.attention || 50;
  let beta = eegData.beta || 50; 
  
  // --- Mandala ---
  push();
  translate(width / 2, height / 2);

  // Layers grow with attention (2–10 layers)
  let layers = floor(map(attention, 0, 100, 2, 10));

  // Breathing effect with beta (pulsing radius)
  let breath = sin(frameCount * 0.05 + beta * 0.02) * map(beta, 0, 100, 5, 40);

  for (let layer = 0; layer < layers; layer++) {
    // Base radius expands/contracts with breathing
    let baseRadius = 50 + layer * 40 + breath * (layer * 0.2);
    let points = 6 + layer * 2;

    for (let i = 0; i < points; i++) {
      let a = angle + (TWO_PI / points) * i;
      let x = cos(a) * baseRadius;
      let y = sin(a) * baseRadius;

      // Color dynamics
      let hue = (angle * 57.3 + layer * 60 + attention * 2) % 360;
      let brightness = 40 + attention * 0.6;
      let size = 5 + beta * 0.05 * (layer + 1);

      fill(hue, 80, brightness, 0.7);
      noStroke();
      ellipse(x, y, size);
    }
  }
  pop();

  // --- Mandala rotation speed controlled by attention ---
  let rotationSpeed = map(attention, 0, 100, 0.005, 0.05);
  angle += rotationSpeed;

  // --- Snake ---
  push();
  scale(width / gridWidth, height / gridHeight);
  translate(0.5, 0.5);

  let head = copyVec(segments[0]);

  // Move toward fruit using attention
  let dx = fruit.x - head.x;
  let dy = fruit.y - head.y;
  let mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }

  // Attention controls snake speed
  let step = map(attention, 0, 100, 0.2, 1.5);
  head.x += dx * step;
  head.y += dy * step;

  // Keep inside grid
  head.x = constrain(head.x, 0, gridWidth - 1);
  head.y = constrain(head.y, 0, gridHeight - 1);

  segments.unshift(head);
  while (segments.length > startingSegments) segments.pop();

  // Fruit collision
  if (distVec(head, fruit) < 1) {
    score++;
    startingSegments++;
    fruit = vec(floor(random(gridWidth)), floor(random(gridHeight)));
    fruitAlpha = 0; // reset fade-in
  }

  // Fade-in fruit
  if (fruitAlpha < 1) fruitAlpha += fadeSpeed;

  // Snake with attention-based glow
  let snakeHue = map(attention, 0, 100, 120, 160);
  let snakeBrightness = map(attention, 0, 100, 50, 100);
  let snakeStrokeWeight = map(attention, 0, 100, 0.5, 0.8);
  stroke(snakeHue, 255, snakeBrightness);
  strokeWeight(snakeStrokeWeight);
  noFill();
  beginShape();
  for (let s of segments) vertex(s.x, s.y);
  endShape();

  // Fruit
  stroke(20, 100, 100, fruitAlpha);
  strokeWeight(0.8);
  point(fruit.x, fruit.y);

  pop();

  // Draw score
  noStroke();
  fill(255);
  textSize(16);
  text(`Score: ${score}`, width / 2, 20);
}
