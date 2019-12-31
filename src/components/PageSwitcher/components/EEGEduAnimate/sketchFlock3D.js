import p5 from 'p5';

export default function sketchFlock3D (p) {
  
  const flock = []; // Array of boids
  let depth = 800; // The Z location of the boid tend to stay between +depth/2 and -depth/2
  let gap = 300; // Boids can go further than the edges, this further distance is the gap
  let quadTree; // A quad tree to minimize the cost of distance calculation

  let useQuadTree = true; // Toogle the use of a quad tree
  let showPerceptionRadius = false; // Toogle vizualization of perception radius

  let boidsSlider, perceptionSlider, alignmentSlider, cohesionSlider, separationSlider; // Sliders
  let boidsP, perceptionP, alignmentP, cohesionP, separationP; // Paragraphs
  let startingBoids = 50; // Amount of boid at the start of the sketch
  let startingPerception = 90; // Perception radius at the start of the sketch
  let t = 0; // Counts the frame from the time boids go out of the middle of space

  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let xVar = 0;
  let yVar = 0;
  let zVar = 0;

  // SETUP FUNCTION ---------------------------------------------------
  // Make the canvas, declare some variables, create the DOM elements and the initial boid population
  p.setup = function () {
    // Declaration of a canvas to allow canvas download
    p.createCanvas(p.windowWidth*.5, p.windowWidth*.5, p.WEBGL); // You can change the resolution here

    // Declaration of depth (z axis), unit vectors, and the camera
    p.depth = p.height;
    let cameraX = 1000 / 600 * p.width;
    let cameraY = -800 / 600 * p.height;
    let cameraZ = -200 / 500 * p.depth;
    p.camera(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 0, 1);
    
    // Create the DOM elements: sliders and paragraphs
    createDOMs();

    // Create an initial population of 100 boids
    for (let i = 0; i < boidsSlider.value(); i++) {
      pushRandomBoid();
    }
  }

  p.windowResized = function() {
    p.createCanvas(p.windowWidth*.5, p.windowWidth*.5);
    p.depth = p.height;
    let cameraX = 1000 / 600 * p.width;
    let cameraY = -800 / 600 * p.height;
    let cameraZ = -200 / 500 * p.depth;
    p.camera(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 0, 1);
    
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    theta = Math.floor((props.theta/10) * p.width);
    alpha = Math.floor((props.alpha/10) * p.height);
    beta =  Math.floor((props.beta/10) * p.depth);

    xVar = theta-(p.width/2)+200;
    yVar = alpha-(p.height/2)+200;
    zVar = beta-(p.depth/2)+200; 

    if (Math.abs(xVar) > p.width/2) {
      xVar = Math.sign(xVar) * (p.width/2);
    }
    if (Math.abs(yVar) > p.height/2) {
      yVar = Math.sign(yVar) * (p.height/2);
    }
    if (Math.abs(zVar) > p.depth/2) {
      zVar = Math.sign(zVar) * (p.depth/2);
    }

    // console.log(xVar + ' ' + yVar + ' ' + zVar)
  };

  // DRAW FUNCTION ---------------------------------------------------
  p.draw = function () {
    // Background and lightning
    p.background(200);
    p.directionalLight(150, 150, 150, 1, 1, 0);
    p.ambientLight(150);
    
    // Draw the corners of a box showing the space where boids can fly
    p.stroke(80);
    p.strokeWeight(8);
    p.noFill();
    p.box(p.width + gap/2, p.height + gap/2, p.depth + gap/2);

    p.noStroke();
    p.fill(255);
    p.ambientMaterial(0, 0, 255);
    p.push()
    p.translate(xVar, yVar, zVar);
    p.sphere(5); // A sphere where the boid is
    p.pop();
      

    // Make the quad tree
    let boundary = new Cube(0, 0, 0, p.width + 2 * gap, p.height + 2 * gap, p.depth + 2 * gap);
    quadTree = new QuadTree(boundary, 4);
    for (let boid of flock) {
      quadTree.insert(boid);
    }
    
    // Each boid determines its acceleration for the next frame
    for (let boid of flock) {
      boid.flock(flock, quadTree);
    }
    // Each boid updates its position and velocity, and is displayed on screen
    for (let boid of flock) {
      boid.update(gap);
      boid.show();
    }

    // Adjust the amount of boids on screen according to the slider value
    let maxBoids = boidsSlider.value();
    let difference = flock.length - maxBoids;
    if (difference < 0) {
      for (let i = 0; i < -difference; i++) {
        pushRandomBoid(); // Add boids if there are less boids than the slider value
      }
    } else if (difference > 0) {
      for (let i = 0; i < difference; i++) {
        flock.pop(); // Remove boids if there are more boids than the slider value
      }
    }

    // Update the DOM elements
    boidsP.html(`Boids: ${boidsSlider.value()}`);
    perceptionP.html(`Perception: ${perceptionSlider.value()}`);
    alignmentP.html(`Alignment: ${alignmentSlider.value()}`);
    cohesionP.html(`Cohesion: ${cohesionSlider.value()}`);
    separationP.html(`Separation: ${separationSlider.value()}`);
    
    t++; // t counts the number of frames, it is used to not have cohesion in the first 40 frames
  }


  // Create the DOM elements
  function createDOMs() {
    // Create the paragraphs and sliders
    boidsP = 			p.createP('Boids');
    perceptionP = p.createP('Perception');
    alignmentP = 	p.createP('Alignment');
    cohesionP = 	p.createP('Cohesion');
    separationP = p.createP('Separation');
    
    if (p.windowWidth * p.windowHeight > 1200 * 1200) startingPerception = 150; // Larger perception on a larger screen
    boidsSlider = 			p.createSlider(1, 500, startingBoids, 1);
    perceptionSlider = 	p.createSlider(0, 1000, startingPerception, 1);
    alignmentSlider = 	p.createSlider(0, 5, 0.2, 0.1);
    cohesionSlider = 		p.createSlider(0, 5, 0.3, 0.1);
    separationSlider = 	p.createSlider(0, 5, 0.7, 0.1);

    // Position the DOM elements on the top left corner
    let DOMoffset = 1050; // Place the DOM elements underneath the canvas when we want to download the canvas
    let DOMgap = 5; // Gap between the DOM elements
    let leftGap = 200;
    boidsSlider.position(	    leftGap + DOMgap, DOMoffset + boidsSlider.height * 0 + 1 * DOMgap);
    perceptionSlider.position(leftGap + DOMgap, DOMoffset + boidsSlider.height * 1 + 2 * DOMgap);
    alignmentSlider.position(	leftGap + DOMgap, DOMoffset + boidsSlider.height * 2 + 3 * DOMgap);
    cohesionSlider.position(	leftGap + DOMgap, DOMoffset + boidsSlider.height * 3 + 4 * DOMgap);
    separationSlider.position(leftGap + DOMgap, DOMoffset + boidsSlider.height * 4 + 5 * DOMgap);
    boidsP.position(			leftGap + boidsSlider.width + DOMgap * 2, DOMoffset + boidsSlider.height * 0 + 0 * DOMgap + 2);
    perceptionP.position(	leftGap + boidsSlider.width + DOMgap * 2, DOMoffset + boidsSlider.height * 1 + 1 * DOMgap + 2);
    alignmentP.position(	leftGap + boidsSlider.width + DOMgap * 2, DOMoffset + boidsSlider.height * 2 + 2 * DOMgap + 2);
    cohesionP.position(		leftGap + boidsSlider.width + DOMgap * 2, DOMoffset + boidsSlider.height * 3 + 3 * DOMgap + 2);
    separationP.position(	leftGap + boidsSlider.width + DOMgap * 2, DOMoffset + boidsSlider.height * 4 + 4 * DOMgap + 2);
  }

  // Make a new boid
  function pushRandomBoid() {
    //let pos = createVector(random(width), random(height), random(-depth/2, depth/2)); // Uncomment and comment next line to create boids at random position
    let pos = p.createVector(0, 0, 0); // Create a boid at the center of space
    let vel = p5.Vector.random3D().mult(p.random(0.5, 3)); // Give a random velocity
    let boid = new Boid(pos, vel); // Create a new boid
    flock.push(boid); // Add the new boid to the flock
  }

  ///---
  ///---
  ///---



  // Boid class with flocking behavior
  class Boid {
    constructor(pos, vel) {
      this.pos = pos; // Position
      this.vel = vel; // Velocity
      this.acc = p.createVector(0, 0, 0); // Acceleration
      this.maxForce = 1; // Maximum steering force for alignment, cohesion, separation
      this.maxSpeed = 10; // Desired velocity for the steering behaviors
      this.r = 255; // red color of the boid
      this.g = p.floor(p.random(50, 120)); // green color of the boid
      this.b = p.floor(p.random(50, 120)); // blue color of the boid
    }
    
    // Alignment rule
    // Steering to average neighbors velocity
    alignment(neighbors) {
      let steering = p.createVector();
      for (let other of neighbors) steering.add(other.vel); // Sum of neighbor velocities 
      if (neighbors.length > 0) {
        steering.div(neighbors.length); // Average neighbors velocity
        steering.setMag(this.maxSpeed); // Desired velocity
        steering.sub(this.vel); // Actual steering
        steering.limit(this.maxForce); // Steering limited to maxForce
      }
      return steering;
    }
    
    // Cohesion rule
    // Steering to the average neighbors position
    cohesion(neighbors) {
      let steering = p.createVector();
      for (let other of neighbors) steering.add(other.pos); // Sum of neighbor positions
      if (neighbors.length > 0) {
        steering.div(neighbors.length); // Average neighbors position
        steering.sub(this.pos); // Orientation of the desired velocity
        steering.setMag(this.maxSpeed); // Desired velocity
        steering.sub(this.vel); // Actual steering
        steering.limit(this.maxForce); // Steering limited to maxForce
      }
      return steering;
    }
    
    // Separation rule
    // Steering to avoid proximity of the neighbors
    separation(neighbors) {
      let steering = p.createVector();
      for (let other of neighbors) {
        let diff = p5.Vector.sub(this.pos, other.pos); // Vector from other boid to this boid
        let d = p.max(other.distance, 0.01); // Distance between other boid and this boid
        steering.add(diff.div(d)); // Magnitude inversely proportional to the distance
      }
      if (neighbors.length > 0) {
        steering.div(neighbors.length); // Orientation of the desired velocity
        steering.setMag(this.maxSpeed); // Desired velocity
        steering.sub(this.vel); // Actual steering
        steering.limit(this.maxForce); // Steering limited to maxForce
      }
      return steering;
    }
    
    // Application of the rules
    flock(boids, quadTree) {
      // Go to the middle if goMiddle is true
      // Create a large force towards the middle, apply it to the boid, and "return" to not apply other forces
      let force = p.createVector(xVar-this.pos.x, yVar-this.pos.y, zVar-this.pos.z);
      force.setMag(this.maxForce);
      this.acc.add(force);
    
      let radius = perceptionSlider.value(); // Max distance of a neighbor
      let neighbors = [];
      
      if (useQuadTree === true) {
        // VERSION WITH QUADTREE
        // Make an array of neighbors, i.e. all boids closer than the perception radius
        // The array will be passed to the different flocking behaviors
        let range = new Cube(this.pos.x, this.pos.y, this.pos.z, radius, radius, radius);
        let maybeNeighbors = quadTree.query(range);
        for (let other of maybeNeighbors) {
          let distance = this.pos.dist(other.pos);
          if (other !== this && distance < radius) {
            other.distance = distance; // Record the distance so it can be used later
            neighbors.push(other); // Put this neighbor in the "neighbors" array
          }
        }
      } else {
        // VERSION WITHOUT QUADTREE
        // Make an array of neighbors, i.e. all boids closer than the perception radius
        // The array will be passed to the different flocking behaviors
        for (let other of boids) {
          let distance = this.pos.dist(other.pos);
          if (other !== this && distance < radius) {
            other.distance = distance; // Record the distance so it can be used later
            neighbors.push(other); // Put this neighbor in the "neighbors" array
          }
        }
      }
      

      
      // Calculate the force of alignments and apply it to the boid
      let alignment = this.alignment(neighbors);
      alignment.mult(alignmentSlider.value());
      this.acc.add(alignment);
      
      // Calculate the force of cohesion and apply it to the boid
      if (t > 2) { // No cohesion in the first 40 frames
        let cohesion = this.cohesion(neighbors);
        cohesion.mult(cohesionSlider.value());
        this.acc.add(cohesion);
      }
      
      // Calculate the force of separation and apply it to the boid
      let separation = this.separation(neighbors);
      separation.mult(separationSlider.value());
      this.acc.add(separation);
      
      // If the boid is flies too high or too low, apply another force to make it fly around the middle of space's depth
      if (this.pos.z < -depth/8 || this.pos.z > depth/8) {
        let force = p.createVector(0, 0, -this.pos.z / depth * this.maxForce * 2);
        this.acc.add(force);
      }
      
      // If the boid has no neighbor, apply random forces so it can go find other boids
      if (neighbors.length === 0) {
        let force = p5.Vector.random3D().mult(this.maxForce/4);
        force.z = 0; // Only go find other in an XY plane
        this.acc.add(force);
      }
    }
    
    // Update position, velocity, and acceleration
    update(gap) {
      // Apply physics
      this.pos.add(this.vel);
      this.vel.add(this.acc);
      this.vel.mult(0.999); // Some friction
      this.vel.limit(this.maxSpeed);
      this.acc.mult(0);
      
      // Teleport to opposite side if the boid goes further than a side of space (X and Y axis)
      // Except for the Z axis, as there is already a force keeping the boid from getting too far
      if (this.pos.x > p.width/2 + gap) this.pos.x -= p.width + 1.7 * gap;
      if (this.pos.x < -(p.width/2 + gap)) this.pos.x += p.width + 1.7 * gap;
      if (this.pos.y > p.height/2 + gap) this.pos.y -= p.height + 1.7 * gap;
      if (this.pos.y < -(p.height/2 + gap)) this.pos.y += p.eight + 1.7 * gap;
    }
    
    // Show the boid on screen
    show() {
      p.noStroke();
      p.fill(255);
      p.ambientMaterial(this.r, this.g, this.b);

      p.push()
      p.translate(this.pos.x, this.pos.y, this.pos.z);
      p.sphere(10); // A sphere where the boid is
      let arrow = p.createVector(this.vel.x, this.vel.y, this.vel.z).setMag(10);
      p.translate(arrow.x, arrow.y, arrow.z);
      p.sphere(5); // Another sphere, smaller, in the direction of the boid's velocity
      p.pop();
      
      // Show perception radius, all circles are drawn at z = 0
      if (showPerceptionRadius) {
        p.stroke(255, 255, 255, 100);
        p.noFill();
        p.strokeWeight(1);
        let perception = perceptionSlider.value() * 2;
        p.push();
        p.translate(0,0,this.pos.z)
        p.ellipse(this.pos.x, this.pos.y, perception, perception);
        p.pop();
      }
    }
  }

  ///
  ///
  ///

  // This file contains the QuadTree class
  // as well as the Cube classe used by the QuadTree

  // Cube --------------------------------------------------
  // A cube delimiting the volume of a quad tree
  // or the volume used for asking boids from a quad tree
  class Cube {
    constructor(x, y, z, w, h, d) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
      this.h = h;
      this.d = d;

      this.xMin = x - w;
      this.xMax = x + w;
      this.yMin = y - h;
      this.yMax = y + h;
      this.zMin = z - d;
      this.zMax = z + d;
    }

    // Checks if a boid is inside the cube
    contains(boid) {
      let pos = boid.pos;
      return (pos.x >= this.xMin && pos.x <= this.xMax &&
              pos.y >= this.yMin && pos.y <= this.yMax &&
              pos.z >= this.zMin && pos.z <= this.zMax);
    }

    // Check if two cubes intersect
    intersects(range) {
      return !(this.xMax < range.xMin || this.xMin > range.xMax ||
               this.yMax < range.yMin || this.yMin > range.yMax ||
               this.zMax < range.zMin || this.zMin > range.zMax);
    }
  }

  // QUAD TREE --------------------------------------------------
  // The quad tree stores points in a tree structure
  // to minimize the cost of distance calculation
  class QuadTree {
    constructor(boundary, capacity) {
      this.boundary = boundary; // cube giving the borders of the quad tree
      this.capacity = capacity; // Maximum amount of points that can be stored in the quad tree
      this.boids = []; // Array storing the boids in the quad tree
      this.divided = false; // True when the quad tree subdivides
    }

    // Insert a boid in the quad tree
    insert(boid) {
      // Return if the boid is not in the area of this layer of quad tree
      if (!this.boundary.contains(boid)) {
        return false;
      }

      // Add the boid at this layer or a deeper layer depending on capacity
      if (this.boids.length < this.capacity) {
        // Add the point to this layer if there is still room for it
        this.boids.push(boid);
        return true;
      } else {
        // Otherwise, subdivide to make room for the new boid
        // Subdivision divides the quad tree area into 8 new children quad trees
        if (!this.divided) {
          this.subdivide();
        }

        // Add the boid to the relevant subdivision
        // N = North, S = South, E = East, W = West, B = Bottom, T = Top
        if (this.NWT.insert(boid)) {
          return true;
        } else if (this.NET.insert(boid)) {
          return true;
        } else if (this.SET.insert(boid)) {
          return true;
        } else if (this.SWT.insert(boid)) {
          return true;
        } else if (this.NWB.insert(boid)) {
          return true;
        } else if (this.NEB.insert(boid)) {
          return true;
        } else if (this.SEB.insert(boid)) {
          return true;
        } else if (this.SWB.insert(boid)) {
          return true;
        }
      }
    }

    // Subdivides the quad tree if it is at full capacity, creating 8 new children quad trees
    subdivide() {
      this.divided = true; // Informs of the subdivision to only subdivide once

      let x = this.boundary.x;
      let y = this.boundary.y;
      let z = this.boundary.z;
      let w = this.boundary.w / 2;
      let h = this.boundary.h / 2;
      let d = this.boundary.d / 2;

      // Creates the 8 children quad trees with the relevant positions and area
      // North West Top quad tree
      let NWTBoundary = new Cube(x - w, y - h, z - d, w, h, d);
      this.NWT = new QuadTree(NWTBoundary, this.capacity);

      // North East Top quad tree
      let NETBoundary = new Cube(x + w, y - h, z - d, w, h, d);
      this.NET = new QuadTree(NETBoundary, this.capacity);

      // South East Top quad tree
      let SETBoundary = new Cube(x + w, y + h, z - d, w, h, d);
      this.SET = new QuadTree(SETBoundary, this.capacity);

      // South West Top quad tree
      let SWTBoundary = new Cube(x - w, y + h, z - d, w, h, d);
      this.SWT = new QuadTree(SWTBoundary, this.capacity);
      
      // North West Bot quad tree
      let NWBBoundary = new Cube(x - w, y - h, z + d, w, h, d);
      this.NWB = new QuadTree(NWBBoundary, this.capacity);

      // North East Bot quad tree
      let NEBBoundary = new Cube(x + w, y - h, z + d, w, h, d);
      this.NEB = new QuadTree(NEBBoundary, this.capacity);

      // South East Bot quad tree
      let SEBBoundary = new Cube(x + w, y + h, z + d, w, h, d);
      this.SEB = new QuadTree(SEBBoundary, this.capacity);

      // South West Bot quad tree
      let SWBBoundary = new Cube(x - w, y + h, z + d, w, h, d);
      this.SWB = new QuadTree(SWBBoundary, this.capacity);
    }

    // Returns all the points in a given range (Cube) and put them in the "found" array
    query(range, found) {
      // The array "found" will check all quad trees intersecting with the range,
      // looking for points intersecting with the range
      if (!found) found = []; // Creates the array at the beginning of the recursion

      if (!this.boundary.intersects(range)) {
        return found; // No intersection between the quad tree and the range, no need to check for points
      } else {
        // If the range intersects this quad tree, check for the intersection of its points with the range
        for (let boid of this.boids) {
          if (range.contains(boid)) {
            found.push(boid); // Add the points intersecting with the range to "found"
          }
        }

        // This quad tree intersects with the range, now do the same for its children quad trees
        if (this.divided) {
          this.NWT.query(range, found);
          this.NET.query(range, found);
          this.SET.query(range, found);
          this.SWT.query(range, found);
          this.NWB.query(range, found);
          this.NEB.query(range, found);
          this.SEB.query(range, found);
          this.SWB.query(range, found);
        }
      }

      return found;
    }
  }
}