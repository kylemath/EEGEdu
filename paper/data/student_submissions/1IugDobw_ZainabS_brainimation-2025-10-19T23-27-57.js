// 🧠 BrainImation: Live EEG + P5.js
// Blue Calm → Red Explosion + Fragments + Expanding Galaxy
// - Meditation high → blue calm + smiley faces + stars grow larger
// - Attention high → red explosion + fragments
// - Dynamic galaxy background with nebula + twinkling stars

let particles = [];
let fragments = [];
let bgStars = [];
let time = 0;

function setup() {
  colorMode(HSB, 360, 100, 100, 1);

  // Floating EEG-reactive stars
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: random(width),
      y: random(height),
      vx: random(-1, 1),
      vy: random(-1, 1),
      shimmerOffset: random(1000)
    });
  }

  // Background galaxy stars
  for (let i = 0; i < 300; i++) {
    bgStars.push({
      x: random(width),
      y: random(height),
      brightness: random(60, 100),
      size: random(0.5, 2),
      twinkleSpeed: random(0.01, 0.05),
      phase: random(TWO_PI)
    });
  }
}

function draw() {
  // ✨ Galaxy backdrop
  drawNebula();
  drawBackgroundStars();

  time += 0.01;
  let explosionForce = map(eegData.attention, 0, 1, 0, 20);

  for (let p of particles) {
    // Movement influenced by alpha & beta
    let alphaForce = eegData.alpha * 2;
    let betaForce = eegData.beta * 3;
    p.vx += random(-alphaForce - betaForce, alphaForce + betaForce) * 0.01;
    p.vy += random(-alphaForce - betaForce, alphaForce + betaForce) * 0.01;

    // 💥 Explosion kick from attention
    if (explosionForce > 5) {
      let angle = random(TWO_PI);
      p.vx += cos(angle) * explosionForce * 0.05;
      p.vy += sin(angle) * explosionForce * 0.05;
    }

    // Damping and update
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.x += p.vx;
    p.y += p.vy;

    // Wrap edges
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // 🌈 Color transition
    let meditationHue = 210; // blue calm
    let attentionHue = 0;    // red focus
    let hueVal = lerp(meditationHue, attentionHue, eegData.attention);
    let satVal = lerp(30, 90, max(eegData.meditation, eegData.attention));
    let brightVal = 100;

    // ✨ Shimmer with meditation
    let shimmer = 0;
    if (eegData.meditation > 0.8) shimmer = sin(time * 5 + p.shimmerOffset) * 10;

    fill(hueVal, satVal, brightVal + shimmer, 0.9);
    noStroke();

    // 🌌 Size increases with meditation + theta
    let baseSize = 5 + eegData.theta * 15;
    let meditationGrowth = map(eegData.meditation, 0, 1, 1, 1.8); // grow up to 1.8×
    let size = baseSize * meditationGrowth;

    drawStar(p.x, p.y, size / 2.5, size, 5);

    // 😊 Smiley faces when very calm
    if (eegData.meditation > 0.9) drawSmiley(p.x, p.y, size * 0.6);

    // 💥 Explosion fragments when attention maxed
    if (eegData.attention > 0.95 && random() < 0.1) createExplosion(p.x, p.y, hueVal);

    // Connection lines fade with attention
    for (let p2 of particles) {
      let d = dist(p.x, p.y, p2.x, p2.y);
      if (d < 80) {
        let alphaLine = map(d, 0, 80, 0.5, 0) * eegData.alpha * (1 - eegData.attention);
        stroke(hueVal, satVal, 100, alphaLine);
        strokeWeight(1);
        line(p.x, p.y, p2.x, p2.y);
      }
    }
  }

  // 🌠 Fragments from explosions
  for (let i = fragments.length - 1; i >= 0; i--) {
    let f = fragments[i];
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.97;
    f.vy *= 0.97;
    f.life -= 0.02;
    fill(f.hue, 80, 100, f.life);
    noStroke();
    ellipse(f.x, f.y, 4);
    if (f.life <= 0) fragments.splice(i, 1);
  }

  // Info text
  if (!eegData.connected) {
    fill(0, 0, 100, 0.9);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("Connect your Muse headset or use 'Simulate Data'", width / 2, height / 2 - 10);
    textSize(16);
    fill(0, 0, 80, 0.7);
    text("↑ Meditation = calm blue expanding galaxy 🌌 | ↑ Attention = red explosion 💥", width / 2, height / 2 + 20);
  }
}

// 🌌 Nebula glow: drifting cosmic mist
function drawNebula() {
  noStroke();
  for (let i = 0; i < 3; i++) {
    let hue = [260, 300, 200][i];
    let x = width / 2 + sin(time * 0.1 + i) * width * 0.3;
    let y = height / 2 + cos(time * 0.1 + i) * height * 0.3;
    let size = width * 1.2;
    fill(hue, 50, 40, 0.05);
    ellipse(x, y, size);
  }
}

// 🌠 Background twinkling stars
function drawBackgroundStars() {
  noStroke();
  for (let s of bgStars) {
    let twinkle = sin(time / 2 + s.phase) * 10;
    fill(220, 20, s.brightness + twinkle, 1);
    ellipse(s.x, s.y, s.size);
  }
}

// ⭐ Draw a 5-pointed star
function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// 😊 Draw a simple smiley face
function drawSmiley(x, y, s) {
  push();
  translate(x, y);
  fill(60, 30, 100, 1); 
  ellipse(0, 0, s);
  fill(0, 0, 0);
  ellipse(-s * 0.2, -s * 0.15, s * 0.1);
  ellipse(s * 0.2, -s * 0.15, s * 0.1);
  noFill();
  stroke(0, 0, 0);
  strokeWeight(1);
  arc(0, s * 0.05, s * 0.5, s * 0.3, 0, PI);
  pop();
}

// 💥 Create glowing debris fragments
function createExplosion(x, y, hueVal) {
  for (let i = 0; i < 10; i++) {
    fragments.push({
      x: x,
      y: y,
      vx: random(-3, 3),
      vy: random(-3, 3),
      life: 1.0,
      hue: hueVal
    });
  }
}
