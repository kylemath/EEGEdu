import p5 from "p5";
import "p5/lib/addons/p5.sound";

export default function sketchTone (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let xVar = 0;
  let yVar = 0;
  var flock;


  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 500);
    flock = new p.Flock();

    for (var i = 0; i < 100; i++) {
      var b = new p.Boid(p.width / 2, p.height / 2, 2000);
      flock.addBoid(b)
    }
  };

  p.windowResized = function() {
    p.createCanvas(p.windowWidth*.6, 500);
  }
  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = Math.floor(props.delta);
    theta = Math.floor(100*props.theta);
    alpha = Math.floor(100*props.alpha);
    beta =  Math.floor(300*props.beta);
    gamma = Math.floor(props.gamma);

    xVar = beta;
    yVar = alpha;

    if (xVar > p.width) {
      xVar = p.width;
    }
    if (yVar > p.height) {
      yVar = p.height;
    }

    console.log(xVar)
    console.log(yVar)
  };

  p.draw = function () {
    p.background(0);
    p.fill(255,0,0)
    p.push();
    p.translate(xVar, yVar);
    p.ellipse(0,0,5,5);
    p.pop();
    flock.run();
  }

  p.mouseDragged = function () {
    flock.addBoid(new p.Boid(p.mouseX, p.mouseY));
  }

  p.Flock = function() {
    this.boids = []; //Initialize the array
  }

  p.Flock.prototype.addBoid = function(b) {
    this.boids.push(b);
  }

  p.Flock.prototype.run = function() {
    for (var i=0; i < this.boids.length; i++) {
      this.boids[i].run(this.boids);
    }
  }

  p.Boid = function(x, y) {
    this.acceleration = p.createVector(0, 0);
    this.velocity = p.createVector(p.random(-1, 1), p.random(-1, 1));
    this.position = p.createVector(x, y);
    this.r = 2.0; //Size of object Boid
    this.maxspeed = 3; // Maximum speed
    this.maxforce = 0.05; // Maximum steer ing force
  }

  p.Boid.prototype.run = function(boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
  };

  p.Boid.prototype.applyForce = function(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  };

  p.Boid.prototype.flock = function(boids) {
    var sep = this.separate(boids); 
    var ali = this.align(boids);
    var coh = this.cohesion(boids); 
    var mows = this.mouuse(boids); 

    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);
    mows.mult(3.0);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
    this.applyForce(mows);
  };


  p.Boid.prototype.update = function() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  };


  p.Boid.prototype.seek = function(target) {
    var desired = p5.Vector.sub(target, this.position); 
    desired.normalize();
    desired.mult(this.maxspeed);
    var steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce); 
    return steer;
  };

  p.Boid.prototype.render = function() {
    // Draw a triangle rotated in the direction of velocity
    var theta = this.velocity.heading() + p.radians(90);
    p.fill(255);
    p.noStroke();
    p.push();
    p.translate(this.position.x, this.position.y);
    // p.ellipse(0,0,5,5);
    p.rotate(theta);
    p.beginShape();
    p.vertex(0, -this.r * 2);
    p.vertex(-this.r, this.r * 2);
    p.vertex(this.r, this.r * 2);
    p.endShape(p.CLOSE);
    p.pop();
  };

  p.Boid.prototype.borders = function() {
    if (this.position.x < -this.r) this.position.x = p.width + this.r;
    if (this.position.y < -this.r) this.position.y = p.height + this.r;
    if (this.position.x > p.width + this.r) this.position.x = -this.r;
    if (this.position.y > p.height + this.r) this.position.y = -this.r;
  };

  p.Boid.prototype.separate = function(boids) {
    var desiredseparation = 25.0;
    var steer = p.createVector(0, 0);
    var count = 0;
    // For every boid in the system, check if it's too close
    for (var i = 0; i < boids.length; i++) {
      var d = p5.Vector.dist(this.position, boids[i].position);
      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if ((d > 0) && (d < desiredseparation)) {
        // Calculate vector pointing away from neighbor
        var diff = p5.Vector.sub(this.position, boids[i].position);
        diff.normalize();
        diff.div(d); // Weight by distance
        steer.add(diff);
        count++; // Keep track of how many
      }
    }
    if (count > 0) {
      steer.div(count);
    }
    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }
    return steer;
  };

  // Alignment
  // For every nearby boid in the system, calculate the average velocity
  p.Boid.prototype.align = function(boids) {
    var neighbordist = 100;
    var sum = p.createVector(0, 0);
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
      var d = p5.Vector.dist(this.position, boids[i].position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(boids[i].velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxspeed);
      var steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    } else {
      return p.createVector(0, 0);
    }
  };

  // Cohesion
  // For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
  p.Boid.prototype.cohesion = function(boids) {
    var neighbordist = 100;
    var sum = p.createVector(0, 0); // Start with empty vector to accumulate all locations
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
      var d = p5.Vector.dist(this.position, boids[i].position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(boids[i].position); // Add location
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum); // Steer towards the location
    } else {
      return p.createVector(0, 0);
    }
  };

  p.Boid.prototype.mouuse = function(boids) {
    var neighbordist = 100;
    var m = p.createVector(xVar, yVar);
    var d = p5.Vector.dist(this.position, m);
    if ((d > 0) && (d < neighbordist)) {
      return this.seek(m); // Steer towards the mouse location 
    } else {
      return p.createVector(0, 0);
    }
  };
};