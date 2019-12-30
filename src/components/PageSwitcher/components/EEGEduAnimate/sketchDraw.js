export default function sketchDraw (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  let xVar = 0;
  let yVar = 0;

  let brushWidth = 50;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 500);
  };

  p.windowResized = function() {
    p.createCanvas(p.windowWidth*.6, 500);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = Math.floor((props.delta/20) * 255);
    theta = Math.floor((props.theta/10) * 255);
    alpha = Math.floor((props.alpha/5) * p.width);
    beta =  Math.floor((props.beta/2) * p.height);
    gamma = Math.floor((props.gamma/2) * 255);

    xVar = alpha;
    yVar = beta;

    if (xVar > p.width) {
      xVar = p.width-brushWidth/2;
    }
    if (yVar > p.height) {
      yVar = p.height-brushWidth/2;
    }

    // console.log(xVar)
    // console.log(yVar)
  };


  p.mousePressed = function () {
    p.background(256);
  }

  p.draw = function () {
    p.fill(theta, delta, gamma, 20);  
    p.noStroke();
    p.ellipse(xVar, yVar, brushWidth);
  }

};