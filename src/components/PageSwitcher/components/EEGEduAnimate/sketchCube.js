export default function sketchCube (p) {
  // let delta = 0;
  // let theta = 0;
  // let alpha = 0;
  // let beta = 0;
  // let gamma = 0;

  let rotation = 0;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 800, p.WEBGL);
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.6, 800);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    // delta = props.delta;
    // theta = props.theta;
    // alpha = props.alpha;
    // beta = props.beta;
    // gamma = props.gamma;

    if (props.alpha){
      rotation = props.alpha * Math.PI / 180;
    }
  };

  p.draw = function () {
    p.background(256);
    p.normalMaterial();
    p.noStroke();
    p.push();
    p.rotateX(25 + p.frameCount/10);
    p.rotateY(rotation);
    p.box(100);
    p.pop();
  };

};