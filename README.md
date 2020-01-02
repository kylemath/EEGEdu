# EEGEdu

EEGEdu is an educational website to learn about working with electroencephalogram (EEG) data. It is a teaching tool that allows for students to quickly interact with their own brain waves. 

It is an interactive web page that you interact with multiple demonstrations of working with EEG data. It is partially inspired by [EEG101](https://github.com/NeuroTechX/eeg-101) but it is strictly web-based. This allows students to interact with EEG brain data without having to install any software.

This is a useful set of tools that has been inspired by multiple works that came before. Previously, others in the field have been using [Neurotech EEG-notebooks in python](https://github.com/NeuroTechX/eeg-notebooks) for data collection and analysis with [muse-lsl](https://github.com/alexandrebarachant/muse-lsl).  These software support the Interaxon MUSE headset but required a bluetooth low-energey (BLE) dongle to work with Windows of Mac systems. It also required the editing of some pyglatt code to connect properly. These software are cumbersome, and serve as a barrier to entry for many students learning about EEG. 

Visit [https://eegedu.com/](https://eegedu.com/]) for the live website.

# Installation for Development 

If you are interested in developing EEGEdu, here are some instructions to get you started.

Note: Currently EEGEdu development requires a Mac OSX operating system. 

To start, you will need to install [Homebrew](https://brew.sh) and [yarn](https://yarnpkg.com/lang/en/docs/install/#mac-stable). These are easy one-line installations for Mac users: 

```sh
# Install homebrew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# Install yarn
# NOTE: this will also install Node.js if it is not already installed.
brew install yarn 
# Node.js must be version 10.x for Muse interaction
# Thus, if you are getting version issues, install n and switch versions
# sudo npm install -g n
# sudo n 10.16.0
```

Then, in terminal, clone the git repo and enter the folder:

```sh
git clone https://github.com/kylemath/EEGEdu
cd EEGEdu
```

You then need to install the required packages for EEGEdu

```sh
yarn install
```

## Local Development Environment
Then, you can run the *Development Environment* of EEGEdu:

```sh
yarn start dev
```

If it is working correctly, the EEGEdu application will open in a browser window at http://localhost:3000.

## Local Production Environment

To start the *Local Production Environment*, you can use the following commands: 

```sh
yarn run build
serve -s build
```

## Deployment

[EEGEdu](https://eegedu.com) is running on [Firebase](https://firebase.google.com/) and deployment happens automagically using GitHub post-commit hooks, or [Actions](https://github.com/kylemath/EEGEdu/actions), as they are commonly called. You can see how the application is build and deployed by [inspecting the workflow](https://github.com/kylemath/EEGEdu/blob/master/.github/workflows/workflow.yml).

# Contributing
The guide for contributors can be found [here](https://github.com/kylemath/EEGEdu/blob/master/CONTRIBUTING.md). It covers everything you need to know to start contributing to EEGEdu.

# Development Roadmap 

We are aiming to include chances for students to interact with EEG-based brain signals. So we might break down a curriculum into 10 lessons as follows:



1. Connect + hardware
Biophysics + signal viewing
2. Raw Data + artifacts + blinks + record
3. Frequency domain explanation + Raw spectra + record
4. Frequency bands + record
5. Spectrogram
6. Eyes closed eyes open experiment
7. SSVEP experiment
8. evoked experiment
9. Neurofeedback p5js demos
10. BCI trainer

# References

* https://github.com/urish/muse-js - based toolbox for interacting with muse 
* https://github.com/NeuroJS/angular-muse - demo with streaming data in Angular, record button, 
* https://github.com/tanvach/muse-fft  - starting point react demo
* https://github.com/neurosity/eeg-pipes - easy pipable operations on eeg data from muse-js
* https://reactjs.org/  - React for web development
* https://www.chartjs.org/docs/latest/ - interactive charts
* https://github.com/urish/muse-lsl  - maybe useful to stream to LSL

# Credits

`EEGEdu` - An Interactive Electrophysiology Tutorial with the Interaxon Muse brought to you by Mathewson Sons

# License

[EEGEdu is licensed under The MIT License (MIT)](https://github.com/kylemath/EEGEdu/blob/master/LICENSE)
