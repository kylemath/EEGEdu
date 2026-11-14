# Peer Review: *Psychophysiology* (`Original Article — Methodological Developments`)

**Manuscript Title:** EEGEdu: A Zero-Install, Reactive WebBluetooth Platform for Human Electrophysiology, Time–Frequency Signal Processing, and Brain–Computer Interfaces  
**Authors:** Keyfer P. Mathewson, Kory W. Mathewson, and Kyle E. Mathewson  
**Reviewer:** Reviewer #1 — Dr. Tzvetan Popov (Consulting Editor, *Psychophysiology*; Department of Psychology, University of Zürich; `tzvetan.popov@uzh.ch`)  
**Recommendation:** **Minor-to-Moderate Revisions**

---

## Overall Assessment & Summary of Contribution

In this manuscript, Mathewson, Mathewson, and Mathewson present **EEGEdu** (`https://eegedu.com`), an open-source, zero-install progressive web application (PWA) that acquires 4- and 5-channel electrophysiology at $f_s = 256\text{ Hz}$ from consumer wireless Muse headbands directly inside Chromium browsers via the W3C WebBluetooth GATT API (`muse-js`) and processes the live time series using functional reactive streams (`RxJS` and `@neurosity/pipes`, backed by `fili` and `dsp.js`). The authors structure a 12-module curriculum spanning electrode contact impedance, a clever finger-pinch Lead-I electrocardiogram (ECG) time-to-frequency bridge, multi-channel artifact taxonomy, linear Fast Fourier Transform (FFT) amplitude spectra, canonical frequency band integration, closed-loop `p5.js` neurofeedback, live time–frequency spectrograms, a classroom Berger alpha reactivity experiment, steady-state visual evoked potentials (SSVEPs), oddball event-related potentials (ERPs), and in-browser $k$-nearest neighbors (`ml5.KNNClassifier`) brain–computer interface (BCI) decoding. They validate this architecture using classroom recordings from undergraduate students at the University of Alberta ($N = 86$ roster IDs), supplemented by analytical forward models for the evoked potential modules.

I want to begin by warmly commending the authors. Having spent years developing and teaching open-source `FieldTrip` pipelines and co-authoring the Society for Psychophysiological Research (SPR) guidelines for frequency-domain and time–frequency analyses (Keil et al., 2022), I am acutely aware of how often laboratory instruction and multi-site field recordings stall before a single FFT is ever computed—derailed by operating-system driver incompatibilities, Python/MATLAB dependency conflicts, or broken Lab Streaming Layer (`LSL`) multicast sockets. Moving the entire acquisition, filtering, spectral estimation, stimulus delivery, and spreadsheet logging stack into a zero-install client-side browser sandbox is a genuine technical and pedagogical triumph.

Three aspects of this work deserve particular praise:
1. **The Lead-I ECG Time-to-Frequency Bridge (Modules 2 & 3):** Having students pinch `AF7` and `FPz` to record their own radial-pulse-verifiable QRS complex in the time domain (Module 2) and immediately transform it into a zero-padded frequency spectrum in beats per minute (Module 3) is one of the most intuitive pedagogical bridges between time and frequency domains I have seen in electrophysiology instruction.
2. **Transparent Contrast Between Methodological Failure (Module 6) and Controlled Replication (Module 9):** Rather than hiding the paradoxical finding in Module 6—where an unguided 10-second recording averaged across all four electrodes yielded *higher* apparent 8–12 Hz amplitude during Eyes Open than Eyes Closed ($t(82) = -2.82, p = 0.0060$) due to forehead-referenced (`FPz`) corneo-retinal blink dipoles projecting onto `TP9/TP10`—the authors turn this failure into the centerpiece motivation for Module 9's 60-second fixation protocol, 2-second settling delay, regional separation (`TP9/TP10` vs. `AF7/AF8`), and local flanking-band detrending.
3. **Adherence to SPR Spectral Reporting Standards (Keil et al., 2022) and Periodic/Aperiodic Separation (Donoghue et al., 2020):** The manuscript explicitly defines the discrete Fourier transform normalization (Equations 1–2), clarifies the critical distinction between `@neurosity/pipes`'s one-sided linear amplitude output ($\mu\text{V}$) and true power spectral density ($\mu\text{V}^2/\text{Hz}$), accounts for compositional simplex closure in relative spectra, and evaluates narrowband alpha prominence in both linear relative coordinates and scale-invariant log-decibel ($10\log_{10}$) coordinates.

