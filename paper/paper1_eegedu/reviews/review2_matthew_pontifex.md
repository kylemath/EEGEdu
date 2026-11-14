# Peer Review: *Psychophysiology* (`Original Article — Methodological Developments`)

**Manuscript Title:** EEGEdu: A Zero-Install, Reactive WebBluetooth Platform for Human Electrophysiology, Time–Frequency Signal Processing, and Brain–Computer Interfaces  
**Authors:** Keyfer P. Mathewson, Kory W. Mathewson, and Kyle E. Mathewson  
**Reviewer #2:** Dr. Matthew B. Pontifex (*Consulting Editor, Psychophysiology*; Department of Kinesiology, Michigan State University; `pontifex@msu.edu`)

---

## Overall Assessment & Compliments

This manuscript introduces **EEGEdu** (`https://eegedu.com`), an open-source, zero-install Progressive Web Application (PWA) that acquires 256 Hz four- and five-channel electrophysiology from consumer wireless headbands (InteraXon Muse) directly inside any Chromium-based web browser via the W3C WebBluetooth API and processes streaming data using composable functional reactive operators (`muse-js`, `RxJS`, and `@neurosity/pipes`). Across a 12-module progressive curriculum, the platform guides users from dry-electrode impedance/noise checks and a novel Lead-I electrocardiogram (ECG) finger-pinch exercise (bridging time-domain peak counting in Module 2 with zero-padded Fourier spectral peak tracking in Module 3) through multi-channel EEG artifact taxonomy, FFT spectral estimation, canonical band decomposition, closed-loop `p5.js` neurofeedback, rolling spectrograms, steady-state visual evoked potentials (SSVEPs), oddball event-related potentials (ERPs), and in-browser $k$-nearest-neighbor (KNN) brain–computer interface (BCI) classification.

I want to commend the authors on a remarkably well-engineered, pedagogically thoughtful, and transparently documented methodological resource. Anyone who has attempted to deploy `muselsl`, `BlueMuse`, or Lab Streaming Layer (LSL) across 30 to 80 undergraduate laptops running heterogeneous operating systems (Windows, macOS, ChromeOS) knows firsthand the fragility of native Bluetooth stacks and Python dependency management. Moving the entire acquisition, Butterworth IIR filtering, epoching, radix-2 FFT, stimulus presentation, and CSV logging pipeline into the client-side browser sandbox is a genuine technical achievement.

Furthermore, the empirical classroom validation ($N = 86$ roster IDs, REB `Pro00050069`) is unusually rigorous for a methodological/educational software paper:
1. The **cardiac-to-neural bridge** (Modules 2 and 3; Figure 2) is an inspired biophysical teaching device that anchors Fourier harmonics and digital filter cutoffs to a tangible signal before students encounter multi-component cortical EEG.
2. The candid inclusion of the **Module 6 unguided 10-second baseline failure** ($N = 83$, where Eyes Open yielded paradoxically *higher* apparent 8–12 Hz amplitude than Eyes Closed, $t(82) = -2.82, p = 0.0060$, due to forehead-referenced `FPz` ocular blink dipoles projecting onto `TP9/TP10`) compared against the **Module 9 structured 60-second fixation protocol** ($N = 67$, replicating the posterior Berger alpha effect with $t(66) = 5.62, p = 4.24 \times 10^{-7}, d_z = 0.69$) is a textbook demonstration of why experimental control and reference-electrode biophysics matter in psychophysiology.
3. The programmatic synchronization between `generate_figures.py`, `stats_summary.json`, and `stats_macros.tex` ensures high computational reproducibility across the text, Table 1, and Figures 1–5.

Nevertheless, before this manuscript is ready for publication as a *Methodological Developments* article in *Psychophysiology*, several important psychometric, statistical, and methodological issues require revision or explicit clarification. In particular, the manuscript currently conflates **internal spectral consistency across adjacent FFT frequency bins** with **psychometric split-half reliability**, omits key statistical parameters (Wilcoxon signed-rank tests, confidence intervals, and exact $p$-values) for several log-decibel and bin-specific tests, uses a $z$-score pipeline (`StandardScaler`) in the Figure 5C KNN benchmark while describing unit-$L_2$ normalization (`Normalizer(norm="l2")`) as the live `ml5.KNNClassifier` metric, and needs sharper upfront transparency distinguishing which modules are validated via empirical student cohort data versus analytical forward-model simulations.

---

## Major Methodological, Psychometric, & Statistical Comments

