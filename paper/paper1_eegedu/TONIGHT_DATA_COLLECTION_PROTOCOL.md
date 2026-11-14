# Tonight's Live Muse Data Collection Protocol (10–15 Minutes)
## *EEGEdu* Real Empirical Drop-In Recording Guide for Figure 5A, Figure 5B, and Figure 2B

**Author:** Dr. Kyle E. Mathewson  
**Target System:** [https://eegedu.com](https://eegedu.com)  
**Hardware:** InteraXon Muse (Muse 2016, Muse 2, or Muse S)  
**Browser:** Google Chrome, Brave, or Microsoft Edge (Chromium with W3C WebBluetooth enabled)  
**Destination Directory:** `/Users/kylemathewson/eegeduPaper/data/`

---

## Executive Summary & How the Drop-In Loader Works

The analysis pipeline in `paper1_eegedu/generate_figures.py` contains automated detection functions (`load_empirical_ssvep` and `load_empirical_oddball_erp`) that search for your exported CSV files in `/Users/kylemathewson/eegeduPaper/data/`:
- When these files are **absent**, the script automatically generates the corrected synthetic forward models and labels Panels 5A and 5B as `(Synthetic Forward Model)`.
- The moment you place the three CSV files listed below into `/Users/kylemathewson/eegeduPaper/data/` and re-run `python3 paper1_eegedu/generate_figures.py`, the loader automatically switches to plotting your **real empirical recordings**, updates panel titles to `Empirical Recording`, and recalculates real signal-to-noise ratios (SNR)!

---

## File Manifest & Target Filenames

| Target File Path | Module | Recording Task | Est. Duration | Target Figure |
|:---|:---|:---|:---|:---|
| `/Users/kylemathewson/eegeduPaper/data/ssvep_4hz.csv` | **Module 10 (`EEGEduSsvep`)** | 4 Hz Full-Field Visual Flicker | 45–60 seconds | Figure 5A |
| `/Users/kylemathewson/eegeduPaper/data/ssvep_11hz.csv` | **Module 10 (`EEGEduSsvep`)** | 11 Hz Full-Field Visual Flicker | 45–60 seconds | Figure 5A |
| `/Users/kylemathewson/eegeduPaper/data/evoked_oddball.csv` | **Module 11 (`EEGEduEvoked`)** | Visual Oddball Target/Standard P300 | ~3–4 minutes (120–200 trials) | Figure 5B |
| *(Optional)* `/Users/kylemathewson/eegeduPaper/data/heart_raw_broadband.csv` | **Module 4 (`EEGEduRaw`)** | Unattenuated Lead-I ECG Finger Pinch | 15–20 seconds | Figure 2B |

---

## Step-by-Step Recording Instructions

### Pre-Flight Preparation (1 minute)
1. Ensure your Muse headband is charged (battery indicator LED pulsed).
2. Open Google Chrome (or Edge) and navigate to **[https://eegedu.com](https://eegedu.com)**.
3. Lightly dampen your forehead skin and the silicone rubber ear wings behind your ears with a drop of water (or saline wipe) to ensure immediate low-impedance contact ($<25\ \mu\text{V}$ RMS noise).

---

### Phase 1: Module 10 — Steady-State Visual Evoked Potentials (SSVEP, 4 Hz & 11 Hz)
**Goal:** Collect real frequency-tagged visual cortex entrainment at 4 Hz and 11 Hz.

1. **Electrode Placement:**
   - For maximal SSVEP amplitude, slide the Muse headband slightly backward so the rubber ear tabs (`TP9` and `TP10`) sit over posterior-occipital / parietal scalp (or place the headband normally if preferred; posterior derivations capture visual dipole return).
2. **Launch Module 10:**
   - In the EEGEdu sidebar or dropdown, select **Module 10: SSVEP**.
   - Click the blue **"Connect Muse"** button in the header, select your `Muse-XXXX` headband in the browser chooser, and wait for the GATT connection to establish.
3. **Record 4 Hz Flicker:**
   - Set the flicker frequency to **4 Hz** (default).
   - Position your face ~40–50 cm from the screen and stare steadily at the central black fixation cross inside the flashing circle.
   - Let the recording run for **45–60 seconds** (allowing the app to accumulate 30–60 1.0-second spectral windows).
   - Click **"Download CSV"** (or **"Export Data"**).
   - Move or rename the downloaded CSV file to:
     ```bash
     mv ~/Downloads/eegedu_ssvep*.csv /Users/kylemathewson/eegeduPaper/data/ssvep_4hz.csv
     ```
4. **Record 11 Hz Flicker:**
   - Switch the flicker frequency slider or toggle to **11 Hz**.
   - Stare steadily at the central fixation cross for another **45–60 seconds**.
   - Click **"Download CSV"**.
   - Move or rename the downloaded CSV file to:
     ```bash
     mv ~/Downloads/eegedu_ssvep*.csv /Users/kylemathewson/eegeduPaper/data/ssvep_11hz.csv
     ```

---

### Phase 2: Module 11 — Visual Oddball Event-Related Potentials (Oddball ERP / P300)
**Goal:** Collect real single-trial continuous 256 Hz EEG stamped with stimulus markers.

1. **Electrode Placement:**
   - Reposition the headband into standard forehead orientation: front sensors centered over `AF7` and `AF8`, central reference over `FPz`, and ear tabs comfortably seated behind the pinna on `TP9` and `TP10`.
2. **Launch Module 11:**
   - Select **Module 11: Evoked Potentials** in EEGEdu.
   - Verify connection (the headband should remain connected; if not, click "Connect Muse").
3. **Run the Oddball Paradigm:**
   - The module presents frequent blue standard circles (75%, `Marker = 10`) and infrequent red target circles (25%, `Marker = 20`) with jittered 500–1,500 ms inter-stimulus intervals.
   - Click **"Record"** (or start presentation).
   - **Task:** Silently count the number of rare red target circles that appear while keeping your gaze centered and minimizing blinks during the stimulus sequence.
   - Let the task run for **120 to 200 trials** (approximately 3 to 4.5 minutes), or until the 400-trial ceiling is reached.
4. **Export CSV:**
   - Click **"Stop & Download CSV"** (or allow automatic download upon completion).
   - Move or rename the downloaded file to:
     ```bash
     mv ~/Downloads/eegedu_evoked*.csv /Users/kylemathewson/eegeduPaper/data/evoked_oddball.csv
     ```

*Technical Note on Timing:* The loader in `generate_figures.py` (`load_empirical_oddball_erp`) automatically parses the continuous 256 Hz sample rows, indexing time by exact sample count ($\Delta t = 1/256\text{ s} = 3.90625\text{ ms/row}$) relative to `Marker == 20` vs `Marker == 10`. It subtracts the 100 ms pre-stimulus baseline, filters artifacts ($<150\ \mu\text{V}$ peak-to-peak gate), and computes the ensemble grand average without being affected by BLE packet arrival grouping!

---

### Phase 3 (Optional): Module 4 — Unattenuated Lead-I ECG Finger Pinch
**Goal:** Replace the envelope-demodulated spectrum in Figure 2B with a direct wide-open hardware recording of the 0.8–1.2 Hz cardiac fundamental.

1. **Launch Module 4:**
   - In EEGEdu, select **Module 4: Raw EEG**.
2. **Finger-Pinch Grip:**
   - Take the headband off your head.
   - Pinch the left forehead electrode (`AF7`) between your left thumb and forefinger.
   - Pinch the central forehead reference electrode (`FPz`) between your right thumb and forefinger.
   - Touch a second finger of your right hand to the right ear wing (`TP10`) to engage the Driven Right Leg (DRL) circuit and eliminate 60 Hz hum.
3. **Filter Settings:**
   - Set the high-pass cutoff slider to **0.1 Hz** (or minimum) and low-pass to **20 Hz** (or 50 Hz).
4. **Record & Export:**
   - Remain still for 15–20 seconds while watching your ECG QRS pulses stream across the screen.
   - Click **"Download CSV"**.
   - Move or rename the file to:
     ```bash
     mv ~/Downloads/eegedu_raw*.csv /Users/kylemathewson/eegeduPaper/data/heart_raw_broadband.csv
     ```

---

## Step 4: Re-Building Figures and PDF (10 Seconds)

Once your CSV files are saved in `/Users/kylemathewson/eegeduPaper/data/`, simply execute the pipeline from your terminal:

```bash
# 1. Regenerate figures, update statistical macros, and sync json
python3 /Users/kylemathewson/eegeduPaper/paper1_eegedu/generate_figures.py

# 2. Compile LaTeX manuscript to PDF
cd /Users/kylemathewson/eegeduPaper/paper1_eegedu
pdflatex -interaction=nonstopmode paper1_eegedu.tex
bibtex paper1_eegedu
pdflatex -interaction=nonstopmode paper1_eegedu.tex
pdflatex -interaction=nonstopmode paper1_eegedu.tex

# Or run the complete automated build pipeline:
python3 /Users/kylemathewson/eegeduPaper/build_pipeline.py
```

### What You Will See in the Output:
- In `generate_figures.py`:
  - `load_empirical_ssvep` prints confirmation that `ssvep_4hz.csv` and `ssvep_11hz.csv` were loaded.
  - `load_empirical_oddball_erp` prints the number of target and standard trials parsed.
  - Figure 5A updates from `(Synthetic Forward Model)` to `A. Mod 10: SSVEP Empirical Recording (4 vs. 11 Hz)`.
  - Figure 5B updates to `B. Mod 11: Visual Oddball ERP Empirical Recording`, plotting your true empirical P300 deflection and empirical $\sqrt{N}$ noise suppression!
