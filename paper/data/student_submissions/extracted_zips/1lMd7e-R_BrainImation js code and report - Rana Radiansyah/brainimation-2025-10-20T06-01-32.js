// --- EEG Data Placeholder ---
let eegData = { alpha: 0, beta: 0, gamma: 0, theta: 0, delta: 0 };

// --- Race and Caterpillar Variables ---
let startLine = 30;        // x-coordinate of the start line
let finishLine = 900;      // x-coordinate of the finish line
let spacing = 20;           // spacing between caterpillar segments
let baseSegmentSize = 30;   // base size of each segment (will pulse)
let eyeSize = 15;           // size of the caterpillar eyes
let numCaterpillars = 5;    // total number of caterpillars in the race
let caterpillarEnds = [];   // x-coordinate of each caterpillar's head
let isRacing = true;       // whether the race is currently running
let wiggleOffsets = [];     // side-to-side movement offsets for each caterpillar
let waveNames = ["Alpha", "Beta", "Gamma", "Theta", "Delta"]; // names of EEG waves

function setup() {
  frameRate(10);

  // Initialize caterpillar positions and wiggle offsets
  for (let i = 0; i < numCaterpillars; i++) {
    caterpillarEnds.push(startLine); // all caterpillars start at the start line
    wiggleOffsets.push(0);           // no wiggle at the start
  }
}

function draw() {
  background(109, 177, 207); // set background color

  // --- Simulated EEG data (for BrainImation simulation mode) ---
  eegData.alpha = random(5, 15);
  eegData.beta = random(5, 15);
  eegData.gamma = random(5, 15);
  eegData.theta = random(0, 10);
  eegData.delta = random(0, 5);

  // --- Draw start and finish lines ---
  noStroke();
  fill(0);                 // black start line
  rect(startLine, 0, 5, height);
  fill(0, 255, 0);         // green finish line
  rect(finishLine, 0, 20, height);

  // --- Draw EEG wave names next to finish line ---
  textSize(16);
  textAlign(LEFT, CENTER);
  fill(0);
  let padding = height / numCaterpillars;
  for (let i = 0; i < numCaterpillars; i++) {
    let y = (i + 0.5) * padding;
    text(waveNames[i], finishLine + 25, y); // name to the right of finish line
  }

  // --- Move caterpillars or show start message ---
  if (isRacing) {
    moveCaterpillars();  // update x-position, wiggle, and segment size based on EEG
  } else {
    writeStart();        // show "Click to start!" message
  }

  drawCaterpillars();    // render caterpillars on canvas
  checkWinner();         // check if any caterpillar has crossed the finish line
}

// --- Update caterpillar positions and wiggle offsets ---
function moveCaterpillars() {
  for (let i = 0; i < numCaterpillars; i++) {
    // Map EEG values to forward speed
    if (i === 0) caterpillarEnds[i] += map(eegData.alpha, 0, 15, 5, 20);
    else if (i === 1) caterpillarEnds[i] += map(eegData.beta, 0, 15, 5, 20);
    else if (i === 2) caterpillarEnds[i] += map(eegData.gamma, 0, 15, 5, 20);
    else if (i === 3) caterpillarEnds[i] += map(eegData.theta, 0, 10, 5, 15);
    else if (i === 4) caterpillarEnds[i] += map(eegData.delta, 0, 5, 5, 12);

    // --- Update side-to-side wiggle based on EEG intensity ---
    let intensity;
    if (i === 0) intensity = eegData.alpha;
    else if (i === 1) intensity = eegData.beta;
    else if (i === 2) intensity = eegData.gamma;
    else if (i === 3) intensity = eegData.theta;
    else intensity = eegData.delta;

    wiggleOffsets[i] = sin(frameCount * 0.3) * map(intensity, 0, 15, 0, 20);
  }
}

// --- Draw all caterpillars ---
function drawCaterpillars() {
  let padding = height / numCaterpillars; // vertical spacing between caterpillars
  for (let i = 0; i < numCaterpillars; i++) {
    let y = (i + 0.5) * padding; // y-position of caterpillar row

    // Caterpillar color responds to EEG values
    let r = i === 0 ? map(eegData.alpha, 0, 15, 100, 255) : 100;
    let g = i === 1 ? map(eegData.beta, 0, 15, 100, 255) : 100;
    let b = i === 2 ? map(eegData.gamma, 0, 15, 100, 255) : 100;
    if (i === 3) b = map(eegData.theta, 0, 10, 100, 255);
    if (i === 4) r = map(eegData.delta, 0, 5, 100, 255);

    fill(r, g, b);
    stroke(0);

    let crawl = round(random(4, 7)); // random number of segments per draw

    // Pulse segment size based on EEG intensity
    let pulseSize = baseSegmentSize * map(
      i === 0 ? eegData.alpha :
      i === 1 ? eegData.beta :
      i === 2 ? eegData.gamma :
      i === 3 ? eegData.theta :
      eegData.delta,
      0, 15, 0.8, 1.5
    );

    drawCaterpillar(caterpillarEnds[i], y, crawl, wiggleOffsets[i], pulseSize);
  }
}

// --- Draw a single caterpillar ---
function drawCaterpillar(x, y, segments, wiggle, segmentSizePulse) {
  for (let i = 0; i < segments; i++) {
    ellipse(x - i * spacing + wiggle, y, segmentSizePulse); // segment with wiggle and pulse
  }
  // Draw eyes on head
  fill(0);
  stroke(255);
  ellipse(x - 5 + wiggle, y - 5, eyeSize / 2);
  ellipse(x + 5 + wiggle, y - 5, eyeSize / 2);
}

// --- Show "Click to start!" message ---
function writeStart() {
  textSize(24);
  textAlign(CENTER);
  fill(255);
  text("Click to start!", width / 2, height / 2);
}

// --- Check if any caterpillar has crossed the finish line ---
function checkWinner() {
  for (let i = 0; i < caterpillarEnds.length; i++) {
    if (caterpillarEnds[i] >= finishLine) {
      textSize(24);
      textAlign(CENTER);
      fill(255);
      text(`Caterpillar ${waveNames[i]} wins!`, width / 2, height / 2);
      noLoop(); // stop the draw loop
    }
  }
}
