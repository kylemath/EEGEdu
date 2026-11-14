// 🧠 EEG-Inspired BrainImation Visualization
// Calm (Meditation) → Coherent, smooth ocean & particles
// Attention → Turbulence, fragmentation, explosions

let particles = [];
let fragments = [];
let time = 0;
let dolphinX = 0;
let dolphinY = 0;

function setup() {
  colorMode(HSB, 360, 100, 100, 1);
  dolphinX = -100;
dolphinY = height * 0.6;

  // Create particles
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: random(width),
      y: random(height),
      vx: random(-1, 1),
      vy: random(-1, 1)
    });
  }
}

function draw() {
  time += 0.01;

  // 🌊 Navy-green background reacts to calm
  let bgBrightness = lerp(18, 30, eegData.meditation);
  let bgHue = lerp(190, 200, eegData.alpha);
  background(bgHue, 60, bgBrightness);

  // 🌊 EEG Ocean
  drawEEGOcean();

  drawEEGOcean();
drawDolphin();   // 🐬 ADD THIS LINE


  // ✨ Particles
  for (let p of particles) {
    // Base motion
    p.vx *= 0.98;
    p.vy *= 0.98;

    // Meditation = smooth drift
    p.vx += sin(time + p.y * 0.01) * eegData.alpha;
    p.vy += cos(time + p.x * 0.01) * eegData.alpha;

    // Attention = jitter
    p.vx += random(-1, 1) * eegData.beta * eegData.attention;
    p.vy += random(-1, 1) * eegData.beta * eegData.attention;

    p.x += p.vx;
    p.y += p.vy;

    // Wrap
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // Color mapping
    let hueVal = lerp(210, 0, eegData.attention);
    let satVal = lerp(30, 90, max(eegData.meditation, eegData.attention));

    // Size grows with meditation
    let size =
      (5 + eegData.theta * 15) *
      lerp(1, 1.6, eegData.meditation);

    noFill();
    stroke(hueVal, satVal, 100, 0.9);
    strokeWeight(2);
    ellipse(p.x, p.y, size, size);

    // 🔗 Coherence lines (fade with attention)
    for (let p2 of particles) {
      let d = dist(p.x, p.y, p2.x, p2.y);
      let maxDist = lerp(60, 120, eegData.meditation);
      if (d < maxDist) {
        let a = map(d, 0, maxDist, 0.4, 0) * (1 - eegData.attention);
        stroke(hueVal, satVal, 100, a);
        strokeWeight(1);
        line(p.x, p.y, p2.x, p2.y);
      }
    }

    // 💥 Explosions when attention is very high
    if (eegData.attention > 0.95 && random() < 0.05) {
      createExplosion(p.x, p.y, hueVal);
    }
  }

  // 💥 Explosion fragments
  for (let i = fragments.length - 1; i >= 0; i--) {
    let f = fragments[i];
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.96;
    f.vy *= 0.96;
    f.life -= 0.02;

    fill(f.hue, 80, 100, f.life);
    noStroke();
    ellipse(f.x, f.y, 4);

    if (f.life <= 0) fragments.splice(i, 1);
  }

  // 🧠 Info + legend
  drawLegend();

  if (!eegData.connected) {
    fill(0, 0, 100, 0.9);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("Connect your Muse headset or use 'Simulate Data'", width / 2, height / 2);

  }
}

// 🌊 EEG Ocean
function drawEEGOcean() {
  noFill();

  let amplitude =
    lerp(10, 70, eegData.attention) *
    (1 - eegData.meditation * 0.5);

  let frequency = lerp(0.008, 0.05, eegData.attention);
  let speed = lerp(0.3, 2.5, eegData.attention);

  for (let w = 0; w < 6; w++) {
    let hue = lerp(200, 10, eegData.attention);
    let alpha = lerp(0.15, 0.45, eegData.attention);

    stroke(hue, 50, 80, alpha);
    strokeWeight(2);

    beginShape();
    for (let x = 0; x <= width; x += 20) {
      let y =
        height / 2 +
        w * 25 +
        sin(x * frequency + time * speed + w) *
          amplitude *
          (1 + eegData.beta * 0.5);

      vertex(x, y);
    }
    endShape();
  }
}

// 💥 Explosion fragments
function createExplosion(x, y, hueVal) {
  for (let i = 0; i < 10; i++) {
    fragments.push({
      x: x,
      y: y,
      vx: random(-3, 3),
      vy: random(-3, 3),
      life: 1,
      hue: hueVal
    });
  }
}
// 🐬 Dolphin: calm swim vs alert darting
function drawDolphin() {
  // Speed responds to attention
  let speed = lerp(0.6, 3.5, eegData.attention);
  dolphinX += speed;

  // Gentle vertical motion responds to meditation
  dolphinY =
    height * 0.6 +
    sin(time * 2) * lerp(5, 25, eegData.meditation);

  // Wrap around screen
  if (dolphinX > width + 100) dolphinX = -100;

  push();
  translate(dolphinX, dolphinY);

  // Color: calm blue → alert red
  let hue = lerp(200, 10, eegData.attention);
  stroke(hue, 50, 90, 0.9);
  strokeWeight(3);
  noFill();

  // Body curve
  beginShape();
  curveVertex(-40, 0);
  curveVertex(-20, -10);
  curveVertex(0, -5);
  curveVertex(20, -10);
  curveVertex(40, 0);
  curveVertex(20, 10);
  curveVertex(0, 5);
  curveVertex(-20, 10);
  curveVertex(-40, 0);
  endShape();

  // Tail
  line(-40, 0, -55, -10);
  line(-40, 0, -55, 10);

  pop();
}

// 🧠 Legend
function drawLegend() {
  let labelHue = lerp(210, 0, eegData.attention);
fill(labelHue, 40, 100, 0.9);

  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);

  let x = 20;
  let y = 20;

  text("EEG-Inspired Visualization", x, y);
  text("• Meditation ↑ → smooth ocean & coherent motion", x, y + 20);
  text("• Attention ↑ → turbulence & fragmentation", x, y + 40);
  text("• Alpha ↑ → synchronized drift", x, y + 60);
  text("• Beta ↑ → jitter & noise", x, y + 80);
  text("Dominant band: " + getDominantBand(), x, y + 100);
}

// 🧠 Determine dominant EEG frequency band
function getDominantBand() {
  let bands = [
    { name: "Theta (4–7 Hz)", value: eegData.theta },
    { name: "Alpha (8–12 Hz)", value: eegData.alpha },
    { name: "Beta (13–30 Hz)", value: eegData.beta }

  ];

  bands.sort((a, b) => b.value - a.value);
  return bands[0].name;
}

