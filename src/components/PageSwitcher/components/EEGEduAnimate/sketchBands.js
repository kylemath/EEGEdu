export default function sketchBands (p) {
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 800, p.WEBGL);
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.6, 800);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    delta = props.delta;
    theta = props.theta;
    alpha = props.alpha;
    beta = props.beta;
    gamma = props.gamma;
  };

  p.draw = function () {
    p.background(256);
    p.ambientMaterial(250);
    p.noStroke();

    let locX = p.mouseX - p.height / 2;
    let locY = p.mouseY - p.width / 2;

    p.ambientLight(60, 60, 60);
    p.pointLight(255, 255, 255, locX, locY, 100);


    p.push();
    p.translate(-100,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(50, delta* 10, 100);
    p.pop();

    p.push();
    p.translate(-50,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(50, theta* 10, 100);
    p.pop();

    p.push();
    p.translate(0,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(50, alpha* 10, 100);
    p.pop();

    p.push();
    p.translate(50,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(50, beta* 10, 100);
    p.pop();

    p.push();
    p.translate(100,0);
    p.rotateY(50);
    p.rotateX(50);
    p.box(50, gamma* 10, 100);
    p.pop();
  };

};