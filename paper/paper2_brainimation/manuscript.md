# BrainImation: A Zero-Install Browser IDE and Creative-Coding Framework for Live WebBluetooth EEG Visualization, Multi-Band Sonification, and Closed-Loop Neurofeedback

**Kyle E. Mathewson**$^{1,2,*}$  
$^1$Department of Psychology, Faculty of Science, University of Alberta, Edmonton, AB, Canada  
$^2$Neuroscience and Mental Health Institute, Faculty of Medicine and Dentistry, University of Alberta, Edmonton, AB, Canada  
$^*$Correspondence: `kyle.mathewson@ualberta.ca`  
Live IDE: https://kylemath.github.io/Brainimation/ $\cdot$ Repository: https://github.com/kylemath/Brainimation

---

## Structured Abstract (*Journal of Neuroscience Methods*)

- **Background:** Authoring custom closed-loop brain–computer interfaces (BCIs), auditory neuro-sonifications, and online event-related potential (ERP) paradigms typically requires multi-process native toolchains (`LabStreamingLayer`, Python, C++, or Unity) and fails on newer consumer EEG hardware due to Bluetooth Low Energy (BLE) firmware changes.
- **New Method:** We present **BrainImation** (`https://kylemath.github.io/Brainimation/`), a zero-install, single-page browser Integrated Development Environment (IDE) that bridges consumer WebBluetooth EEG headsets (InteraXon Muse 2016, Muse 2, and Muse S) directly with the `p5.js` and `p5.sound` ecosystems. We engineer a two-phase WebBluetooth GATT handshake (`muse-browser.js`) that resolves the lazy characteristic advertisement deadlock on Muse 2/S firmware, paired with a dynamic prototype introspection sandbox (`bindP5Functions`), a 256-sample Hanning-windowed radix-2 FFT with $>150\ \mu\text{V}$ EOG/EMG artifact rejection, a 256 Hz 4-channel physiological simulator (`EEGSimulator`), and 36 scaffolded example sketches ($\text{median} = 32\text{ LOC}$).
- **Results:** Across $N = 69$ verified programs authored by $N_{\text{students}} = 30$ users, developers expanded the 32-LOC scaffolds fivefold ($\text{median} = 155\text{ LOC}$, participant-clustered $\text{median} = 164\text{ LOC}$, $p < 10^{-11}$, $r_{rb} = 0.99$) to build closed-loop neurofeedback games ($N = 40$, $\text{median} = 121\text{ LOC}$) and online 4-channel ERP paradigms ($N = 29$, $\text{median} = 176\text{ LOC}$).
- **Comparison with Existing Methods:** Compared to native LSL pipelines and legacy `muse-js` (473.0 KB, which fails on Muse 2/S with `DOMException`), `muse-browser.js` reduces bundle size by $24.6\times$ (19.2 KB), restores 100% Muse 2/S compatibility, and eliminates external daemon installation.
- **Conclusions:** BrainImation provides a self-contained, zero-install methodological platform for closed-loop EEG, multi-band sonification, and online ERP experimentation.

**Keywords:** Electroencephalography (EEG); Brain–Computer Interface (BCI); Neurofeedback; WebBluetooth; Creative Coding (`p5.js`); Sonification; Event-Related Potentials (ERP)

### Highlights (*Journal of Neuroscience Methods*)
- Custom 19.2 KB WebBluetooth client fixes Muse 2/S lazy-GATT bug (24.6x smaller).
- Zero-install browser IDE unites 256 Hz EEG, p5.js WebGL, and Web Audio FM synthesis.
- Dual-source `eegData` engine provides 256-pt Hanning FFT and 4-ch 256 Hz simulation.
- 94-API snippet reference and 36 scaffolds (median 32 LOC) accelerate BCI authoring.
- Validated across 69 BCI and 4-ch ERP programs from 30 novice users ($p < 10^{-11}$).

---

## 1. Introduction

