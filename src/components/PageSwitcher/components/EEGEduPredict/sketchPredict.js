import ml5 from 'ml5'

export default function sketchPredict (p) {

  let psd;
  let freqs;

  let x = 0;
  let last_psd; 
  let buttonA;
  let myCanvas;
  let started; 
  
  let knnClassifier = ml5.KNNClassifier();

  p.setup = function () {
    myCanvas = p.createCanvas(500, 500);
    myCanvas.parent("container");
    p.frameRate(60);

    p.background(250,250,150);

    buttonA = p.createButton('Label A');
    buttonA.position(20, 65);
  };

  p.myCustomRedrawAccordingToNewPropsHandler = function (props) {
    psd = props.psd;
    freqs = props.freqs;
  };

  

  p.draw = function () {
    // console.log("cycle " + x + ", psd: " + psd)
    console.log(started);
    x++;    
        
    if (psd && psd.length > 0) {

      if (!arraysEqual(psd, last_psd)) { // to eliminate duplicate psd's from training
        if (x>250 && x<500)  {  // if they press button A

          // console.log('Trying to add A example')
          p.addExample('A');
          last_psd = psd;

        } else if (x > 500 && x < 750) { // if they press button B
          // console.log('Trying to add B example')
          p.addExample('B');
          last_psd = psd;
        }
      }
    }

    // p.fill(255,0,0);
    // if (freqs) {
    //   for (let i = 0; i < freqs.length; i++) {
    //     p.ellipse(freqs[i]*10,p.height - (20+psd[i]*100),10)
    //   }
    // } 
  }

  //Start or Stop the animation
  document.querySelector("button").addEventListener("click", function () {
    started = !started;
  })

  p.addExample = function (label) {
    knnClassifier.addExample(psd, label);
  }

  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }



};