// Alpha Wave Flower Visualization with Pulse Animation
let waves = [];

function setup() {
  colorMode(HSB, 360, 100, 100);
  noFill();
}

function draw() {
  background(200, 10, 10, 0.05);

  // Add new flower when alpha waves are calm
  if (frameCount % 15 === 0 && eegData.alpha > 0.05) {
    waves.push({
      x: width / 2,
      y: height / 2,
      r: 5,
      alpha: eegData.alpha, // Uses live EEG alpha input
      hue: map(eegData.alpha, 0, 1, 200, 330), // colour shifts from cool blue to warm pink 
      pulse: random(TWO_PI) // phase offset for petal animation
    });
  }

  // Draw and update flowers
  for (let i = waves.length - 1; i >= 0; i--) {
    let w = waves[i];

    // Petal pulsing animation (gentle breathing effect)
    let pulseScale = 1 + 0.1 * sin(frameCount * 0.1 + w.pulse);

    stroke(w.hue, 80, 100, w.alpha * 1.5); // alpha controls transparency
    strokeWeight(2);

    // Draw flower shape using polar coordinates
    beginShape();
    for (let angle = 0; angle < TWO_PI; angle += 0.1) {
      let petalFactor = sin(8 * angle); // 8 petals per flower
      let radius = w.r * pulseScale * (1 + 0.3 * petalFactor); // Modulate radius for petals
      let x = w.x + radius * cos(angle);
      let y = w.y + radius * sin(angle);
      vertex(x, y);
    }
    endShape(CLOSE);

    // Grow and fade
    w.r += w.alpha * 5 + 1; // grows faster with stronger alpha
    w.alpha *= 0.97;	    // fade over time

    // Remove faded flowers
    if (w.alpha < 0.01) {
      waves.splice(i, 1);
    }
  }
}
