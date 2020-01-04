export default function sketchPredict (p) {

  let label;
  let confidence;

  p.setup = function () {
    p.createCanvas(p.windowWidth*.6, 300);

  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth*.6, 300);
  }

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    label = props.label;
    confidence = props.confidences[label];
  };

  p.draw = function () {
    p.background(250, 250, 150);
    p.fill(0);
    p.strokeWeight(5);
    p.line(p.width/2, 0, p.width/2, p.height);
    p.textSize(30);
    p.text('A', p.width/4, 30);
    p.text('B', p.width-p.width/4, 30)
    if (label === 'A') {
      p.fill(120, 120, 250);
      if (confidence > .8) {
        p.ellipse(p.width/6, p.height/2, 60);
      } else {
        p.ellipse(p.width/3, p.height/2, 20);
      }
    } else {
      p.fill(120, 250, 120);      
      if (confidence > .8) {
        p.ellipse(p.width-p.width/6, p.height/2, 60);
      } else {
        p.ellipse(p.width-p.width/3, p.height/2, 20);
      }
    }
  }
};