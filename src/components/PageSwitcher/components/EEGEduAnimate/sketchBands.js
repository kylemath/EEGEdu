export default function sketchBands (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.5, p.windowWidth*.5, p.WEBGL);
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.5, p.windowWidth*.5);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = props.delta;
    theta = props.theta;
    alpha = props.alpha;
    beta = props.beta;
    gamma = props.gamma;
  };

  p.draw = function () {

    let unit = p.width/5;

    p.background(256);
    p.ambientMaterial(250);
    p.noStroke();

    let locX = p.mouseX - p.height / 2;
    let locY = p.mouseY - p.width / 2;

    p.ambientLight(60, 60, 60);
    p.pointLight(255, 255, 255, locX, locY, 100);


    p.push();
    p.fill(255,0,0);
    p.translate(-unit,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(unit/2, delta* 10, unit);
    p.pop();

    p.push();
    p.fill(0,255,0);
    p.translate(-unit/2,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(unit/2, theta* 10, unit);
    p.pop();

    p.push();
    p.fill(0,0,255);
    p.translate(0,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(unit/2, alpha* 10, unit);
    p.pop();

    p.push();
    p.fill(0,128, 128);
    p.translate(unit/2,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(unit/2, beta* 10, unit);
    p.pop();

    p.push();
    p.fill(128,0,128);
    p.translate(unit,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(unit/2, gamma* 10, unit);
    p.pop();
  };

};