Despite these considerable strengths, my close inspection of the manuscript (`paper1_eegedu.tex`), the Python analysis/plotting script (`generate_figures.py`), the rendered figures (`fig1`–`fig5`), and the underlying JavaScript source code (`repos/EEGEdu` and `@neurosity/pipes`) revealed several important methodological discrepancies and signal-processing subtleties that must be resolved before publication in *Psychophysiology*. None of these require collecting new data, and all can be addressed through targeted code/figure updates and precise methodological clarifications.

---

## Major Methodological & Spectral Comments

### 1. Discrepancies Between the Live Browser Pipeline (`@neurosity/pipes` / `dsp.js`) and the Offline Python Reconstructions in Figures 2B, 3D, and 5A
A core principle of the SPR time–frequency guidelines (Keil et al., 2022) is that the mathematical transformations reported in the text and figures must match the actual signal-processing pipeline executed on the data—or, where an offline analytical reconstruction differs from the online estimator, that difference must be explicitly justified and mathematically harmonized. Comparing `repos/EEGEdu` against `generate_figures.py` reveals three places where the figure-generation script departs from what EEGEdu actually computes in the browser:

- **Figure 2B (Module 3 Cardiac Spectrum — Demodulation, Tapering, and Units):**
  In the browser (`EEGEduHeartSpectra.js`, lines 51–62, and `@neurosity/pipes` `fft.js`), Module 3 pipes the continuous `AF7` signal through a causal 0.01–20 Hz Butterworth filter, takes a 2,048-sample (8.0 s) **rectangular** (untapered) window, zero-pads it to $N_{\text{FFT}} = 8,192$ bins, and computes the **linear amplitude spectrum** $\hat{A}[k] = \frac{2}{N_{\text{FFT}}}|X[k]|$ via `dsp.js`.
  However, in `generate_figures.py` (lines 168–171), Figure 2B is generated from the 10-second `heart_raw.xlsx` recording (which was already high-pass filtered at 2 Hz in Module 2!) by applying a non-linear half-wave weighted rectification (`qrs_env = np.abs(np.minimum(0, ecg_uv)) + np.maximum(0, ecg_uv)`), multiplying by a **Hann taper** (`np.hanning`), and squaring to **power** (`** 2`).
  While the caption of Figure 2B candidly mentions `"the QRS envelope-demodulated spectrum illustrating Module 3's 0.01–20 Hz passband"`, the main text (lines 257–258) reads as if Figure 2B is a direct recording from Module 3's 0.01 Hz high-pass filter (`"In Module 3, opening the high-pass cutoff to 0.01 Hz while zero-padding the 8.0 s window to 8,192 bins restores the true fundamental peak at 47.6 BPM... Figure 2B"`).
  **Action Required:** Please explicitly state in the Section 3.1 prose (around line 257) that because `heart_raw.xlsx` was exported from Module 2 (where the 2 Hz high-pass filter had already attenuated the 0.793 Hz fundamental), Figure 2B uses QRS envelope demodulation of that same 10-second waveform to analytically reconstruct the fundamental + harmonic series that students observe live when Module 3 opens the high-pass cutoff to 0.01 Hz. In addition, please note in the caption why a Hann taper and normalized squared power are plotted in Panel 2B (or plot linear amplitude to match EEGEdu's y-axis).

- **Figure 3D vs. `EEGEduSpectro.js` (Module 8 Time–Frequency Waterfall):**
  In the manuscript text (line 235 and Figure 3 caption, line 266), Module 8 (`EEGEduSpectro`) is described as rendering a rolling spectrogram on channel `AF7` (128-sample / 0.5 s window, 16-sample step, 128 bins), and Figure 3D's caption states `"Time–frequency waterfall spectrogram (Module 8, EEGEduSpectro) across the 27 sequential epochs on TP9 (dB re: 1 uV)"` with colorbar label `"Spectral Level (10 log10[A / 1 uV])"`.
  First, in the actual EEGEdu JavaScript code (`sketchSpectro.js`, lines 37–38), the browser waterfall maps **linear** amplitude directly to 8-bit grayscale (`let c = (value / 5) * 255; p.fill(c, c, c)`), whereas Figure 3D plots $10\log_{10}(\hat{A})$ using a `magma` colormap from Module 5's exported `eeg_spectra.xlsx` on `TP9`.
  Second, from a strict signal-processing standpoint, **decibels of linear voltage amplitude** relative to $1\ \mu\text{V}$ are defined as $20\log_{10}(\hat{A} / 1\ \mu\text{V})$, whereas $10\log_{10}(\cdot)$ is reserved for squared power ratios! Using $10\log_{10}(\hat{A} / 1\ \mu\text{V})$ compresses the decibel scale by a factor of 2 (i.e., a 10-fold voltage blink spike from $1\ \mu\text{V}$ to $10\ \mu\text{V}$ is plotted as $+10\text{ dB}$ instead of $+20\text{ dB}$). (This same factor-of-2 distinction appears in Section 3.3, line 327, where $\Delta L_{\alpha} = 10\log_{10}\hat{A}$ is called `"Log-dB (10 log10) Bump"`; while the authors rightly note on line 327 that multiplying by 2 leaves all $t$-statistics, $p$-values, and $d_z$ values strictly invariant, calling $10\log_{10}(\text{Amplitude})$ "decibels" violates standard IEEE/IEC and SPR acoustic/electrical conventions, where $\text{dB} = 10\log_{10}(P/P_0) = 20\log_{10}(A/A_0)$).
  **Action Required:** Either (a) multiply the log-amplitude values by 20 ($20\log_{10}[\hat{A}/1\ \mu\text{V}]$ in Figure 3D and $20\log_{10}\hat{A}$ in Table 1 / Section 3.3 so that the reported values are true electrical decibels of power/amplitude), or (b) explicitly define the unit as `"bel-scaled log-amplitude (10 log10 A, equivalent to half-decibels of power)"`. Furthermore, clarify in the Figure 3D caption that Panel D is a log-transformed time–frequency representation reconstructed from the 27 sequential `TP9` epochs of `eeg_spectra.xlsx`.

- **Figure 5A (Module 10 SSVEP Forward Model — Windowing, Duration, and Units):**
  In Module 10 (`EEGEduSsvep.js`, lines 30–42), EEGEdu uses `duration: 1024`, `bins: 256`—meaning `@neurosity/pipes` slices the trailing **256 samples (1.0 s rectangular window)** and computes the **one-sided linear amplitude spectrum ($\mu\text{V}$)** at $\Delta f = 1.0\text{ Hz}$ bin spacing.
  In `generate_figures.py` (lines 526–543), however, Figure 5A simulates 4.0-second (1,024-sample) Hann-windowed epochs ($\Delta f = 0.25\text{ Hz}$) and plots `(np.abs(np.fft.rfft(sig * np.hanning(len(t_ep)))) / len(t_ep)) ** 2 * 2.0`, labeling the y-axis `"Spectral Power (\muV^2/Hz)"`.
  Note the mathematical scaling bug in line 541 of `generate_figures.py`:
  $$\left(\frac{|X[k]|}{N}\right)^2 \times 2 = \frac{2}{N^2}|X[k]|^2 \quad (\text{units: }\mu\text{V}^2\text{, NOT }\mu\text{V}^2/\text{Hz!})$$
  Compare this against the authors' own correct Equation 2 in the manuscript (`paper1_eegedu.tex`, line 213):
  $$\hat{S}_c[k] = \frac{2}{N_{\text{FFT}} f_s}|X_c[k]|^2 = \frac{1}{2\Delta f} \hat{A}_c[k]^2 \quad (\mu\text{V}^2/\text{Hz}).$$
  Because $\Delta f = f_s / N = 256 / 1024 = 0.25\text{ Hz}$, dividing by $N^2$ instead of $N f_s$ underestimates the true PSD by a factor of $1/\Delta f = 4.0$ (and also omits the Hann window coherent/incoherent power correction factor $U = \frac{1}{N}\sum w[n]^2 = 0.375$).
  **Action Required:** In `generate_figures.py` (line 541), either (a) plot the one-sided linear amplitude spectrum ($\mu\text{V}$) to match Equation 1 and Module 10's actual y-axis, or (b) correct the PSD normalization to divide by $\Delta f$ and account for the Hann window energy (or relabel the y-axis as `"Windowed Spectral Power (\muV^2)"`), and note in the caption why a 4.0 s ($0.25\text{ Hz}$ bin) window is shown to visually resolve the 9.5 Hz endogenous alpha peak between the 8 Hz ($2f_1$) and 11 Hz ($f_2$) peaks.

---

### 2. Exact Filter Order and Roll-Off of `@neurosity/pipes` (`fili` Cascade Architecture)
In Section 2.2 (line 204), the manuscript states:
> *"Prior to windowing, the bandpass operator passes each continuous channel sample-by-sample through a cascade of causal second-order Butterworth infinite impulse response (IIR) biquad sections at 256 Hz (`bandpassFilter` via `fili` `CalcCascades`, $-12\text{ dB/octave}$ roll-off per section, causal nonlinear phase)."*

And in the Impact Statement (line 161), it refers to *"causal Butterworth filtering"*. Having inspected `@neurosity/pipes` (`bandpassFilter.js`) and `fili` (`calcCascades.js`), I want to make sure the exact filter order is stated unambiguously in accordance with Keil et al. (2022):
- In `@neurosity/pipes`, `ORDER = 2` is passed to `calc.highpass({ order: 2, characteristic: 'butterworth', Fs: 256, Fc: cutOffLow })` and `calc.lowpass({ order: 2, characteristic: 'butterworth', Fs: 256, Fc: cutOffHigh })`, which are then connected in series (`low.singleStep(high.singleStep(channel))`).
- In `fili`'s `calcCascades.js` (line 20), `for (n = 0; n < r.order; n++)` creates `r.order` **second-order biquad sections**! Thus, `order: 2` in `fili` actually instantiates a cascade of **two 2nd-order biquads = a 4th-order Butterworth high-pass filter ($-24\text{ dB/octave}$ roll-off)** in series with **two 2nd-order biquads = a 4th-order Butterworth low-pass filter ($-24\text{ dB/octave}$ roll-off)** (an 8-pole bandpass cascade overall).
- **Action Required:** Please state this exact filter order in Section 2.2 (line 204): namely, that `@neurosity/pipes` defaults to `order = 2` biquad sections per cutoff in `fili`, yielding a causal **4th-order Butterworth high-pass filter ($-24\text{ dB/octave}$)** cascaded with a **4th-order Butterworth low-pass filter ($-24\text{ dB/octave}$)**.

---

### 3. The "1,024-Sample Epoch / Trailing 256-Sample FFT" Truncation Behavior in `@neurosity/pipes`
In Section 2.2 (lines 216–217), the authors provide a remarkably transparent explanation of a quirk inside `@neurosity/pipes`:
> *"In the standard spectral modules (Modules 5, 6, 9, and 10), although the epoch buffer holds 1,024 samples (4.0 s) advancing every 100 samples (0.3906 s), the 256-bin Fourier transform slices and transforms the trailing 256 samples (1.0 s aperture, yielding clean 1.0 Hz integer frequency bins; `safeSamples.slice(safeSamples.length - bins)`)."*

I applaud the authors for documenting this exact line of `@neurosity/pipes` source code rather than pretending that a 1,024-sample epoch produces a 4.0-second FFT when `bins: 256`! However, this creates an important pedagogical trap inside the EEGEdu UI that should be explicitly flagged for instructors and readers:
- In Modules 5, 6, 8, 9, and 10, the top slider in the UI is labeled `"Epoch duration (Sampling Points): 1024"` (configurable from 128 to 4,096 samples), while `Settings.bins` is hardcoded to `256` (or `128` in Module 8).
- Because `@neurosity/pipes`'s `fft` operator truncates any epoch longer than `bins` to its trailing `bins` samples (`safeSamples.slice(safeSamples.length - bins)`), **moving the "Epoch duration" slider above 256 in Modules 5, 6, 9, and 10 (or above 128 in Module 8) has zero effect on the actual FFT window length or frequency resolution ($\Delta f = f_s / \text{bins}$), and only increases the initial buffer fill delay before the first spectrum is emitted!** Conversely, in Module 8 (`EEGEduSpectro`, line 235), the manuscript states that the spectrogram *"provides an interactive demonstration of the Gabor time–frequency uncertainty trade-off as users manipulate window duration"*, yet `bins` is fixed at 128, so increasing `duration` above 128 simply slices the last 128 samples without narrowing $\Delta f$, while decreasing `duration` cannot go below `min={128}`!
- Furthermore, in `EEGEduSpectra.js` (line 450, instructional text on screen), the app text tells students *"Each row therefore represents an estimate from the previous 8 seconds of data EEG data"*, which is a copy-paste holdover from Module 3 (`HeartSpectra`).
- **Action Required:** Please clarify in Section 2.2 / Section 2.3 (around lines 216 and 235) how the `duration` slider interacts with fixed `bins` in `@neurosity/pipes` (specifically noting that demonstrating the Gabor time–frequency trade-off in Module 8 requires either coupling `bins` to `duration` or observing the temporal smoothing vs. step-interval trade-off, and noting that future versions of EEGEdu/pipes can link `bins = duration`).

---

### 4. Discrepancy in Canonical Band Boundaries Between `@neurosity/pipes` (`powerByBand`) and `generate_figures.py` (Module 6, Figure 3C)
In Section 2.2 (line 217) and the Figure 3C caption (line 266), the manuscript states that `@neurosity/pipes`'s `powerByBand` operator averages spectral amplitude across disjoint integer frequency bins:
> *"delta (1–4 Hz), theta (5–7 Hz), alpha (8–12 Hz), beta (13–30 Hz), and gamma (31–38 Hz; `powerByBand`)."*

However, inspecting `@neurosity/pipes` (`src/constants/index.js` and `sliceFFT.js`) reveals that `FREQUENCY_BANDS` in `@neurosity/pipes` is actually defined with inclusive (`>= min && <= max`) floating-point bounds:
```javascript
const FREQUENCY_BANDS = {
  delta: [0.1, 4],
  theta: [4, 7.5],
  alpha: [7.5, 12.5],
  beta: [12.5, 30],
  gamma: [30, 100]
};
```
When evaluated on a 256-bin FFT at $f_s = 256\text{ Hz}$ (where `freqs` are the exact integers $0, 1, 2, \dots, 127\text{ Hz}$):
- `delta` (`[0.1, 4]`) averages bins **1, 2, 3, 4 Hz**;
- `theta` (`[4, 7.5]`) averages bins **4, 5, 6, 7 Hz** (sharing the **4 Hz** boundary bin with delta!);
- `alpha` (`[7.5, 12.5]`) averages bins **8, 9, 10, 11, 12 Hz**;
- `beta` (`[12.5, 30]`) averages bins **13, 14, ..., 30 Hz**;
- `gamma` (`[30, 100]`) averages bins **30, 31, ..., 100 Hz** (sharing the **30 Hz** boundary bin with beta, and extending up to 100 Hz rather than 38 Hz!).

In contrast, Figure 3C (`generate_figures.py`, line 350) computes band means offline from Module 5's `eeg_spectra.xlsx` (which was sliced to 1–38 Hz) using disjoint integer ranges `[(1, 4), (5, 7), (8, 12), (13, 30), (31, 38)]`.
**Action Required:** This is easy to clarify and is actually a great methodological teaching point! Please note in Section 2.2 (line 217) and the Figure 3C caption (line 266) that `@neurosity/pipes` defines `FREQUENCY_BANDS` as `[0.1, 4]`, `[4, 7.5]`, `[7.5, 12.5]`, `[12.5, 30]`, and `[30, 100]` Hz (which on 1 Hz integer bins includes 4 Hz in both delta and theta, and 30 Hz in both beta and gamma), whereas the offline band summary of `eeg_spectra.xlsx` in Figure 3C evaluates the strictly disjoint integer partitions $1\text{--}4$, $5\text{--}7$, $8\text{--}12$, $13\text{--}30$, and $31\text{--}38\text{ Hz}$.

---

### 5. Module 12 (`EEGEduPredict`) Browser $k$-NN Parameters vs. Offline Cross-Validation Benchmark (Section 3.4 & Figure 5C)
In Section 2.3 (line 243) and Section 3.4 (line 343), the manuscript states that Module 12 uses `ml5.KNNClassifier` with $k = 3$ and unit-$L_2$ normalization (`\tilde{x} = x / ||x||_2`) on `TP9` 1–30 Hz spectra, and then presents a subject-grouped 5-fold cross-validation (`GroupKFold`) benchmark on the $N = 134$ classroom recordings from Module 9.
Inspecting `generate_figures.py` (lines 638–669) and `stats_macros.tex` (lines 181–190) reveals an interesting discrepancy:
1. `generate_figures.py` actually computes **both** a `StandardScaler()` ($z$-scored feature) pipeline (`acc_full = 67.2%, auc_full = 0.72`; `acc_alpha = 72.4%, auc_alpha = 0.79`) **and** a `Normalizer(norm="l2")` (unit-$L_2$) pipeline (`acc_l2_full = 67.9%, auc_l2_full = 0.72`; `acc_l2_alpha = 76.9%, auc_l2_alpha = 0.78`), and exports both sets of macros to `stats_macros.tex` (`\BCIKNNAlphaAcc` = 72.4% vs. `\BCIKNNLTwoAlphaAcc` = 76.9%).
2. However, Figure 5C and the text in Section 3.4 (line 343) report only the `StandardScaler` numbers (`67.2%` and `72.4%`), even though the preceding sentence specifically highlights `ml5.KNNClassifier`'s unit-$L_2$ normalization (`\tilde{x} = x / ||x||_2`), where accuracy on the alpha-prominence features is actually higher (`76.9%`, `\BCIKNNLTwoAlphaAcc`)!
3. Also note that in the browser (`EEGEduPredict.js`), `ml5.KNNClassifier` classifies a single channel (`psd[0]` = `TP9`, 30 bins) across 3 classes (`A`: Eyes Closed, `B`: Eyes Open, `C`: Blinking) using $k = 3$, whereas the offline `GroupKFold` benchmark classifies binary Eyes Open vs. Eyes Closed using bilateral 60-bin spectra ($k = 5$) or 13 engineered alpha-prominence features ($k = 7$).
**Action Required:** In Section 3.4 (line 343), please explicitly distinguish the in-browser within-subject calibration setup (3-class `TP9` 30-bin spectra, $k = 3$) from the offline cross-subject binary decoding benchmark, and report the unit-$L_2$ normalized cross-validation results (`\BCIKNNLTwoFullAcc%` / `\BCIKNNLTwoAlphaAcc%`) alongside the $z$-scored results so the reader sees the exact performance of unit-$L_2$ normalization.

---

### 6. Spectral Leakage of Rectangular Windows and Flanking-Band Selection in Module 9 (Section 3.3, Figure 4)
From the perspective of the SPR guidelines (Keil et al., 2022) and spectral parameterization (Donoghue et al., 2020), the authors' treatment of the Module 9 Berger alpha dataset ($N = 67$) is exemplary in its thoroughness: they test relative percentage amplitude, unnormalized log-amplitude at 10 Hz, linear flanking-detrended prominence, and log-decibel flanking-detrended prominence, and they provide a crystal-clear explanation of compositional simplex closure ($\sum_{k=1}^{30} P_{\text{rel}}(k) = 100\%$) and frontalis EMG relaxation ($19\text{--}27\text{ Hz}$).

Two spectral details in Section 3.3 and Figure 4C–D warrant brief discussion:
1. **Why Temporal Alpha Reactivity Extends from 9 to 15 Hz in Figure 4C:**
   Looking at Figure 4C, the Bonferroni-significant positive paired $t$-statistic on `TP9/TP10` (orange curve) spans **9 to 15 Hz** (with 8 Hz actually sitting at $t \approx +1.2$, below the Bonferroni threshold, while 13, 14, and 15 Hz are strongly positive at $t > +3.2$). Why does eye-closure reactivity extend into low beta (13–15 Hz)? First, young adults frequently exhibit high individual alpha peak frequencies (IAF $\approx 10.5\text{--}12\text{ Hz}$) and split/broad alpha peaks; second, because `@neurosity/pipes` uses an **untapered rectangular window** ($N = 256$), its Dirichlet kernel has $-13\text{ dB}$ first sidelobes that leak narrowband 10–11 Hz alpha energy into adjacent integer bins; third, harmonic/beta co-modulation often accompanies posterior alpha synchronization.
2. **Impact on the Upper Flanking Band ($14\text{--}16\text{ Hz}$):**
   Because the upper flanking reference band used for detrending in Figure 4D is $14\text{--}16\text{ Hz}$ (`flank_idx = ((freqs >= 5) & (freqs <= 7)) | ((freqs >= 14) & (freqs <= 16))`), and 14–15 Hz still shows significant positive eye-closure reactivity on `TP9/TP10` in Figure 4C, subtracting the 14–16 Hz flank is actually a **conservative** estimate of alpha prominence (it slightly subtracts leaked/high-alpha signal during Eyes Closed). Pointing this out in Section 3.3 will preempt any critique about why 14–16 Hz was chosen over a slightly higher flank (e.g., 16–18 Hz) and why a Hann taper is preferable to a rectangular window in future releases of `@neurosity/pipes`.

---

## Minor Textual, Statistical, & Figure Comments

1. **Inconsistent Description of Locked vs. Exposed Sliders in Modules 3 and 12 (`paper1_eegedu.tex`, line 219 vs. `PageSwitcher.js`, lines 338–382):**
   - On line 219, the text states: *"interactive signal-processing sliders in the exploration modules (exposed in Modules 4–10; locked in Modules 1–3 and 11–12 to preserve standardized benchmark timing)"*.
   - In `PageSwitcher.js` (lines 338–382), `pipeSettingsDisplay()` returns `null` for `intro` (Mod 1), `heartRaw` (Mod 2), `heartSpectra` (Mod 3), and `evoked` (Mod 11), and `funPredict.renderSliders()` (Mod 12) also returns `null`. However, in `EEGEduAlpha.js` (Mod 9), sliders *are* rendered on screen even though the instructions (line 218 of `EEGEduAlpha.js`) tell students `"Please DO NOT change any of the settings"`. Meanwhile, on line 204 of `paper1_eegedu.tex`, the authors write: *"roughly 0.16 s for a 2 Hz cutoff, compared to 10–20 s for a 0.01 Hz cutoff in Module 3), which instructors actively use to demonstrate filter impulse responses and settling time."* Since the sliders are hidden (`return null`) in Module 3, instructors would demonstrate the 0.01 Hz settling time either by connecting/resetting Module 3 or by sliding `cutOffLow` down to `0.01 Hz` in Module 4/5. Please phrase line 204 slightly more precisely so readers who inspect the live app at `eegedu.com` are not confused when Module 3 has no sliders.

2. **Module 11 Oddball Target Probability: 25% in Code/Text vs. "20%" in Code Comment (`sketchEvoked.js`, line 52):**
   - In `paper1_eegedu.tex` (line 241), the text correctly reports `"25% targets vs. 75% standards"`, which matches `let targProp = 0.25;` in `sketchEvoked.js` (line 5). (Just as a heads-up to the authors, the inline comment in `sketchEvoked.js` line 52 says `// targets 20% of the time`, even though `targProp = 0.25`).
   - More importantly, in Section 3.4 (line 341) and Figure 5B, please note that while `EEGEduEvoked.js` defaults to `cutOffLow: 2, cutOffHigh: 20` (a 2.0 Hz high-pass filter, which is well known to attenuate and phase-distort the P300 into an artificial post-peak negativity; Tanner et al., 2015; Luck, 2014), the sliders in Module 11 are hidden in `PageSwitcher.js` (`case evoked: return null` at line 375)! Yet line 341 of the manuscript states: *"second, lowering the high-pass filter slider from 2.0 Hz down to 0.1 Hz prevents causal phase distortion of slow late potentials"*. Because `pipeSettingsDisplay()` returns `null` for `evoked`, users cannot actually lower the high-pass filter slider in Module 11 unless they modify the source code or expose `funEvoked.renderSliders` in `PageSwitcher.js`! I strongly recommend either enabling `funEvoked.renderSliders` in `PageSwitcher.js` (and lowering the default `cutOffLow` in `EEGEduEvoked.js` from `2` to `0.1` or `0.5 Hz`) or clarifying in line 341 that the 2.0 Hz high-pass filter in Module 11 illustrates high-pass attenuation of slow ERP components relative to Module 4's 0.1 Hz passband.

3. **Typo in Live UI Screenshot (`fig1_eegedu_curriculum_architecture.png`, Panel A right):**
   - In the live screenshot of Module 4 (`live_ui_raw.png`), the Chart.js title reads `"Raw data from EEG electrdoes"` (typo: `"electrdoes"` in `EEGEduRaw/translations/en.json`). Since it is an unedited screenshot of the live app, this is completely fine, or it can be fixed in the repo.

4. **Visual Inspection of Figures 1–5:**
   - **Figure 1:** Very clean layout, high-resolution UI screenshots, clear 5-stage architectural pipeline, and a well-organized 12-module curriculum table with zero text clipping.
   - **Figure 2:** Panel A clearly displays the 8 R-wave peaks and R–R intervals in `heart_raw.xlsx`. In Panel B, the annotations for `Fundamental (f0) 47.6 BPM (0.79 Hz)`, `2f0 Harmonic (95.2 BPM)`, and `3f0 QRS Harmonic (142.8 BPM = 2.38 Hz)` are crisp and non-overlapping. In Panel C, the paired trajectories and boxplots for Module 2 and Module 3 clearly convey both the consistent within-subject orthostatic increase ($\Delta\text{HR} \approx +9\text{--}10\text{ BPM}$) and the ~21 BPM downward baseline shift in Module 3 due to low-frequency respiratory/movement drift near 0.5 Hz.
   - **Figure 3:** Panel A's $200\ \mu\text{V}$ calibration bar and yellow blink highlight (`2.68–3.62 s`) on `TP9/TP10` vs. `AF7/AF8` are textbook-quality illustrations of differential reference geometry (`FPz`). Panel B and Panel C clearly show the $1/f$ spectrum and canonical band breakdown. In Panel D, the `magma` waterfall is visually clear, though as noted in Major Comment #1, please reconcile the `10 log10[A / 1 uV]` label with the `dB re: 1 uV` caption (`20 log10` vs. `10 log10`).
   - **Figure 4:** Outstanding 4-panel figure. Panels A and B show the grand-average relative amplitude spectra ($\pm 1\text{ SEM}$) for Temporal (`TP9/TP10`) and Frontal (`AF7/AF8`) channels. Panel C's bin-by-bin paired $t$-statistic curves with the $\pm 3.28$ Bonferroni thresholds immediately show why full-spectrum visualization is superior to single-band bar charts: the reader can simultaneously see the 2–6 Hz blink cessation trough on `TP9/TP10`, the 9–15 Hz Berger alpha surge, and the 19–27 Hz frontalis EMG relaxation trough on `AF7/AF8`. Panel D's single-student spaghetti-and-boxplot panel cleanly illustrates the 80.6% ($54/67$) individual replication rate.
   - **Figure 5:** Clean 3-panel layout. In Panel B, the opaque white backdrop behind the $\sqrt{N}$ SNR inset (`SNR: 0.5 -> 5.7`) prevents the gray single-trial trace from bleeding through the inset axes. In Panel C, consider adding the AUC values directly into the legend labels (e.g., `"Full 60-Bin KNN (k = 5, AUC = 0.72)"` and `"Alpha-Prominence KNN (k = 7, AUC = 0.79)"`) or plotting the unit-$L_2$ curve alongside them.

5. **Statistical Verification (`stats_macros.tex`, `stats_summary.json`, and `Table 1`):**
   - I cross-checked every statistical macro injected into `paper1_eegedu.tex` and `Table 1` against `generate_figures.py` and `stats_summary.json`:
     - Roster size: $N = 86$.
     - Module 2 Lead-I ECG (40–200 BPM QC): $N = 67$ ($df = 66$), Standing $87.57 \pm 29.80\text{ BPM}$ vs. Sitting $77.85 \pm 25.18\text{ BPM}$, $\Delta = +9.72\text{ BPM}$, $95\%\text{ CI } [+2.08, +17.37]$, $t(66) = 2.54, p = 0.0135, d_z = 0.31$, Wilcoxon $p = 0.0205$.
     - Module 2 Symmetric Sensitivity (30–200 BPM): $N = 75$ ($df = 74$), Standing $83.32 \pm 31.01\text{ BPM}$ vs. Sitting $75.27 \pm 26.79\text{ BPM}$, $\Delta = +8.05\text{ BPM}$, $t(74) = 2.14, p = 0.0357, d_z = 0.25$, Wilcoxon $p = 0.0269$.
     - Module 3 FFT ECG (30–200 BPM): $N = 76$ ($df = 75$), Standing $65.25 \pm 20.11\text{ BPM}$ vs. Sitting $56.43 \pm 18.60\text{ BPM}$, $\Delta = +8.83\text{ BPM}$, $t(75) = 3.49, p = 8.01\times 10^{-4}, d_z = 0.40$, Wilcoxon $p = 5.33\times 10^{-4}$.
     - Concordance across complete 4-condition ECG rows ($N = 59, df = 58$): Mod 2 $\Delta\text{HR} = +9.59 \pm 31.30\text{ BPM}$ vs. Mod 3 $\Delta\text{HR} = +9.75 \pm 21.85\text{ BPM}$, $t(58) = -0.03, p = 0.974, d_z = 0.00$. (Note: in `generate_figures.py` lines 1237–1239, `\BothECGDiffCILow`, `\BothECGDiffCIHigh`, and `\BothECGDiffDz` are hardcoded strings `"-6.69"`, `"+6.38"`, and `"0.00"` rather than formatted from computed variables—please compute `ci95(b_m2_diff - b_m3_diff)` dynamically just like the other macros!).
     - Module 6 unguided 10-s alpha ($N = 83, df = 82$): Closed $4.67 \pm 4.81\ \mu\text{V}$ vs. Open $5.73 \pm 5.66\ \mu\text{V}$, $\Delta = -1.06\ \mu\text{V}$, $t(82) = -2.82, p = 0.0060, d_z = -0.31$.
     - Module 9 Berger Alpha ($N = 67, df = 66$): Temporal relative alpha $4.84 \pm 0.79\%$ vs. $4.31 \pm 0.62\%$, $t(66) = 5.62, p = 4.24\times 10^{-7}, d_z = 0.69$; Frontal relative alpha $4.25 \pm 0.42\%$ vs. $4.02 \pm 0.46\%$, $t(66) = 3.06, p = 0.0032, d_z = 0.37$; Region $\times$ Condition interaction $t(66) = 2.59, p = 0.0119, d_z = 0.32$; Temporal linear $1/f$ bump $+0.53 \pm 0.87\%$ vs. $-0.16 \pm 0.62\%$, $t(66) = 6.20, p = 4.22\times 10^{-8}, d_z = 0.76$ ($54/67 = 80.6\%$ positive); Temporal log bump $t(66) = 5.96, p = 1.08\times 10^{-7}, d_z = 0.73$; Log interaction $t(66) = 3.03, p = 0.0035, d_z = 0.37$. Every single number is internally consistent across the Python script, JSON summary, LaTeX macros, Table 1, and prose.

6. **Bibliography Formatting (`references1.bib`):**
   - All 18 references in `references1.bib` are cited in the text, complete, and properly formatted for *Psychophysiology*. Consider adding **Tanner, Morgan-Short, & Luck (2015, *Psychophysiology*)** when discussing causal high-pass IIR filter distortion of slow ERP components in Module 11.

---

## Summary Recommendation

This is an original, rigorously validated, and highly practical methodological contribution that will be of immediate value to the *Psychophysiology* readership—both for large-scale undergraduate instruction and for scalable, zero-install out-of-the-lab data collection. Addressing the six methodological/spectral clarifications and the minor code-to-text alignment points above will make this paper a landmark reference for browser-based electrophysiology.

**Signed,**  
**Dr. Tzvetan Popov**  
Consulting Editor, *Psychophysiology*  
University of Zürich