Closed-loop brain–computer interfaces (BCIs) and neurofeedback systems translate ongoing oscillatory or evoked neural activity into real-time visual, auditory, or mechanical outputs, enabling users to self-regulate cortical states or control interactive applications (Sitaram et al., 2017; Enriquez-Geppert et al., 2017; Lotte et al., 2013). Beyond clinical rehabilitation, closed-loop EEG holds broad promise for neuroscience education, computational media art, and brain–computer music interfacing (BCMI; Miranda & Castet, 2014). While browser-based electrophysiology dashboards such as *EEGEdu* (https://eegedu.com) allow students to inspect live time-domain waveforms, power spectra, and canonical frequency bands through pre-built graphical interfaces, a fundamental pedagogical bottleneck remains at the end of any guided dashboard curriculum: how can students, artists, and novice researchers transition from passively observing pre-configured charts to actively programming their own closed-loop neurofeedback environments, audio synthesizers, and cognitive neuroscience experiments?

As Seymour Papert's theory of constructionism (Papert, 1980) and decades of creative-coding pedagogy in `Processing` (Reas & Fry, 2007), `Scratch` (Resnick et al., 2009), and `p5.js` (McCarthy et al., 2015) have established, learners achieve deep computational and scientific fluency when environments provide a "low floor" (an immediate, frictionless entry point), a "high ceiling" (the capacity to build sophisticated, research-grade systems), and "wide walls" (support for diverse expressive modalities, from generative art and music to experimental psychology). In conventional BCI workflows, however, the entry floor is prohibitively high. Modulating a simple visual shape or audio oscillator with live alpha waves ($8\text{--}12\text{ Hz}$) typically requires stitching together an operating-system-specific Bluetooth daemon (`BlueMuse` or `muse-lsl`), a Lab Streaming Layer (LSL) network socket, a background Python or C++ digital signal processing (DSP) script, and a separate rendering engine such as Unity, PsychoPy, or Max/MSP. Each inter-process boundary introduces cross-platform installation failures, network latency, and hundreds of lines of threading and serialization boilerplate.

Here we eliminate this barrier with **BrainImation** (https://github.com/kylemath/Brainimation), a zero-install, single-page browser IDE that unites real-time WebBluetooth electrophysiology with the `p5.js` and `p5.sound` creative-coding ecosystems (McCarthy et al., 2015) (**Figure 1**). By opening a single URL in Chrome, Edge, or Opera, a student can pair a consumer Muse headband (Krigolson et al., 2017; Kuziek et al., 2017)—or activate a 256 Hz multi-channel physiological simulator in any modern browser—and author a live closed-loop neurofeedback visualization in just 11 executable lines of JavaScript (`examples/basic.js`):

```javascript
function setup() {
  colorMode(HSB, 360, 100, 100);
}
function draw() {
  background(0, 0, 10);
  let size = map(eegData.alpha, 0, 1, 50, 300);
  let hue = map(eegData.attention, 0, 1, 180, 360);
  fill(hue, 80, 90);
  noStroke();
  ellipse(width/2, height/2, size, size);
}
```

---

## 2. Systems Architecture and Core Engineering Solutions

### 2.1 Solving the Muse 2 / Muse S Lazy-GATT Advertisement Bug in WebBluetooth

A critical systems engineering contribution of BrainImation is our custom zero-dependency WebBluetooth client (`muse-browser.js`; **Figure 1A** and **Table 1**), which reduces compiled bundle size by $24.6\times$ ($19.2\text{ KB}$ vs. $473.0\text{ KB}$ for legacy `muse-js` + `RxJS`) while resolving a fatal connection failure mode on modern Muse 2 and Muse S firmware.

| Metric | Legacy `muse-js` | `muse-browser.js` |
| :--- | :--- | :--- |
| **Bundle Size** | $473.0\text{ KB}$ (w/ `RxJS`) | **$19.2\text{ KB}$ ($24.6\times$ smaller)** |
| **GATT Discovery** | Eager in `connect()` | **Two-Phase Lazy Handshake** |
| **Muse 2016** | Partial (PPG crash) | **100% Compatible** |
| **Muse 2 / Muse S** | Fails (`NotFoundError`) | **100% Compatible** |
| **ADC Decoding** | Offset binary | **Offset binary + `zipSamples`** |

Legacy WebBluetooth wrappers attempt to enumerate and bind the Control characteristic (`273e0001-4c4d-454d-96be-f03bac821358`) and all four 256 Hz EEG electrode characteristics (`273e0003` through `273e0006` for `TP9`, `AF7`, `AF8`, `TP10`) simultaneously inside `connect()` immediately upon attaching to primary GATT service `0xFE8D`. However, diagnostic inspection of newer Muse 2 and Muse S hardware revealed that modern firmware implements *lazy GATT characteristic advertisement* as a power-saving measure: upon initial connection, only the Control characteristic (`273e0001`) is exposed in the GATT attribute table. The four EEG data characteristics do not materialize until the host writes a preset selection command (`"p21"`) and stream-start command (`"s"`) to `273e0001`. Eagerly querying `273e0003..0006` inside `connect()` therefore triggers a chicken-and-egg deadlock, throwing a fatal `DOMException: No Characteristics matching UUID found` before `start()` can ever be called.

Our two-phase initialization protocol in `muse-browser.js` and `MuseEEGManager` resolves this hardware race condition deterministically while replacing heavy external reactive dependencies with a lightweight zero-dependency `SimpleSubject`/`BehaviorSubject` stream architecture. Length-prefixed ASCII control commands are serialized via `encodeCommand(cmd)` as `[cmd.length + 1, ...charCodes, 0x0a]`. Incoming 20-byte BLE notification packets (containing a 16-bit unsigned packet sequence index followed by twelve packed 12-bit unsigned offset-binary samples at $f_s = 256\text{ Hz}$) are unpacked via bitwise shift-and-mask operations in `decodeEEGSamples()` and scaled to microvolts centered at mid-scale ($2048 = \texttt{0x800}$):

$$V_{i} = 0.48828125 \times \left( s_{i} - 2048 \right) \ \mu\text{V}, \qquad i \in \{0, \dots, 11\}.$$

### 2.2 Dual-Source Signal Abstraction (`window.eegData`), 256-Point Hanning FFT, and 256 Hz Simulator (`EEGSimulator`)

To guarantee that student code executes identically whether connected to a physical Muse headband in the teaching laboratory or developed offline on a personal laptop at home, `MuseEEGManager` and `EEGSimulator` both populate a unified global state object, `window.eegData`. This object exposes three complementary tiers of real-time neural data.

At the spectral level, `MuseEEGManager.calculateFrequencyBands()` computes normalized frequency bands scaled to $[0.0, 1.0]$—`eegData.delta` ($1\text{--}4\text{ Hz}$), `eegData.theta` ($4\text{--}8\text{ Hz}$), `eegData.alpha` ($8\text{--}12\text{ Hz}$), `eegData.beta` ($13\text{--}30\text{ Hz}$), and `eegData.gamma` ($30\text{--}50\text{ Hz}$)—from sliding $N = 256$-sample ($1.0\text{ s}$ at $f_s = 256\text{ Hz}$, yielding a Rayleigh frequency bin resolution of $\Delta f = f_s / N = 1.0\text{ Hz}$) electrode windows across `TP9`, `AF7`, `AF8`, and `TP10`. For each channel $c$, the DC mean $\bar{x}_c$ is subtracted and the centered window is screened for gross ocular (EOG) or frontalis/temporalis myogenic (EMG) artifacts; any channel window exceeding $\max_{n} |x_c[n] - \bar{x}_c| > 150\ \mu\text{V}$ is rejected before spectral estimation so that eye blinks or jaw clenches do not masquerade as oscillatory band power. Artifact-free windows are tapered with a 256-point Hanning window, $w[n] = 0.5\big(1 - \cos(2\pi n / (N - 1))\big)$, and transformed via an in-place radix-2 Cooley–Tukey FFT (`computeRadix2FFT()`) to obtain single-sided power spectral density estimates $P_c[k] = (2 / N^2)\big(\text{Re}(X_c[k])^2 + \text{Im}(X_c[k])^2\big)$ at integer frequencies $k \in \{1, \dots, 50\}\text{ Hz}$. Band powers are averaged across valid electrodes, weighted by $1/f$ compensation gains ($w_b \in \{0.35, 0.75, 1.00, 2.20, 4.00\}$ for $\delta, \theta, \alpha, \beta, \gamma$) to equalize canonical dynamic ranges, and normalized by total weighted broadband power into $[0.0, 1.0]$. At the cognitive-state level, `window.eegData` computes composite indices in $[0.0, 1.0]$ for `eegData.attention` via $(\beta + \gamma)/2$ and `eegData.meditation` via $(\alpha + \theta)/2$. At the sample level, it maintains 256 Hz multi-channel time-series ring buffers, including `eegData.raw` (instantaneous 4-element vector in $\mu\text{V}$), `eegData.rawHistory` (1,000-sample rolling FIFO queues per channel), `eegData.getRawChannel(ch, N)`, `eegData.getAllChannels(N)`, and `eegData.getRecentEpoch(N)`, which returns a transposed $N \times 4$ sample-by-electrode matrix for online ERP epoching.

When a learner clicks `Simulate Data`, `EEGSimulator` (**Figure 2B**) reveals interactive Attention ($A_0 \in [0,1]$) and Meditation ($M_0 \in [0,1]$) sliders in the IDE sidebar, pre-populates $1.0\text{ s}$ (256 samples) of history, and streams 8 samples every $31.25\text{ ms}$ (maintaining an exact $f_s = 256\text{ Hz}$ multi-channel sampling rate). For each electrode $c \in \{0,1,2,3\}$ (`TP9`, `AF7`, `AF8`, `TP10`), microvolt time series $V_c(t)$ at $t = n / 256\text{ s}$ are synthesized as a multi-band oscillatory superposition with slow baseline drift, broadband sensor noise, bilateral anterior frontal eye-blink artifacts, and optional stimulus-locked ERP waveforms:

$$V_c(t) = 30\alpha(t)\sin\!\big(2\pi(9 + 0.5c)t\big) + 20\beta(t)\sin\!\big(2\pi(18 + 1.5c)t\big) + 25\theta(t)\sin\!\big(2\pi(6 + 0.3c)t\big) + 40\delta(t)\sin\!\big(2\pi(2 + 0.2c)t\big) + 10\gamma(t)\sin\!\big(2\pi(35 + 2c)t\big) + 5\sin(2\pi \cdot 0.1t) + \eta_c(t) + \mathbb{I}_{c \in \{1,2\}} B(t) + E_{\text{ERP}}(t),$$

where $\eta_c(t) \sim \mathcal{U}(-7.5, 7.5)\ \mu\text{V}$ models broadband sensor noise, $\mathbb{I}_{c \in \{1,2\}} B(t)$ injects synchronous bilateral Gaussian ocular blink deflections ($B(t) = 115\exp(-(t - t_{\text{blink}})^2 / (2\sigma_b^2))\ \mu\text{V}$, $\sigma_b = 25\text{ ms}$) onto the anterior frontal channels (`AF7`, `AF8`) with Bernoulli probability $p = 0.001$ per sample (**Figure 2B**), and $E_{\text{ERP}}(t)$ injects time-locked N170 ($-6.5\ \mu\text{V}$ at $+170\text{ ms}$) and P300 ($+9.5\ \mu\text{V}$ at $+340\text{ ms}$) components whenever a sketch invokes `eegData.triggerERP()`.

### 2.3 Dynamic Prototype Introspection and Lifecycle Sandbox (`bindP5Functions`)

BrainImation resolves the `p5.js` global-versus-instance mode conflict via dynamic prototype introspection (`bindP5Functions()` in `CodeEditor.runCode()`). Whenever a sketch runs, BrainImation destroys the prior `p5` instance, instantiates a fresh sandbox attached to `#canvas-container`, and iterates over all enumerable and prototype properties of the instance (`for (let prop in p)`), automatically binding every method to `window` while copying mathematical and rendering constants (`PI`, `TWO_PI`, `HSB`, `WEBGL`) and exposing all `p5.sound` synthesis classes (`p5.Oscillator`, `p5.PolySynth`, `p5.MonoSynth`, `p5.FFT`, `p5.Amplitude`, `p5.Reverb`, `p5.Delay`, `p5.Filter`). The sandbox then evaluates the student's code in global scope, captures up to 15 user-defined lifecycle and interaction hooks (the 2 core lifecycle hooks `setup` and `draw`, plus 13 DOM/input hooks: `windowResized`, `mousePressed`, `mouseReleased`, `mouseClicked`, `mouseMoved`, `mouseDragged`, `mouseWheel`, `keyPressed`, `keyReleased`, `keyTyped`, `touchStarted`, `touchMoved`, and `touchEnded`), and synchronizes dynamic system variables (`frameCount`, `mouseX`, `mouseY`, `key`, `keyCode`, `touches`) on every animation frame.

---

## 3. Pedagogical IDE Scaffolding, Reference Tooling, and Serverless Portfolio Workflow

### 3.1 Context-Aware Monaco Autocomplete and Snippet-Injecting Reference Panel

BrainImation pairs Microsoft's VS Code Monaco editor with two synchronized code-discovery engines (**Figure 2A**). First, using `monaco.languages.registerCompletionItemProvider`, the editor provides context-aware `eegData` and `p5` IntelliSense by inspecting the token preceding the cursor on every keystroke. Typing `eegData.` filters the completion menu exclusively to the 13 EEG properties and ring-buffer methods, whereas general typing surfaces all 94 curated API primitives. Second, a collapsible right-hand drawer (`ReferencePanel`) organizes the 94 primitives into 22 groups across four documentation tabs—*P5.js* (38 primitives across Drawing [9], Color [8], Math [8], Transform [5], Control [4], and Text [4]), *Input* (27 primitives across Mouse Events [6], Mouse Variables [6], Keyboard Events [3], Keyboard Variables [3], Touch Events [3], Touch Variables [3], and Interactive Templates [3]), *Sound* (16 primitives across Effects [5], Control [4], Synthesizers [3], Sound Files [2], and Spectral Analysis [2]), and *EEG Data* (13 primitives across Frequency Bands [5], Raw Data Access [4], Derived Metrics [2], and Connection Status [2])—plus a fifth *AI Helper* tab.

### 3.2 Web Audio Diagnostic Synthesizer (`SoundTester`) and Client-Side AI Assistant (`AIAssistant`)

BrainImation includes a dedicated `Test Sound` diagnostic engine (`SoundTester`) in the top toolbar that executes a five-stage automated verification in the System Log, checking CDN availability of `p5.Oscillator`, verifying browser `AudioContext` support, inspecting and explicitly resuming any `suspended` audio context via `userStartAudio()`, bypassing user code to instantiate an isolated 440 Hz (`A4`) sine-wave reference oscillator, and ramping envelope amplitude to $0.3$ for $1.0\text{ s}$ with step-by-step pass/fail telemetry. The fifth tab of the reference drawer hosts a privacy-preserving, client-side AI Code Assistant (`AIAssistant`) where students can optionally supply their own OpenAI or Anthropic API key stored strictly in browser `localStorage`.

### 3.3 Serverless URL Sketch Loading (`?sketch=`) and Course Portfolio Pipeline

`CodeEditor.checkAndLoadFromURL()` implements a serverless code-sharing protocol via URL query parameters (`?sketch=` or `?code=`, plus optional `&autorun=true`), sequenced inside the Monaco AMD loader callback prior to default sketch initialization, alongside self-contained Base64 Data URIs (`?sketch=data:text/plain;base64,...`).

### 3.4 The 10-Category Pedagogical Scaffold Curriculum (36 Built-In Sketches)

BrainImation provides a manifest-driven library of 36 built-in example sketches organized across 10 progressive categories (**Figure 1C** and **Figure 2C,D**), with a median executable code length of $32\text{ LOC}$ ($\text{IQR} = 27\text{--}36\text{ LOC}$, range $11\text{--}111\text{ LOC}$).

---

## 4. Multi-Band Sonification, Online ERP Averaging, and Closed-Loop Signal Conditioning

### 4.1 Real-Time Web Audio Sonification and Chowning FM Synthesis

Three progressive scaffolds in the *Sound & Music* category (`brainBeats.js`, 75 LOC; `alphaMusic.js`, 94 LOC, mapping `alpha` to C-major pentatonic pitches, `attention` to `200–800 ms` `millis()` inter-onset tempo, `meditation` to `0.3–1.0` note velocity, and `beta` to `0.1–0.5 s` sustain; and `brainSynth.js`, 111 LOC; **Figure 3A,B**) illustrate how FFT-derived neural metrics drive Web Audio synthesis graphs. In `brainSynth.js`, a four-dimensional Chowning frequency-modulation (FM) synthesizer disconnects a sinusoidal modulator oscillator from the master output and patches it directly into the frequency control node of a carrier oscillator (`carrier.freq(modulator)`):

$$s(t) = A(\text{att}) \sin\!\left( 2\pi f_{c}(\alpha)\, t + \frac{\Delta f(\theta)}{f_{m}(\beta)} \sin\!\big(2\pi f_{m}(\beta)\, t\big) \right),$$

where `alpha` controls carrier pitch $f_c(\alpha) = 200 + 600\alpha\text{ Hz}$, `beta` drives modulation frequency $f_m(\beta) = 100\beta\text{ Hz}$, `theta` governs modulation depth $\Delta f(\theta) = 500\theta\text{ Hz}$, and `attention` scales master envelope gain $A \in [0, 0.2]$ using a $100\text{ ms}$ Web Audio slew-rate ramp (`carrier.amp(volume, 0.1)`) to eliminate 60 Hz frame-boundary clicks.

### 4.2 Multi-Channel 256 Hz Oscilloscopes and Online ERP Grand Averaging (`epochs.js`)

In the *Raw EEG Data* category, `eegtrace.js` (44 LOC) and `multichannel.js` (44 LOC) render scrolling 4-channel microvolt oscilloscopes, while `epochs.js` (85 LOC; **Figure 3C**) implements triggered online ERP ensemble averaging. Every 90 frames ($\sim 1.5\text{ s}$), the sketch presents a visual stimulus flash at $t = 0\text{ ms}$ and waits 48 frames ($+800\text{ ms} = 205$ post-stimulus samples at 256 Hz) before calling `eegData.getRecentEpoch(256)` to retrieve the complete $L = 256$-sample ($1,000\text{ ms}$) epoch spanning $-200\text{ ms}$ ($L_{\text{pre}} = 51$ baseline samples) to $+800\text{ ms}$ ($205$ post-stimulus samples). Subtracting the pre-stimulus baseline mean across $j \in \{0, \dots, L_{\text{pre}}-1\}$ yields the running grand average across $K$ trials:

$$\widehat{\text{ERP}}_{c}(t_i) = \frac{1}{K} \sum_{k=1}^{K} \left( E^{(k)}_{i,c} - \frac{1}{L_{\text{pre}}} \sum_{j=0}^{L_{\text{pre}}-1} E^{(k)}_{j,c} \right).$$

As shown in **Figure 3C**, progressive ensemble averaging across $K = 1, 5,$ and $20$ trials suppresses background unaveraged EEG noise ($\text{pre-stimulus RMS} = 17.4\ \mu\text{V}$ at $K = 1$ vs. $5.7\ \mu\text{V}$ at $K = 5$ and $2.7\ \mu\text{V}$ at $K = 20$), elevating P300 signal-to-noise ratio by $6.3\times$ ($\text{SNR} = 0.55$ at $K = 1$, $1.66$ at $K = 5$, and $3.48$ at $K = 20$) to resolve both the negative N170 deflection ($+170\text{ ms}$) and positive P300 wave ($+340\text{ ms}$).

### 4.3 Closed-Loop Signal Conditioning for Interactive Neurofeedback

Students learn to condition raw `eegData` streams using first-order exponential moving-average (EMA) filters ($\hat{y}_t = \lambda \hat{y}_{t-1} + (1 - \lambda)x_t$, $\lambda \in [0.80, 0.95]$; **Figure 3D**) paired with dual-threshold Schmitt-trigger hysteresis gates ($T_{\text{enter}} > T_{\text{exit}}$) or dwell-time counters (`holdFrames`). At $\lambda = 0.85$ (**Figure 3D**), EMA smoothing reduces frame-to-frame first-difference variance ($\text{Var}(\Delta y_t)$) by $98.4\%$ while preventing false threshold chattering across transient ocular or muscle spikes.

---

## 5. Empirical Classroom Evaluation Across $N = 69$ Submissions from $N_{\text{students}} = 30$ Undergraduate Learners

Across all $N = 69$ verified unique student submissions authored by $N_{\text{students}} = 30$ undergraduate students in `PSYCH 403` (approved by the University of Alberta Research Ethics Board, Protocol `Pro00050069`; **Table 2** and **Figure 4**), students wrote a median of $155\text{ LOC}$ ($\text{mean} = 157.5 \pm 65.7\text{ LOC}$, $\text{IQR} = 116\text{--}189\text{ LOC}$, range $38\text{--}378\text{ LOC}$; Mann–Whitney $U = 2437.0$, $p < 10^{-15}$). When collapsed to a single median LOC per unique student ($N_{\text{students}} = 30$ independent learners), participant-clustered code complexity remained nearly fivefold larger than the built-in scaffolds at a median of $164\text{ LOC}$ ($\text{IQR} = 122\text{--}173\text{ LOC}$, range $87\text{--}302\text{ LOC}$; participant-clustered Mann–Whitney $U = 1074.0$, $p < 10^{-11}$, rank-biserial $r_{rb} = 0.99$). Across verified executable code lines, $66.7\%$ ($46/69$) implemented explicit closed-loop neural signal conditioning, $49.3\%$ ($34/69$) defined custom ES6 classes or particle systems, $44.9\%$ ($31/69$; $77.5\%$ of Cohort 1) used `eegData.alpha`, $42.0\%$ ($29/69$) implemented online 4-channel ERP paradigms, and $39.1\%$ ($27/69$) accessed 256 Hz raw electrode buffers (`TP9`, `AF7`, `AF8`, `TP10`).

---

## 6. Discussion

**BrainImation** establishes a self-contained, constructionist live-coding environment for accessible neurotechnology. While WebBluetooth packet burstiness ($46.875\text{ ms}$ per 12-sample packet) and 60 Hz display loops introduce $\sim 15\text{--}45\text{ ms}$ of software trigger jitter, endogenous ERP components such as the visual N170 and oddball P300 remain resolvable within 20 averaged trials (**Figure 3C** and **Figure 4D**). Similarly, pairing $>150\ \mu\text{V}$ EOG/EMG amplitude screening prior to the 256-point Hanning FFT with explicit simulated frontal blinks in `EEGSimulator` teaches students to distinguish genuine cortical oscillations from cranial muscle and ocular artifacts. Finally, while WebBluetooth hardware pairing requires a Chromium browser (or Bluefy on iOS), `EEGSimulator` and the full Monaco, WebGL, and Web Audio IDE execute across all modern browsers (including Safari and Firefox), providing universal access for neuroscience education.
