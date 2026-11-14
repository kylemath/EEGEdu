# EEGEdu & BrainImation Manuscripts and Automated Analysis Pipeline

This repository contains the end-to-end automated data analysis, DSP/ML benchmarking, figure generation, dynamic LaTeX statistical macro embedding, and PDF compilation pipeline for two companion papers:

1. **Paper 1 (`paper1_eegedu/`):** *EEGEdu: A Zero-Install, Reactive WebBluetooth Platform for Teaching Human Electrophysiology, Time–Frequency Signal Processing, and Brain–Computer Interfaces in the Classroom*
   - **Compiled PDF:** [`paper1_eegedu/paper1_eegedu.pdf`](paper1_eegedu/paper1_eegedu.pdf)
   - **LaTeX & BibTeX:** [`paper1_eegedu/paper1_eegedu.tex`](paper1_eegedu/paper1_eegedu.tex), [`paper1_eegedu/references1.bib`](paper1_eegedu/references1.bib), [`paper1_eegedu/stats_macros.tex`](paper1_eegedu/stats_macros.tex)
   - **Markdown Manuscript:** [`paper1_eegedu/manuscript.md`](paper1_eegedu/manuscript.md)
   - **Figure & Stats Generator:** [`paper1_eegedu/generate_figures.py`](paper1_eegedu/generate_figures.py)

2. **Paper 2 (`paper2_brainimation/` / `brainimation/`):** *BrainImation: A Zero-Install Browser IDE, Multimodal Physiological Studio, and Creative-Coding Framework for Live WebBluetooth EEG, Multi-Wavelength Optical fNIRS/PPG, 6-DOF IMU Kinematics, and Closed-Loop Neurofeedback*
   - **Compiled PDF:** [`paper2_brainimation/paper2_brainimation.pdf`](paper2_brainimation/paper2_brainimation.pdf)
   - **LaTeX & BibTeX:** [`paper2_brainimation/paper2_brainimation.tex`](paper2_brainimation/paper2_brainimation.tex), [`paper2_brainimation/references2.bib`](paper2_brainimation/references2.bib), [`paper2_brainimation/stats_macros.tex`](paper2_brainimation/stats_macros.tex)
   - **Markdown Manuscript:** [`paper2_brainimation/manuscript.md`](paper2_brainimation/manuscript.md)
   - **Figure & Stats Generator:** [`paper2_brainimation/generate_figures.py`](paper2_brainimation/generate_figures.py)

---

## One-Command Reproducible Build

Run the master pipeline from the repository root:

```bash
python3 build_pipeline.py
```

### Pipeline Stages
1. **Repository Check:** Automatically clones `kylemath/EEGEdu` and `kylemath/Brainimation` into `repos/` if not already present locally.
2. **Empirical & Benchmark Analysis + Dynamic Macro Generation:**
   - Computes all statistics from the classroom EEG/ECG spreadsheets in `data/*.xlsx`, the 226-sketch BrainImation catalogue (`examples/manifest.json`), and the `PSYCH 403` student submission archive in `data/student_submissions/`.
   - Writes machine-readable summaries (`stats_summary.json`), CSV tables (`tables/*.csv`), and LaTeX macro definitions (`stats_macros.tex`) for both papers.
3. **Publication Figure Generation:**
   - Generates vector `.pdf` and 300 DPI `.png` figures (`paper1_eegedu/figures/fig1..fig5` and `paper2_brainimation/figures/fig1..fig5`).
4. **LaTeX Compilation & Visual Verification:**
   - Runs `pdflatex -> bibtex -> pdflatex -> pdflatex` on both manuscripts, verifies zero undefined references/citations, and renders 150 DPI page previews into `pdf_pages/`.
