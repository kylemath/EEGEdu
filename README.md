# EEGEdu

I want this to be a educational tool
To teach
So in picturing an interactive web page that you scroll or pass through each of these demos
Like EEG 101 but on the web
https://github.com/NeuroTechX/eeg-101

Had been using Neurotech notebooks in python:
https://github.com/NeuroTechX/eeg-notebooks, for data collection and analysis with

https://github.com/alexandrebarachant/muse-lsl - lsl support for muse headset, needs BLE dongle with windows or mac
may need editing of some pyglatt code to connect properly

# Usage

Install npm:
https://www.npmjs.com/get-npm

In terminal clone the git repo and enter the folder:

'''git clone https://github.com/kylemath/EEGEdu'''
'''cd EEGEdu'''

Install required packaged with:

```npm install```

Then run the application using:

```npm start dev```

# Plan

I want to include chances for them to do the coding
With p5js for example
So it's a 10 parts lesson or something

1. Connect + hardware
2. Biophysics + signal viewing
3. Simple evoked example
4. Frequency domain explanation
5. Raw spectra
6. Frequency bands
7. Spectrogram
8. Record data
9. BCI trainer

10. p5js demos: https://p5js.org/

# Resources

* https://github.com/urish/muse-js - based toolbox for interacting with muse 
* https://github.com/NeuroJS/angular-muse - demo with streaming data in Angular, record button, 
* https://github.com/tanvach/muse-fft  - starting point react demo
* https://github.com/neurosity/eeg-pipes - easy pipable operations on eeg data from muse-js
* https://reactjs.org/  - React for web development
* https://www.chartjs.org/docs/latest/ - interactive charts
* https://github.com/urish/muse-lsl  - maybe useful to stream to LSL

# Provenance

As a starting point this is Forked from tanvanch/muse-fft

muse-fft: Explore Muse headband data in frequency domain. Written with Muse.js, EEG-Pipes, React and Charts.js.

Browser screenshot example:

![Screen Shot](screen.png)


