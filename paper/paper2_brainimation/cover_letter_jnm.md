# Cover Letter — *Journal of Neuroscience Methods* (Elsevier)

**Date:** November 3, 2026

**To:**  
Editorial Board  
*Journal of Neuroscience Methods*  
Elsevier

**Subject:** Manuscript Submission — *"BrainImation: A Zero-Install Browser IDE and Creative-Coding Framework for Live WebBluetooth EEG Visualization, Multi-Band Sonification, and Closed-Loop Neurofeedback"*

Dear Editors of *Journal of Neuroscience Methods*,

I am pleased to submit our manuscript entitled **"BrainImation: A Zero-Install Browser IDE and Creative-Coding Framework for Live WebBluetooth EEG Visualization, Multi-Band Sonification, and Closed-Loop Neurofeedback"** for consideration for publication as a Full-Length Research Article in *Journal of Neuroscience Methods*.

### Methodological Innovation and Alignment with *Journal of Neuroscience Methods*

*Journal of Neuroscience Methods* has long served as the premier venue for accessible, portable, and open-source electrophysiological instrumentation and software architectures—including our laboratory's earlier work transitioning EEG paradigms out of shielded rooms onto Raspberry Pi and LattePanda single-board computers (Kuziek, Shienh, & Mathewson, 2017, *J. Neurosci. Methods*; Kuziek, Redman, Splinter, & Mathewson, 2018, *J. Neurosci. Methods*) as well as foundational open-source analysis toolboxes (Delorme & Makeig, 2004, *J. Neurosci. Methods*).

Despite advances in portable dry-electrode EEG hardware, building custom closed-loop neurofeedback environments, brain–computer music interfaces (BCMIs), or online event-related potential (ERP) paradigms still requires stitching together an operating-system-specific Bluetooth daemon (`BlueMuse` or `muse-lsl`), a Lab Streaming Layer (LSL) network socket, a background Python or C++ digital signal processing (DSP) script, and a separate rendering engine (Unity, PsychoPy, or Max/MSP). Furthermore, existing browser-based WebBluetooth libraries (`muse-js` v3.0) fail to connect on newer Muse 2 and Muse S hardware revisions whose firmware lazily advertises EEG electrode GATT characteristics (`273e0003`–`273e0006`) only after receiving a telemetry-preset wake-up command (`0x04 0x70 0x32 0x31 0x0a`).

In this manuscript, we present **BrainImation** (`https://kylemath.github.io/Brainimation/`), a zero-install, single-page browser Integrated Development Environment (IDE) that solves these hardware and software bottlenecks through four methodological contributions:
1. **Two-Phase Lazy-GATT WebBluetooth Protocol (`muse-browser.js`):** We engineer a zero-dependency 19.2 KB WebBluetooth client ($24.6\times$ smaller than the 473.0 KB `muse-js` + `RxJS` bundle) that sends the length-prefixed preset (`"p21"`) and stream-start (`"s"`) commands *prior* to enumerating electrode characteristics, restoring 100% connection reliability across Muse 2016, Muse 2, and Muse S hardware while unpacking 12-bit big-endian packets (`0.48828125` $\mu\text{V}$ LSB) into a 256 Hz 4-channel (`TP9`, `AF7`, `AF8`, `TP10`) circular buffer.
2. **Dual-Source Real-Time DSP & Hardware-Free 256 Hz Simulator (`EEGSimulator`):** A client-side 256-point Hanning-windowed radix-2 Cooley–Tukey FFT engine with $>150\ \mu\text{V}$ ocular/myogenic artifact rejection computes live normalized band powers ($\delta, \theta, \alpha, \beta, \gamma$) and cognitive state indices (`window.eegData`) identically across live Bluetooth streams and a realistic 4-channel physiological generator (5-band oscillatory superposition, slow baseline drift, broadband sensor noise, bilateral anterior frontal Gaussian eye blinks, and triggered N170/P300 ERP waveforms), enabling complete asynchronous paradigm development without physical hardware.
3. **Browser Live-Coding Runtime & Closed-Loop DSP Recipes:** An embedded VS Code Monaco editor with custom `eegData` IntelliSense and dynamic `p5.js`/`p5.sound` prototype introspection (`bindP5Functions`) enables users to build 60 FPS closed-loop neurofeedback games, multi-band FM/harmonic Web Audio synthesizers, and online 4-channel baseline-corrected ERP averagers (`-200` to `+800` ms at 256 Hz, achieving a $6.4\times$ P300 SNR gain from $K = 1$ to $K = 20$ trials and $98.4\%$ frame-to-frame jitter reduction via exponential moving-average conditioning).
4. **Empirical Multi-Cohort Validation ($N = 69$ Programs, $N_{\text{students}} = 30$):** Across two examination cohorts in an upper-level undergraduate cognitive neuroscience laboratory (`PSYCH 403`), $100\%$ of learners authored working, syntax-valid closed-loop neurofeedback games (Cohort 1: $N = 40$, median $121$ executable lines of code [LOC], range $38\text{--}378$ LOC) and online 4-channel ERP paradigms (Cohort 2: $N = 29$, median $176$ LOC, range $117\text{--}306$ LOC)—a $5.1\times$ complexity expansion beyond the built-in 32-LOC pedagogical scaffolds ($p < 10^{-11}$).

### Companion Manuscript & Preprint Disclosure

A companion paper describing a separate 12-module guided dashboard application (`EEGEdu`, `https://eegedu.com`) for introductory time-domain ECG and spectral alpha observation is cited in the manuscript, archived on *PsyArXiv* (Mathewson, Mathewson, & Mathewson, 2026), and submitted separately to *Psychophysiology*. The two manuscripts present completely distinct codebases, technical contributions, and empirical datasets. Both preprints are archived on *PsyArXiv* in accordance with Elsevier's preprint policy.

### Ethics, Open Science, and Gold Open Access Eligibility

All empirical student code complexity metrics were analyzed in de-identified form under University of Alberta Research Ethics Board approval (`Protocol Pro00050069`). The live IDE (`https://kylemath.github.io/Brainimation/`), source repository (`https://github.com/kylemath/Brainimation`), and reproducible analysis scripts (`https://github.com/kylemath/eegeduPaper`) are openly archived. As a corresponding author at the University of Alberta, this manuscript is eligible for full **\$0 Gold Open Access** coverage under the **CRKN–Elsevier Transformative Agreement**.

### Suggested Reviewers

- **Dr. Arnaud Delorme** (UC San Diego / SCCN & CNRS; `adelorme@ucsd.edu`) — Co-creator of EEGLAB and expert in wearable Muse EEG software architectures and signal processing.
- **Dr. Fabien Lotte** (Inria Bordeaux Sud-Ouest; `fabien.lotte@inria.fr`) — Leading authority on closed-loop BCI human training protocols, neurofeedback design, and BCI software frameworks.
- **Dr. Eduardo R. Miranda** (University of Plymouth; `eduardo.miranda@plymouth.ac.uk`) — Pioneer of brain–computer music interfacing (BCMI) and real-time EEG sonification.
- **Dr. Joshua R. de Leeuw** (Vassar College; `jdeleeuw@vassar.edu`) — Creator of `jsPsych` and expert in browser-based JavaScript architectures for cognitive neuroscience.

Thank you for considering our manuscript for *Journal of Neuroscience Methods*.

Sincerely,

**Kyle E. Mathewson, Ph.D.**  
Associate Professor  
Department of Psychology, Faculty of Science  
Neuroscience and Mental Health Institute, Faculty of Medicine and Dentistry  
University of Alberta, Edmonton, AB, Canada  
Email: `kyle.mathewson@ualberta.ca`