### 1. Psychometric Reliability in Module 9: Spectral Consistency Across Adjacent 1 Hz FFT Bins vs. Temporal Epoch-by-Epoch Split-Half Reliability
* **Location:** `paper1_eegedu.tex` (Section 3.3, lines 321–322) and `generate_figures.py` (lines 992–1005).
* **The Issue:** In Section 3.3 (line 321), the authors report:
  > *"Psychometric internal consistency across the five integer alpha bins was high within both conditions, and split-half reliability of the individual alpha reactivity score across odd versus even frequency bins was excellent (Cronbach's $\alpha = 0.67$ Eyes Closed, $\alpha = 0.77$ Eyes Open; Spearman–Brown split-half $r_{\text{SB}} = 0.91$ between $\{8, 10, 12\}\text{ Hz}$ and $\{9, 11\}\text{ Hz}$)."*
  
  In the psychophysiological reliability literature (e.g., Clayson & Miller, 2017; Towers & Allen, 2009; Pontifex et al., 2010), **internal consistency (Cronbach's $\alpha$) and odd/even split-half reliability ($r_{\text{SB}}$) are defined across temporal trials or epochs** (e.g., averaging odd-numbered 1-second FFT windows versus even-numbered 1-second FFT windows across the 60-second recording) to determine how many seconds/epochs of EEG are needed to achieve a stable trait/state estimate.
  
  Because the classroom spreadsheet (`alpha_group.xlsx`) only saved each student's 60-second condition-averaged 1–30 Hz spectrum (rather than the ~148 individual overlapping epochs per 60-second condition), `generate_figures.py` (lines 993–1004) treats the five integer frequency bins (`8, 9, 10, 11, 12 Hz`) as "items" for Cronbach's $\alpha$ and correlates the reactivity of `{8, 10, 12} Hz` against `{9, 11} Hz` for $r_{\text{SB}} = 0.91$.
  
  Critically, correlating `{8, 10, 12} Hz` with `{9, 11} Hz` does **not** measure temporal measurement reliability across recording epochs. Instead, it reflects:
  1. **Spectral bandwidth and smoothness** across the 8–12 Hz band; and
  2. **Deterministic spectral leakage across adjacent DFT bins** caused by the rectangular window in `@neurosity/pipes` (`epoch` + `fft` without a Hann/Hamming taper, Equation 1), whose $\text{sinc}$ Dirichlet kernel has a main-lobe width of $2\Delta f = 2.0\text{ Hz}$ and substantial first-sidelobe coupling ($-13\text{ dB}$) between adjacent integer bins ($k$ and $k \pm 1$). Conversely, Cronbach's $\alpha$ across `8–12 Hz` is actually *penalized* during Eyes Closed ($\alpha = 0.67$ vs. $0.77$ in Eyes Open) precisely because individual differences in Individual Alpha Peak Frequency (IAF; e.g., a student peaking sharply at 9 Hz vs. 11 Hz) cause the 8 Hz and 12 Hz bins to diverge across participants when a narrowband peak emerges above the $1/f$ background!
* **Actionable Solution:**
  1. **Reframe the terminology in Section 3.3 (line 321):** Explicitly distinguish *cross-frequency spectral consistency* (across the five 1 Hz bins within the 8–12 Hz band) from *temporal epoch-by-epoch split-half reliability*. Explain clearly that because the classroom summary spreadsheet stores the 60-second time-averaged spectrum per student, the `{8, 10, 12} Hz` vs. `{9, 11} Hz` correlation ($r_{\text{SB}} = 0.91$) quantifies **inter-bin spectral consistency** of the alpha reactivity effect across interleaved 1 Hz bins (bolstered by continuous narrowband synchronization and rectangular-window spectral interpolation), rather than temporal split-half stability across recording epochs.
  2. **Explain the lower Cronbach's $\alpha$ in Eyes Closed (`0.67`) vs. Eyes Open (`0.77`):** Note briefly that during Eyes Open, the 8–12 Hz bins are dominated by a smooth broadband $1/f$ floor (yielding higher inter-bin covariance, $\alpha = 0.77$), whereas during Eyes Closed, inter-individual variability in peak alpha frequency (IAF between 8.5 and 11.5 Hz) concentrates energy into subset bins, slightly reducing 5-bin homogeneity ($\alpha = 0.67$) while preserving high odd/even frequency-bin reactivity consistency ($r_{\text{SB}} = 0.91$).
  3. **Optional Empirical Addition:** Since `eeg_spectra.xlsx` contains $N = 27$ sequential multi-channel epochs from a single recording (used in Figure 3B–D), you could additionally report the true temporal odd-vs.-even epoch split-half reliability across those 27 epochs in Section 3.2 to demonstrate temporal stability alongside the cross-bin spectral consistency in Section 3.3.

---

### 2. Transparency on Empirical Student Cohort Validation vs. Analytical Forward-Model Benchmarks Across the 12 Modules
* **Location:** Abstract (lines 155–158), Section 2.3 (lines 218–244), Section 3.2 (lines 270–278), and Section 3.4 (lines 336–344; Figure 5).
* **The Issue:** First, please note a numbering shift between the reviewer prompt and the manuscript: in the manuscript's 12-module architecture (Figure 1C and Section 2.3), the modules are:
  * **Empirical multi-student classroom datasets ($N = 59\text{–}83$):** Module 2 (Raw ECG, $N=67/75$), Module 3 (Spectral ECG, $N=76$), Module 6 (Canonical Bands unguided baseline, $N=83$), Module 9 (Classroom Berger Alpha, $N=67$), and Module 12 (offline `GroupKFold` KNN benchmark evaluated on the $N=134$ recordings from Module 9).
  * **Empirical single-session illustrative recordings:** Module 2/3 waveform (`heart_raw.xlsx`, 10 s), Module 4 blink trace (`raw_blink_epoch_1024.csv`, 4 s), and Modules 5, 6, and 8 multi-epoch spectral/waterfall trace (`eeg_spectra.xlsx`, $N = 27$ epochs).
  * **Architectural descriptions / Analytical forward-model simulations (no human empirical recordings presented):** Module 1 (Intro impedance), Module 7 (`p5.js` Neurofeedback), Module 10 (SSVEP 4 Hz vs. 11 Hz; simulated via `sim_ssvep()` in `generate_figures.py` lines 530–546), and Module 11 (Visual Oddball ERP P300; simulated via Gaussian template + noise in `generate_figures.py` lines 558–588).
  
  While Section 3.4 (lines 337–342) and the Figure 5 caption do use the phrase *"analytical forward-model benchmark,"* a reader scanning the Abstract, Introduction, or Figure 5 titles (`A. Mod 10: SSVEP Forward Model`, `B. Mod 11: Oddball P300 √N Forward Model`) could easily misinterpret Figure 5A and 5B as empirical SSVEP and ERP waveforms recorded from students wearing the Muse headband, especially because Figure 5C (`C. Mod 12: Empirical KNN BCI (N = 134)`) sits right next to them in the same figure!
  
  Moreover, there is an important DSP mismatch between the **actual EEGEdu software implementation** and the **analytical forward models in Figure 5A–B**:
  * In **Module 10 (`EEGEduSsvep`)**, the browser app uses a **256-bin rectangular-windowed FFT** on the trailing 1.0 s of each epoch ($\Delta f = 1.0\text{ Hz}$ bin width, outputting linear amplitude in $\mu\text{V}$; Figure 1C and line 239). However, the simulation in `generate_figures.py` (lines 526–543) computes a **1,024-point (4.0 s) Hann-windowed power spectral density** ($\Delta f = 0.25\text{ Hz}$ bin width, in $\mu\text{V}^2/\text{Hz}$), which allows it to plot a peak at `9.5 Hz` ("Endog. $\alpha$ (9.5 Hz)")—a fractional frequency bin that does not exist in the 1.0 Hz integer bin output of `EEGEduSsvep`!
  * In **Module 11 (`EEGEduEvoked`)**, the browser app applies a **2–20 Hz causal Butterworth bandpass filter** by default (Figure 1C, line 241), whereas the text (line 341) rightly warns that a 2.0 Hz high-pass filter distorts slow P300 potentials (per Luck, 2014; Tanner et al., 2015) and recommends lowering the slider to 0.1 Hz.
* **Actionable Solution:**
  1. Add a clear orienting sentence at the beginning of **Section 3 (Results)** (or in Section 2.1) explicitly categorizing the validation tiers across the 12 modules: (a) multi-participant classroom cohort benchmarks (Modules 2, 3, 6, 9, and 12), (b) single-participant empirical signal demonstrations (Modules 4, 5, 6, and 8), and (c) analytical forward-model simulations illustrating theoretical SNR scaling and hardware constraints (Modules 10 and 11).
  2. In **Section 3.4 (Modules 10 and 11)** and the **Figure 5 caption**, explicitly state that Panels A and B are *synthetic Monte Carlo forward simulations* rather than human recordings, and note the parameter difference in Panel A (4.0 s Hann-windowed PSD at $\Delta f = 0.25\text{ Hz}$ used to visualize the 9.5 Hz endogenous alpha peak alongside the 4 Hz and 11 Hz harmonics, compared to the browser module's default 1.0 s, 1.0 Hz rectangular FFT).
  3. Regarding **Module 11 (`EEGEduEvoked`)**, explain why the default bandpass in Figure 1C is set to `2–20 Hz` (presumably to prevent raw trace baseline drift off-screen on dry electrodes before averaging) and suggest whether future versions of EEGEdu should default `EEGEduEvoked` to `0.1–30 Hz` in accordance with *Psychophysiology* ERP guidelines.

---

### 3. Mismatch Between the Described `ml5.KNNClassifier` Unit-$L_2$ Pipeline and the Plotted `StandardScaler` Pipeline in Module 12 (Figure 5C & Section 3.4)
* **Location:** `paper1_eegedu.tex` (Section 2.3 line 243; Section 3.4 lines 343–344; Figure 5C caption line 332), `generate_figures.py` (lines 639–669, 759–766), and `stats_macros.tex` (lines 181–190).
* **The Issue:** In Section 2.3 (line 243) and Section 3.4 (line 343), the authors emphasize that Module 12 (`EEGEduPredict`) uses `ml5.KNNClassifier`, which normalizes each feature vector to **unit $L_2$ length** ($\tilde{\mathbf{x}} = \mathbf{x} / \|\mathbf{x}\|_2$) to evaluate cosine similarity and remove global amplitude scaling.
  
  In `generate_figures.py`, the authors actually compute **two** pipelines:
  1. `knn_full` / `knn_alpha` using `StandardScaler()` (feature-wise $z$-scoring across participants; lines 639–652), yielding $\text{Acc} = 67.2\%\ (\text{AUC} = 0.72)$ for 60-bin ($k=5$) and $\text{Acc} = 72.4\%\ (\text{AUC} = 0.79)$ for 13-feature alpha prominence ($k=7$).
  2. `knn_l2_full` / `knn_l2_alpha` using `Normalizer(norm="l2")` (matching `ml5.KNNClassifier`; lines 655–668), which actually achieves **higher accuracy**: $\text{Acc} = 67.9\%\ (\text{AUC} = 0.72)$ for 60-bin and $\text{Acc} = 76.9\%\ (\text{AUC} = 0.78)$ for alpha-prominence features (exported to `stats_macros.tex` lines 185–190 as `\BCIKNNLTwoFullAcc`, `\BCIKNNLTwoAlphaAcc`, etc., but **never cited in `paper1_eegedu.tex`!**).
  
  Furthermore, why does the text state that `EEGEduPredict` uses $k = 3$ on 30-bin `TP9` spectra in the browser (line 243), whereas the offline benchmark in Figure 5C uses $k = 5$ on 60-bin bilateral spectra and $k = 7$ on 13 engineered alpha-prominence features?
* **Actionable Solution:**
  1. In **Section 3.4 (line 343)**, report **both** the feature-standardized (`StandardScaler`) and the exact unit-$L_2$ (`Normalizer(norm="l2")`) cross-subject generalization results using the macros already generated in `stats_macros.tex` (`\BCIKNNLTwoFullAcc` = 67.9%, `\BCIKNNLTwoAlphaAcc` = 76.9%, `\BCIKNNLTwoAlphaAUC` = 0.78), or plot the unit-$L_2$ curve alongside/in place of the `StandardScaler` curve in Figure 5C.
  2. Briefly clarify why the cross-subject benchmark uses $k = 5$ and $k = 7$ on the $N = 134$ cohort (to prevent overfitting across heterogeneous participants, whereas live within-subject calibration uses $k = 3$ on 15–20 rapid snapshots per class).

---

### 4. Statistical Reporting Completeness: Missing Wilcoxon $p$-Values, Confidence Intervals, and Exact $p$-Values in `generate_figures.py`, `stats_macros.tex`, and Table 1
* **Location:** `paper1_eegedu.tex` (Table 1, lines 280–309; Section 3.1 line 261; Section 3.3 lines 323–327), `generate_figures.py` (lines 837–840, 945–966, 1237–1239), and `stats_macros.tex`.
* **The Issue:** *Psychophysiology* statistical guidelines (Keil et al., 2022; Larson & Carbine, 2017) require complete, uniform reporting of test statistics, degrees of freedom, exact $p$-values, effect sizes ($d_z$), and 95% confidence intervals across all parallel contrasts. Upon auditing `generate_figures.py` against `paper1_eegedu.tex`, several omissions and inconsistencies emerged:
  1. **Hardcoded macros in `generate_figures.py` (lines 1237–1239):** While almost all macros in `generate_figures.py` are dynamically formatted from computed variables, three lines in `export_paper1_stats_and_macros()` are hardcoded strings:
     ```python
     f"\\newcommand{{\\BothECGDiffCILow}}{{-6.69}}",
     f"\\newcommand{{\\BothECGDiffCIHigh}}{{+6.38}}",
     f"\\newcommand{{\\BothECGDiffDz}}{{0.00}}",
     ```
     Similarly, scientific-notation $p$-values on lines 1223–1224, 1276–1277, 1288, 1292, 1313–1314, and 1330 are hardcoded LaTeX strings (`8.01\times 10^{-4}`, etc.) rather than dynamically formatted from `m3_p`, `p_temp_a`, etc., and are omitted from `stats_summary.json` (which is also missing all the `LogBump*`, `*CI*`, and `AlphaCronbach*` keys!). All macros and JSON keys should be computed dynamically from the data arrays without hardcoded string literals.
  2. **Missing Wilcoxon signed-rank tests in Table 1 and Section 3.3:** The Table 1 caption (line 281) states that *"Non-parametric Wilcoxon signed-rank tests confirm all primary paired effects,"* listing Wilcoxon $p$-values for 7 contrasts, but **omits Wilcoxon signed-rank tests** for:
     * Mod 2 vs. Mod 3 ($\Delta\text{HR}$, $N = 59$)
     * Mod 9: $2 \times 2$ Interaction (Linear Rel. %/bin, $N = 67$)
     * Mod 9: Linear $1/f$ Bump — Frontal Alpha ($N = 67$)
     * Mod 9: Log-dB ($10\log_{10}$) Bump — Temporal Alpha, Frontal Alpha, and $2 \times 2$ Interaction ($N = 67$)
  3. **Incomplete statistical reporting for key in-text contrasts (Section 3.3):**
     * Line 323 reports the frontal 22 Hz EMG reduction solely as `22 Hz trough: t(66) = -4.65` without its $p$-value or $d_z$ (`p_22hz_front` is computed on line 966 of `generate_figures.py` as $1.61 \times 10^{-5}$ but never exported to `stats_macros.tex` or reported in text!).
     * Line 320 reports raw log-transformed 10 Hz amplitude (`t(66) = 2.96, p = 0.0043, Wilcoxon p = 0.0024`), but omits Cohen's $d_z$ and the 95% CI.
     * Line 321 reports the 10 Hz single-bin tests (`Temporal: t(66) = 4.93, p = 5.80e-6; Frontal: t(66) = 3.20, p = 0.0021`), but omits $d_z$ and 95% CIs.
* **Actionable Solution:**
  1. Replace the hardcoded macro strings in `generate_figures.py` (lines 1223–1224, 1237–1239, 1276–1277, etc.) with dynamic Python helper functions (e.g., `ci95(b_m2_diff - b_m3_diff)` and a LaTeX scientific notation formatter `fmt_p_latex(p)`), and add all missing keys (`log_bump_*`, `ci_*`, `cronbach_*`, `front_22hz_p`) to `stats_summary.json`.
  2. Compute and report the Wilcoxon signed-rank $p$-values for the Log-dB bump contrasts and $2 \times 2$ interactions in Table 1 / Section 3.3, and add the exact $p$-value and $d_z$ for the 22 Hz frontal EMG trough (`\FrontTwentyTwoHzP`, `\FrontTwentyTwoHzDz`).

---

### 5. Attrition, Pre-Screening, and Row Alignment Between Modules 2, 3, and 6 in `alpha_single.xlsx`
* **Location:** `paper1_eegedu.tex` (Section 3.1, lines 259–261) and `generate_figures.py` (lines 786–840).
* **The Issue:** In Section 3.1 (line 261), the authors report that across the $N = 59$ rows with valid data in all four cardiac conditions (Standing and Sitting in both Module 2 and Module 3), the group-mean orthostatic heart-rate increases are virtually identical ($+9.59 \pm 31.30\text{ BPM}$ vs. $+9.75 \pm 21.85\text{ BPM}$, paired $t(58) = -0.03, p = 0.974, d_z = 0.00$), but the individual-level correlation between $\Delta\text{HR}_{\text{Mod 2}}$ and $\Delta\text{HR}_{\text{Mod 3}}$ is $r = -0.06, p = 0.63$. The text attributes this null correlation to *"non-simultaneous sequential trials and pre-screened spreadsheet row shifts."*
  
  Wait—if `alpha_single.xlsx` experienced *"pre-screened spreadsheet row shifts"* between the Module 2 columns (`B, C`) and Module 3 columns (`D, E`), then row $i$ in Module 2 and row $i$ in Module 3 might not always belong to the exact same participant! If rows were shifted across columns during pre-screening, running a **paired** $t$-test (`stats.ttest_rel(b_m2_diff, b_m3_diff)`) and a **Pearson correlation** (`stats.pearsonr(b_m2_diff, b_m3_diff)`) across row index $i$ requires careful justification, and an **independent-samples / Welch $t$-test** (`stats.ttest_ind(m2_stand - m2_sit, m3_stand - m3_sit, equal_var=False)`) across the full valid samples ($N = 67$ vs. $N = 76$, or $N = 75$ vs. $N = 76$) should also be reported so the comparison does not rely on potentially shifted row indices.
  
  Additionally, please clarify the exact physiological and technical mechanisms behind the two cardiac error modes:
  1. Why did 8 students in Module 2 report values below 40 BPM (i.e., setting their manual voltage threshold too high in Google Sheets and missing R-waves, vs. how many exceeded 200 BPM—if any)?
  2. Why did Module 3 (automated FFT peak tracking) yield group means of $56.43\text{ BPM}$ (Sitting) and $65.25\text{ BPM}$ (Standing)—roughly **21 BPM lower** than Module 2 ($77.85$ and $87.57\text{ BPM}$)? The explanation on line 261 (that opening the high-pass filter to 0.01 Hz allows $0.5\text{–}0.75\text{ Hz}$ respiratory/movement baseline wander near the 30 BPM lower bound to capture the global spectral maximum in `EEGEduHeartSpectra`) is crucial and highlights a major limitation of taking a naive `argmax` over $30\text{–}150\text{ BPM}$ (`0.5–2.5 Hz`) when $1/f$ movement artifact is present.
* **Actionable Solution:**
  1. Clarify in Section 3.1 what *"pre-screened spreadsheet row shifts"* means (e.g., whether TA pre-screening deleted invalid cells in individual columns of `heart_spectra_1.xlsx` before compiling `alpha_single.xlsx`), and supplement the $N = 59$ paired test with a Welch two-sample $t$-test across the full valid cohorts ($N = 67$ vs. $N = 76$: $\Delta\text{HR} = +9.72$ vs. $+8.83\text{ BPM}$) to prove that concordance holds regardless of row pairing.
  2. Briefly note in the Discussion how Module 3 (`EEGEduHeartSpectra`) could be improved in future software updates (e.g., pre-whitening/$1/f$ detrending the cardiac spectrum or using a 0.65 Hz [39 BPM] high-pass cutoff so slow finger drift at 0.5 Hz [30 BPM] does not usurp the R-wave fundamental).

---

### 6. Amplitude ($\mu\text{V}$) vs. Power ($\mu\text{V}^2/\text{Hz}$) Decibel Scaling ($10\log_{10}$ vs. $20\log_{10}$) in Figure 3D and Section 3.3
* **Location:** `paper1_eegedu.tex` (Section 2.2 Equations 1–2, lines 207–215; Figure 3D caption line 266; Section 3.3 line 327; Table 1 rows 10–12) and `generate_figures.py` (line 369, lines 951–963).
* **The Issue:** In Section 2.2 (lines 207–215), the authors admirably clarify that `@neurosity/pipes` (`dsp.js` `calculateSpectrum`) outputs **one-sided linear spectral amplitude $\hat{A}_c[k]$ in microvolts ($\mu\text{V}$)** rather than squared power ($\mu\text{V}^2$).
  
  However, in `generate_figures.py` (line 369 for Figure 3D and lines 952–955 for Module 9 Log-dB bump), the decibel transformation is computed on linear amplitude $\hat{A}$ using a factor of **10** rather than **20**:
  ```python
  spec_db = 10 * np.log10(np.clip(ch_matrices[0].T, 1e-2, None))
  ot_db_bump = 10.0 * np.log10(OT[:, alpha_idx]).mean(axis=1) - 10.0 * np.log10(OT[:, flank_idx]).mean(axis=1)
  ```
  By standard acoustical and electrical engineering convention (IEEE / IEC) and *Psychophysiology* guidelines (Keil et al., 2022), decibels of a **field/amplitude** quantity ($\mu\text{V}$) are defined as $20\log_{10}(\hat{A} / A_0)$, whereas $10\log_{10}(P / P_0)$ is defined for **power** ($\mu\text{V}^2$). Because $10\log_{10}(\hat{A}) = \frac{1}{2} \left[10\log_{10}(\hat{A}^2)\right]$, applying $10\log_{10}$ to linear microvolt amplitude produces values in **"amplitude half-decibels"** (or bel-scaled amplitude $\times 10$), which are numerically half as large as standard power decibels!
  
  The authors recognize this on line 327 (*"squaring linear amplitude to power merely multiplies every value by two ($10\log_{10}[\hat{A}^2] = 20\log_{10}\hat{A}$), leaving all $t$-statistics, $p$-values, and effect sizes strictly invariant"*), which is mathematically true for the $t$-ratios and $d_z$, **but** the reported Mean, SD, and 95% CI values in Table 1 (e.g., $+0.61 \pm 0.66\text{ dB}$ Closed vs. $+0.12 \pm 0.44\text{ dB}$ Open) and the colorbar in Figure 3D (`Spectral Level (10 log10[A / 1 uV])`) are scaled by $10\log_{10}(\hat{A})$ rather than conventional power decibels ($20\log_{10}\hat{A} = 10\log_{10}\hat{A}^2$).
* **Actionable Solution:**
  Either:
  1. Explicitly label the metric in Table 1 and Section 3.3 as **$10\log_{10}$ Amplitude Level ($\text{dB}_{\text{amp}}$)** and state clearly in the Table 1 footnote that standard power decibels ($\text{dB}_{\text{power}} = 20\log_{10}\hat{A}$) are exactly $2\times$ the tabulated means, SDs, and CIs (e.g., $+1.22 \pm 1.32\text{ dB}$ Closed vs. $+0.24 \pm 0.88\text{ dB}$ Open, $\Delta = +0.98\text{ dB}$); **or**
  2. Multiply the log-decibel prominence arrays in `generate_figures.py` by 20 instead of 10 (`20.0 * np.log10(...)`, equivalent to $10\log_{10}(\hat{A}^2)$) so that all decibel values in the manuscript conform to standard power decibels ($\text{dB re: } 1\ \mu\text{V}^2$).

---

## Minor Comments on Figures, Tables, & Prose

1. **Typo Inside the Live App Screenshot in Figure 1A (`electrdoes`):**
   In Figure 1A (top right screenshot, `Live in-browser raw EEG from each electrode`), the Chart.js title rendered inside the EEGEdu web app reads `"Raw data from EEG electrdoes"`. While this is an authentic unedited screenshot of `eegedu.com`, the authors might wish to fix that typo in the upstream `EEGEdu` GitHub repository!
2. **Figure 2B — Explanation of `qrs_env` Envelope Demodulation in `generate_figures.py`:**
   In `generate_figures.py` (lines 168–170), the solid teal curve in Figure 2B (`Passband 0.01–20 Hz (Mod 3: Fundamental + Harmonics)`) is generated by rectifying `ecg_uv` (`qrs_env = np.abs(np.minimum(0, ecg_uv)) + np.maximum(0, ecg_uv)` = `np.abs(ecg_uv)`) before taking the Hann-windowed FFT, because `heart_raw.xlsx` was recorded in Module 2 with the `2–20 Hz` filter already applied! The Figure 2B caption (line 250) candidly notes this (*"against the QRS envelope-demodulated spectrum illustrating Module 3's 0.01–20 Hz passband"*), which is honest, but the main text (line 257) reads as if Figure 2B is a direct unfiltered/0.01 Hz recording. Add a brief parenthetical in Section 3.1 (line 257) noting that full-wave QRS rectification recovers the 0.793 Hz (47.6 BPM) fundamental from the high-pass filtered Module 2 trace to illustrate Module 3's passband.
3. **Figure 3C & Section 2.2 — Gap Between Canonical Frequency Bands (`powerByBand`):**
   In Section 2.2 (line 217) and Figure 3C, canonical bands are defined over integer bins: delta (`1–4 Hz`), theta (`5–7 Hz`), alpha (`8–12 Hz`), beta (`13–30 Hz`), and gamma (`31–38 Hz`). In Figure 3B (line 330 of `generate_figures.py`), the shaded background spans continuous intervals (`1–4.5`, `4.5–7.5`, `7.5–12.5`, `12.5–30.5`, `30.5–38 Hz`). Briefly clarify in Section 2.2 that because `@neurosity/pipes` evaluates a 256-bin FFT at $f_s = 256\text{ Hz}$ ($\Delta f = 1.0\text{ Hz}$ integer bins), these disjoint integer ranges partition all integer bins from 1 to 38 Hz without gaps or overlap.
4. **Figure 3D — Time–Frequency Spectrogram Resolution vs. Module 8 Live App Parameters:**
   In Section 2.3 (line 235) and Figure 1C, Module 8 (`EEGEduSpectro`) is described as running on `AF7` with a 128-sample (0.5 s) window, 16-sample (62.5 ms) step, and 128 bins ($\Delta f = 2.0\text{ Hz}$). However, Figure 3D plots the 27 epochs from `eeg_spectra.xlsx` (`TP9`, 1.0 Hz bins from 1 to 38 Hz across ~10 seconds at 0.39 s steps). Please note in the Figure 3D caption that the waterfall heatmap is rendered from the `TP9` multi-epoch spectral export (`eeg_spectra.xlsx`) to align directly with Panels B and C.
5. **Figure 4C — Visual Distinction and Explanation of the Frontal 7 Hz Peak:**
   In Figure 4C (`Spectral Specificity Across Scalp Regions`), the frontal `Closed - Open` $t$-statistic curve (teal squares) actually crosses the upper Bonferroni threshold ($t = +3.28$) at **7 Hz** ($t(66) \approx +3.55$) as well as nearly reaching it at 4 Hz ($t(66) \approx +3.28$), before dropping to the 10 Hz peak ($t(66) = +3.20$, just below Bonferroni!). This is a direct consequence of compositional simplex closure ($\sum_{k=1}^{30} P_{\text{rel}}(k) = 100\%$): because frontal EMG from 19 to 30 Hz drops steeply when the eyes close ($t$ down to $-4.65$), relative percentages across *all* lower frequencies (1–12 Hz) are passively inflated on `AF7/AF8`! The authors explain this mechanism on line 323, which is a strong motivation for the $1/f$-detrended bump analysis in Figure 4D—pointing out the 7 Hz frontal point in Figure 4C explicitly will make that argument even more compelling.
6. **Figure 5B — Inset Legend and SNR Definition:**
   In Figure 5B (`Oddball P300 √N Forward Model`), the inset plots `snr_empirical` (solid orange curve) vs. `snr_empirical[0] * np.sqrt(trial_counts)` (dotted black curve), without a legend inside the inset (though the Figure 5B caption explains the two curves). Note that `snr_empirical` in `generate_figures.py` (line 582) uses `max(noise_rms, 0.2)` in the denominator and computes the mean (not absolute value) of `avg_wav[p300_win]` in the numerator; at small $N$, random phase cancellation causes `snr_empirical[0]` (`0.52`) to slightly underestimate the true single-trial ratio, causing the orange Monte Carlo curve to drift slightly above `snr_empirical[0] * sqrt(N)` at $N=100$. Using the theoretical single-trial SNR ($\mu_{\text{P300}} / \sigma_{\text{noise}}$) as the anchor for the dotted $\sqrt{N}$ reference line will make the two curves overlay even more cleanly.
7. **Table 1 Formatting:**
   Table 1 is comprehensive and well-structured. Adding horizontal sub-headers or slightly clearer labels in the `Condition 1` and `Condition 2` columns (since Rows 1–3 list `Standing` in Col 1 and `Sitting` in Col 2, whereas Rows 5–13 list `Closed` in Col 1 and `Open` in Col 2) is already handled well by the parenthetical `(Closed)` / `(Open)` tags, though noting the subtraction direction (`Condition 1 - Condition 2`) in the column header `Paired t (Cond 1 − Cond 2)` would prevent any sign ambiguity.

---

## Recommendation

**Minor-to-Moderate Revision.**  
This is an outstanding, highly practical methodological contribution that aligns squarely with *Psychophysiology*'s mission to advance rigorous, accessible, and reproducible electrophysiological recording and signal-processing standards. Addressing the distinction between cross-frequency spectral consistency and temporal split-half reliability, harmonizing the statistical reporting and decibel conventions, and clarifying the empirical vs. forward-model validation tiers will make this a landmark reference for both classroom instruction and scalable browser-based psychophysiology.

— **Matthew B. Pontifex, Ph.D.**  
*Consulting Editor, Psychophysiology*  
Michigan State University
