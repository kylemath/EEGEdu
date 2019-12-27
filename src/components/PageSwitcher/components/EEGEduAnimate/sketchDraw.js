export default function sketchDraw (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let xVar = 0;
  let yVar = 0;


  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 500);
  };

  p.windowResized = function() {
    p.createCanvas(p.windowWidth*.6, 500);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = Math.floor(50*props.delta);
    theta = Math.floor(100*props.theta);
    alpha = Math.floor(100*props.alpha);
    beta =  Math.floor(300*props.beta);
    gamma = Math.floor(1000*props.gamma);

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


  p.mousePressed = function () {
    p.background(256);
  }

  p.draw = function () {
    p.fill(theta, delta, gamma, 20);  
    p.noStroke();
    p.ellipse(xVar, yVar, 50);
  }

};