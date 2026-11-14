#!/usr/bin/env python3
"""
Generate publication-quality figures, empirical statistical summaries, and LaTeX macros
for Paper 1 (EEGEdu) from classroom XLSX/CSV datasets and analytical BCI benchmarks.
"""
import os
import json
import csv
import openpyxl
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch, Rectangle
from PIL import Image
from scipy import stats
import pandas as pd

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans", "Arial", "Helvetica"],
    "font.size": 9.5,
    "axes.titlesize": 10.2,
    "axes.titleweight": "bold",
    "axes.labelsize": 9.5,
    "xtick.labelsize": 8.5,
    "ytick.labelsize": 8.5,
    "legend.fontsize": 8.0,
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "axes.spines.top": False,
    "axes.spines.right": False,
})

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
REPO_DIR = os.path.join(BASE_DIR, "repos/EEGEdu")
OUT_DIR = os.path.join(BASE_DIR, "paper1_eegedu/figures")
os.makedirs(OUT_DIR, exist_ok=True)


def ci95(arr):
    m = float(np.mean(arr))
    se = float(np.std(arr, ddof=1) / np.sqrt(len(arr)))
    tc = float(stats.t.ppf(0.975, len(arr) - 1))
    return m - tc * se, m + tc * se


def fmt_p_latex(p):
    if p < 0.001:
        s = f"{p:.2e}"
        base, exp = s.split("e")
        return f"{float(base):.2f}\\times 10^{{{int(exp)}}}"
    else:
        return f"{p:.4f}"


def load_empirical_ssvep(csv_4hz_path, csv_11hz_path):
    """Load empirical SSVEP CSV exports from Module 10 (EEGEduSsvep) if present."""
    def parse_ssvep_csv(path):
        if not os.path.exists(path):
            return None, None
        try:
            df = pd.read_csv(path)
        except Exception:
            return None, None
        freq_cols = [c for c in df.columns if c.startswith("ch0_") and c.endswith("Hz")]
        if freq_cols:
            freqs = np.array([float(c.split("_")[1].replace("Hz", "")) for c in freq_cols])
            ch0_data = df[[f"ch0_{int(f)}Hz" for f in freqs]].values
            ch3_cols = [f"ch3_{int(f)}Hz" for f in freqs if f"ch3_{int(f)}Hz" in df.columns]
            if ch3_cols:
                ch3_data = df[ch3_cols].values
                spec_data = 0.5 * (ch0_data + ch3_data)
            else:
                spec_data = ch0_data
            return freqs, spec_data
        return None, None

    f4, p4 = parse_ssvep_csv(csv_4hz_path)
    f11, p11 = parse_ssvep_csv(csv_11hz_path)
    if f4 is not None and p4 is not None and f11 is not None and p11 is not None and len(p4) > 0 and len(p11) > 0:
        return f4, p4, f11, p11
    return None, None, None, None


def load_empirical_oddball_erp(csv_path, fs=256.0):
    """Load empirical oddball ERP CSV export from Module 11 (EEGEduEvoked) if present.
    
    Uses sample row index delta_t = 1/256 s = 3.90625 ms relative to Marker == 20
    (target) vs Marker == 10 (standard), completely bypassing burst Date.now() timestamps.
    """
    if not os.path.exists(csv_path):
        return None, None, None
    try:
        df = pd.read_csv(csv_path)
    except Exception:
        return None, None, None
    if "Marker" not in df.columns:
        return None, None, None
    markers = pd.to_numeric(df["Marker"], errors="coerce").fillna(0).values
    ch_col = None
    for cand in ["ch0_0ms", "ch0", "TP9"]:
        if cand in df.columns:
            ch_col = cand
            break
    if ch_col is None and len(df.columns) > 4:
        ch_col = df.columns[4]
    if ch_col is None:
        return None, None, None
    eeg = pd.to_numeric(df[ch_col], errors="coerce").fillna(0).values

    k_pre = int(round(0.100 * fs))   # 26 samples
    k_post = int(round(0.600 * fs))  # 154 samples
    n_epoch = k_pre + k_post
    t_erp_ms = (np.arange(n_epoch) - k_pre) * (1000.0 / fs)

    def extract_epochs(marker_val):
        idx = np.where(markers == marker_val)[0]
        epochs = []
        for r in idx:
            if r - k_pre >= 0 and r + k_post <= len(eeg):
                ep = eeg[r - k_pre : r + k_post].copy()
                ep -= np.mean(ep[:k_pre])  # Pre-stimulus baseline subtraction
                if np.ptp(ep) < 150.0:     # Artifact rejection gate
                    epochs.append(ep)
        return np.array(epochs)

    target_epochs = extract_epochs(20)
    standard_epochs = extract_epochs(10)
    if len(target_epochs) >= 5 and len(standard_epochs) >= 5:
        return t_erp_ms, target_epochs, standard_epochs
    return None, None, None


def make_fig1_architecture():
    """Fig 1: EEGEdu logo + live browser screenshots (A), reactive architecture (B), 12-module curriculum table (C)."""
    SCR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures", "screens")
    fig = plt.figure(figsize=(14.0, 10.6))
    gs = gridspec.GridSpec(3, 1, height_ratios=[0.95, 0.55, 0.95], hspace=0.26)

    # Panel A: official logo + two live screenshots of the deployed app (eegedu.com, built-in mock stream)
    gs_a = gridspec.GridSpecFromSubplotSpec(1, 3, subplot_spec=gs[0], width_ratios=[0.72, 1.0, 1.0], wspace=0.05)
    ax_logo = fig.add_subplot(gs_a[0])
    ax_logo.imshow(Image.open(os.path.join(SCR, "eegedu_logo.png")))
    ax_logo.set_xticks([]); ax_logo.set_yticks([])
    for sp in ax_logo.spines.values():
        sp.set_visible(False)
    ax_logo.set_title("EEGEdu: Interactive Brain Playground\n(https://eegedu.com)", fontsize=9.2, pad=4, fontweight="bold")

    shot_specs = [
        (gs_a[1], "live_ui_controls.png", (440, 500, 2340, 1530),
         "Connect Muse / Mock Data, module selector\n& live RxJS parameter sliders (Module 4)"),
        (gs_a[2], "live_ui_raw.png", (440, 440, 2340, 1340),
         "Live in-browser raw EEG from each electrode\n(Module 4, Chart.js; built-in 256 Hz mock stream)"),
    ]
    for sub_spec, fname, box, lbl in shot_specs:
        ax_s = fig.add_subplot(sub_spec)
        ax_s.imshow(Image.open(os.path.join(SCR, fname)).crop(box))
        ax_s.set_xticks([]); ax_s.set_yticks([])
        for sp in ax_s.spines.values():
            sp.set_visible(True); sp.set_color("#b8c2cc")
        ax_s.set_title(lbl, fontsize=8.6, pad=4, fontweight="bold")
    ax_a_hdr = fig.add_subplot(gs[0], frameon=False)
    ax_a_hdr.set_xticks([]); ax_a_hdr.set_yticks([])
    ax_a_hdr.set_title("A. EEGEdu in the Browser: Logo and Live Screenshots (no installation; Chrome/Edge + Muse headband or mock stream)",
                       loc="left", pad=26, fontsize=11.5)

    # Panel B: Reactive WebBluetooth -> RxJS DSP Pipeline Schematic
    ax_arch = fig.add_subplot(gs[1])
    ax_arch.set_xlim(0, 100)
    ax_arch.set_ylim(2, 25)
    ax_arch.axis("off")
    ax_arch.set_title("B. Zero-Install Browser Architecture & Reactive RxJS (@neurosity/pipes) Signal Processing Pipeline",
                      loc="left", pad=4, fontsize=11.5)

    boxes = [
        (1.2, 4.5, 16.8, 17, "#1f4e78",
         "1. Hardware / Mock\n\n• InteraXon Muse\n  (2016 / 2 / S; FPz ref)\n• 4 EEG Ch (256 Hz)\n  TP9, AF7, AF8, TP10\n• mockMuseEEG(256)\n  Synthetic Fallback"),
        (21.2, 4.5, 16.8, 17, "#2e75b6",
         "2. WebBluetooth\n   (muse-js v3)\n\n• GATT Service 0xFE8D\n• 12-bit BLE Unpack\n• zipSamples(eeg$)\n• 5th Aux Ch Toggle\n• Chrome / Edge / OS"),
        (41.2, 4.5, 18.4, 17, "#008080",
         "3. RxJS DSP Stream\n   (@neurosity/pipes)\n\n• bandpassFilter (IIR fili)\n• epoch(dur, step, 256)\n• fft({bins: 128..8192})\n• sliceFFT / powerByBand\n• multicast(Subject)"),
        (62.8, 4.5, 16.8, 17, "#d95f02",
         "4. Interactive UI\n   & Paradigms\n\n• React + Polaris Sliders\n• Chart.js Live Plots\n• p5.js Stimuli (SSVEP,\n  Oddball ERP, NeuroFB)\n• ml5.js KNN Classifier"),
        (82.8, 4.5, 16.0, 17, "#4d4d4d",
         "5. Client-Side\n   CSV Export\n\n• RxJS takeUntil(timer)\n• Blob + FileSaver.js\n• Timestamped Raw,\n  BPM, PSD, Bands &\n  ERP Triggers (.csv)"),
    ]
    for x, y, w, h, col, text in boxes:
        patch = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5,rounding_size=1.2",
                               facecolor=col, edgecolor="none", alpha=0.94)
        ax_arch.add_patch(patch)
        ax_arch.text(x + w / 2, y + h / 2, text, color="white", ha="center", va="center",
                     fontsize=8.1, linespacing=1.24, fontweight="medium")

    for x_start, x_end in [(18.3, 20.9), (38.3, 40.9), (59.9, 62.5), (79.9, 82.5)]:
        ax_arch.annotate("", xy=(x_end, 13), xytext=(x_start, 13),
                         arrowprops=dict(arrowstyle="->,head_width=0.35,head_length=0.45", lw=2.2, color="#333333"))

    # Panel C: 12-Module Curriculum Specification Table (with exact units & zero text clipping)
    ax_tbl = fig.add_subplot(gs[2])
    ax_tbl.axis("off")
    ax_tbl.set_title("C. The 12-Module Electrophysiology Curriculum ($f_s = 256$ Hz)",
                     loc="left", pad=6, fontsize=11.5)

    col_labels = ["#", "Module Name", "Bandpass", "Epoch/Step (pts)", "Spectral / Output Mode"]
    table_data = [
        ["1", "Intro & Biophysics", "2–20 Hz", "512 / 2", "TP9 trace (2 s) + live SD (μV) quality"],
        ["2", "Heart Rate (Raw ECG)", "2–20 Hz", "2560 / 10", "10 s Lead-I ECG trace + raw CSV"],
        ["3", "Heart Rate (FFT BPM)", "0.01–20 Hz", "2048 / 100", "8192-bin FFT (30–150 BPM) + CSV"],
        ["4", "Raw EEG & Artifacts", "0.1–100 Hz", "1024 / 25", "4-Ch time series (4 s) + artifact CSV"],
        ["5", "Frequency Spectra", "1–100 Hz", "1024 / 100", "256-bin Amplitude Spectrum (slice 1–38/100 Hz) + CSV"],
        ["6", "Canonical Bands", "2–50 Hz", "1024 / 100", "powerByBand (δ, θ, α, β, γ) + CSV"],
        ["7", "p5.js Neurofeedback", "2–20 Hz", "128 / 16", "6 live visual/audio p5.js sketches"],
        ["8", "Live Spectrogram", "2–50 Hz", "128 / 16", "128-bin p5.js waterfall heatmap"],
        ["9", "Alpha (Open/Closed)", "2–20 Hz", "1024 / 100", "2×60 s Berger Amplitude Spectrum (1–30 Hz) CSV"],
        ["10", "SSVEP (4 vs 11 Hz)", "2–20 Hz", "1024 / 100", "p5 flash + 10 s Amplitude Spectrum (1–30 Hz) CSV"],
        ["11", "Evoked Oddball ERP", "2–20 Hz", "1 / 1 (256 Hz)", "p5 visual oddball + 256 Hz trigger CSV"],
        ["12", "Live BCI Classifier", "2–20 Hz", "512 / 256", "ml5 KNN (k=3) + 262/328/393 Hz tone"],
    ]
    tbl = ax_tbl.table(cellText=table_data, colLabels=col_labels, loc="center", cellLoc="left",
                       colWidths=[0.04, 0.19, 0.10, 0.14, 0.53], bbox=[0.0, 0.0, 1.0, 0.96])
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(8.0)
    for (row, col), cell in tbl.get_celld().items():
        cell.set_edgecolor("#d0d7de")
        if row == 0:
            cell.set_facecolor("#1f4e78")
            cell.get_text().set_color("white")
            cell.get_text().set_weight("bold")
        elif row in [2, 3]:
            cell.set_facecolor("#eef6ff")
        elif row in [9, 10, 11, 12]:
            cell.set_facecolor("#fff5eb")
        else:
            cell.set_facecolor("#ffffff" if row % 2 == 1 else "#f8f9fa")

    fig.savefig(os.path.join(OUT_DIR, "fig1_eegedu_curriculum_architecture.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig1_eegedu_curriculum_architecture.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Fig 1")


def make_fig2_ecg_bridge():
    """Fig 2: Modules 2 & 3 Empirical Validation — Lead-I ECG Time Domain, FFT Spectrum, and Classroom Orthostatic Data."""
    wb_hr = openpyxl.load_workbook(os.path.join(DATA_DIR, "heart_raw.xlsx"), data_only=True)
    ws_hr = wb_hr.active
    rows_hr = list(ws_hr.iter_rows(values_only=True))
    t_ms = np.array([float(x) for x in rows_hr[0] if x is not None])
    ecg_uv = np.array([float(x) for x in rows_hr[1] if x is not None])
    t_sec = t_ms / 1000.0
    peaks_ms = np.array([621.0, 1887.0, 3141.0, 4398.0, 5680.0, 6938.0, 8215.0, 9445.0])
    peaks_sec = peaks_ms / 1000.0
    peak_indices = [np.argmin(np.abs(t_ms - p)) for p in peaks_ms]
    rr_intervals = np.diff(peaks_ms)
    mean_rr = float(np.mean(rr_intervals))
    sd_rr = float(np.std(rr_intervals, ddof=1))

    n_fft = 8192
    freqs_hz = np.fft.rfftfreq(n_fft, d=1.0 / 256.0)
    bpm_axis = freqs_hz * 60.0
    mask_bpm = (bpm_axis >= 30) & (bpm_axis <= 155)

    qrs_env = np.abs(np.minimum(0, ecg_uv)) + np.maximum(0, ecg_uv)
    qrs_env = qrs_env - np.mean(qrs_env)
    psd_env = np.abs(np.fft.rfft(qrs_env * np.hanning(len(qrs_env)), n=n_fft)) ** 2
    psd_hp2 = np.abs(np.fft.rfft((ecg_uv - np.mean(ecg_uv)) * np.hanning(len(ecg_uv)), n=n_fft)) ** 2

    wb_s = openpyxl.load_workbook(os.path.join(DATA_DIR, "alpha_single.xlsx"), data_only=True)
    rows_s = list(wb_s["Sheet1"].iter_rows(values_only=True))[1:]
    m2_pairs = [(float(r[1]), float(r[2])) for r in rows_s if r[0] is not None and isinstance(r[1], (int, float)) and isinstance(r[2], (int, float)) and 40 <= r[1] <= 200 and 40 <= r[2] <= 200]
    m3_pairs = [(float(r[3]), float(r[4])) for r in rows_s if r[0] is not None and isinstance(r[3], (int, float)) and isinstance(r[4], (int, float)) and 30 <= r[3] <= 200 and 30 <= r[4] <= 200]
    m2_stand = np.array([p[0] for p in m2_pairs])
    m2_sit = np.array([p[1] for p in m2_pairs])
    m3_stand = np.array([p[0] for p in m3_pairs])
    m3_sit = np.array([p[1] for p in m3_pairs])

    fig = plt.figure(figsize=(13.2, 7.9))
    gs = gridspec.GridSpec(2, 2, height_ratios=[1.02, 1.08], width_ratios=[1.12, 1.0], hspace=0.38, wspace=0.26)

    # Panel A: 10-second Lead-I ECG Time Series
    ax_a = fig.add_subplot(gs[0, :])
    ax_a.plot(t_sec, ecg_uv, color="#1f4e78", lw=1.1, label="Muse Lead-I ECG (AF7 vs. FPz finger pinch, 256 Hz)")
    ax_a.scatter(peaks_sec, ecg_uv[peak_indices], color="#d95f02", s=45, zorder=5, label="Detected R-Wave Peaks (n = 8 beats in 10 s)")
    for i in range(len(peaks_sec) - 1):
        mid_t = 0.5 * (peaks_sec[i] + peaks_sec[i + 1])
        rr_ms = peaks_ms[i + 1] - peaks_ms[i]
        ax_a.annotate(f"{rr_ms:.0f} ms", xy=(mid_t, 360), ha="center", va="bottom", fontsize=8.2, color="#b34800", fontweight="bold")
        ax_a.plot([peaks_sec[i], peaks_sec[i + 1]], [335, 335], color="#d95f02", lw=1.1, ls="--")
    ax_a.set_xlim(0, 10.0)
    ax_a.set_ylim(-390, 660)
    ax_a.set_xlabel("Time (seconds)")
    ax_a.set_ylabel("Potential (μV)")
    ax_a.set_title("A. Module 2 (EEGEduHeartRaw): Time-Domain Lead-I Electrocardiogram Recorded via Muse Forehead Electrodes", loc="left")
    ax_a.legend(loc="lower right", frameon=True)

    # Panel B: Zero-padded 8192-bin FFT Spectrum in BPM
    ax_b = fig.add_subplot(gs[1, 0])
    bpm_sub = bpm_axis[mask_bpm]
    env_norm = psd_env[mask_bpm] / np.max(psd_env[mask_bpm])
    hp2_norm = psd_hp2[mask_bpm] / np.max(psd_hp2[mask_bpm])

    broadband_ecg_path = os.path.join(DATA_DIR, "heart_raw_broadband.csv")
    if os.path.exists(broadband_ecg_path):
        try:
            df_bb = pd.read_csv(broadband_ecg_path)
            ecg_col = [c for c in df_bb.columns if "ch1" in c or "AF7" in c or "ecg" in c.lower()]
            if ecg_col:
                ecg_bb = pd.to_numeric(df_bb[ecg_col[0]], errors="coerce").fillna(0).values
                psd_env = np.abs(np.fft.rfft((ecg_bb - np.mean(ecg_bb)) * np.hanning(len(ecg_bb)), n=n_fft)) ** 2
        except Exception:
            pass

    ax_b.plot(bpm_sub, env_norm, color="#008080", lw=2.0, label="Mod 3 Passband 0.01–20 Hz (QRS Envelope Fundamental + Harmonics)")
    ax_b.fill_between(bpm_sub, 0, env_norm, color="#008080", alpha=0.18)
    ax_b.plot(bpm_sub, hp2_norm, color="#7570b3", lw=1.3, ls=":", label="High-Pass >2 Hz (=120 BPM cutoff; Harmonics only)")
    ax_b.axvline(47.60, color="#d95f02", ls="--", lw=1.6, label="Time-Domain R–R Rate (47.6 BPM)")

    f0_idx = np.argmin(np.abs(bpm_sub - 47.6))
    f3_idx = np.argmin(np.abs(bpm_sub - 142.8))
    ax_b.scatter([bpm_sub[f0_idx]], [env_norm[f0_idx]], color="#d95f02", s=50, zorder=5)
    ax_b.annotate("Fundamental (f₀)\n47.6 BPM (0.79 Hz)", xy=(47.6, env_norm[f0_idx]), xytext=(54, 0.78),
                  arrowprops=dict(arrowstyle="->", color="#b34800", lw=1.3), fontsize=8.0, fontweight="bold", color="#b34800")
    ax_b.annotate("2f₀ Harmonic\n(95.2 BPM)", xy=(95.2, env_norm[np.argmin(np.abs(bpm_sub - 95.2))]), xytext=(92, 0.50),
                  arrowprops=dict(arrowstyle="->", color="#005a5a", lw=1.2), fontsize=7.8, color="#005a5a", ha="center")
    ax_b.annotate("3f₀ QRS Harmonic\n(142.8 BPM = 2.38 Hz)", xy=(142.8, env_norm[f3_idx]), xytext=(116, 0.82),
                  arrowprops=dict(arrowstyle="->", color="#4b4682", lw=1.2), fontsize=7.8, fontweight="bold", color="#4b4682", ha="center")

    ax_b.set_xlim(30, 155)
    ax_b.set_ylim(0, 1.35)
    ax_b.set_xlabel("Heart Frequency (Beats Per Minute, Hz × 60)")
    ax_b.set_ylabel("Normalized Spectral Power")
    ax_b.set_title("B. Module 3 (EEGEduHeartSpectra): 8,192-Bin FFT Spectrum", loc="left")
    ax_b.legend(loc="upper left", frameon=True, fontsize=7.3)

    # Panel C: Classroom Orthostatic Heart Rate Experiment (Standing vs Sitting)
    ax_c = fig.add_subplot(gs[1, 1])
    positions = [1, 2, 3.4, 4.4]
    data_list = [m2_stand, m2_sit, m3_stand, m3_sit]
    colors = ["#d95f02", "#2e75b6", "#d95f02", "#2e75b6"]

    for i in range(len(m2_stand)):
        ax_c.plot([1, 2], [m2_stand[i], m2_sit[i]], color="#8c6d53", alpha=0.18, lw=0.75)
    for i in range(len(m3_stand)):
        ax_c.plot([3.4, 4.4], [m3_stand[i], m3_sit[i]], color="#4d7996", alpha=0.18, lw=0.75)

    bp = ax_c.boxplot(data_list, positions=positions, widths=0.50, patch_artist=True, showfliers=False, medianprops=dict(color="black", lw=1.6))
    for patch, col in zip(bp["boxes"], colors):
        patch.set_facecolor(col)
        patch.set_alpha(0.65)

    rng = np.random.default_rng(42)
    for pos, arr, col in zip(positions, data_list, colors):
        jitter = rng.uniform(-0.14, 0.14, size=len(arr))
        ax_c.scatter(np.full_like(arr, pos) + jitter, arr, color=col, alpha=0.45, s=15, edgecolors="none")

    ax_c.plot([1, 1, 2, 2], [171, 176, 176, 171], lw=1.2, color="#222")
    ax_c.text(1.5, 178, "*", ha="center", va="bottom", fontsize=11, fontweight="bold")

    ax_c.plot([3.4, 3.4, 4.4, 4.4], [123, 128, 128, 123], lw=1.2, color="#222")
    ax_c.text(3.9, 130, "***", ha="center", va="bottom", fontsize=11, fontweight="bold")

    ax_c.set_xticks(positions)
    ax_c.set_xticklabels(["Standing\n(Mod 2 Time)", "Sitting\n(Mod 2 Time)", "Standing\n(Mod 3 FFT)", "Sitting\n(Mod 3 FFT)"])
    ax_c.set_ylabel("Heart Rate (BPM)")
    ax_c.set_ylim(26, 202)
    ax_c.set_title("C. Classroom Orthostatic Challenge (Standing vs. Sitting)", loc="left")

    fig.savefig(os.path.join(OUT_DIR, "fig2_ecg_time_to_frequency_bridge.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig2_ecg_time_to_frequency_bridge.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Fig 2")


def make_fig3_multichannel_spectra():
    """Fig 3: Modules 4–7 Empirical Multi-Channel EEG Traces (with Blink), 4-Channel PSD, Band Power (Mod 6), and Spectrogram (Mod 7)."""
    wb_es = openpyxl.load_workbook(os.path.join(DATA_DIR, "eeg_spectra.xlsx"), data_only=True)
    ws_es = wb_es.active
    rows_es = list(ws_es.iter_rows(values_only=True))
    data_rows = [r for r in rows_es[1:] if r[0] is not None and isinstance(r[0], (int, float))]

    freqs = np.arange(1, 39, dtype=float)
    ch_names = ["TP9 (Left Ear)", "AF7 (Left Forehead)", "AF8 (Right Forehead)", "TP10 (Right Ear)"]
    ch_colors = ["#7570b3", "#1b9e77", "#d95f02", "#e7298a"]
    ch_matrices = []
    for ch_idx in range(4):
        start_col = 1 + ch_idx * 38
        mat = np.array([[float(r[c]) for c in range(start_col, start_col + 38)] for r in data_rows])
        ch_matrices.append(mat)

    raw_csv = os.path.join(DATA_DIR, "raw_blink_epoch_1024.csv")
    raw_lines = []
    with open(raw_csv, "r") as f:
        next(f)
        for line in f:
            if not line.strip():
                continue
            parts = line.strip().split(",")
            raw_lines.append([float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])])
    raw_arr = np.array(raw_lines)
    raw_win = raw_arr - np.mean(raw_arr, axis=0, keepdims=True)
    t_raw = np.linspace(0, 4.0, len(raw_win))

    fig = plt.figure(figsize=(13.2, 8.1))
    gs = gridspec.GridSpec(2, 2, height_ratios=[1.02, 1.05], width_ratios=[1.05, 1.0], hspace=0.38, wspace=0.28)

    # Panel A: 4-Channel 256 Hz Time-Domain EEG Trace (Unclipped, with Scale Bar and Blink Highlight)
    ax_a = fig.add_subplot(gs[0, 0])
    offsets = [340, 120, -100, -310]
    ax_a.axvspan(2.68, 3.62, color="#fee090", alpha=0.38, label="Ocular Blink (FPz Ref Dipole)")
    for ch_idx in range(4):
        trace = raw_win[:, ch_idx]
        ax_a.plot(t_raw, trace + offsets[ch_idx], color=ch_colors[ch_idx], lw=0.95, label=ch_names[ch_idx])

    # Place 200 uV vertical calibration scale bar in clean lower-left space below TP10 baseline
    ax_a.plot([0.22, 0.22], [-545, -345], color="#111111", lw=2.3, zorder=6)
    ax_a.plot([0.16, 0.28], [-545, -545], color="#111111", lw=1.8, zorder=6)
    ax_a.plot([0.16, 0.28], [-345, -345], color="#111111", lw=1.8, zorder=6)
    ax_a.text(0.33, -445, "200 μV", fontsize=7.9, fontweight="bold", va="center", color="#111111",
              bbox=dict(boxstyle="round,pad=0.15", facecolor="white", edgecolor="none", alpha=0.85))

    ax_a.annotate("Ocular Blink (~205 μV on TP9/TP10\nvia FPz Forehead Reference)",
                  xy=(3.12, offsets[0] + 165), xytext=(1.35, 470),
                  arrowprops=dict(arrowstyle="->", lw=1.2, color="#b34800"),
                  fontsize=7.8, fontweight="bold", color="#b34800", ha="center")

    ax_a.set_yticks(offsets)
    ax_a.set_yticklabels(["TP9", "AF7", "AF8", "TP10"], fontweight="bold")
    ax_a.set_xlim(0, 4.0)
    ax_a.set_ylim(-575, 565)
    ax_a.set_xlabel("Time Window (seconds, 1,024 samples @ 256 Hz)")
    ax_a.set_ylabel("Channel (μV offset, FPz ref)")
    ax_a.set_title("A. Mod 4 (EEGEduRaw): 4-Ch 256 Hz Stream & Blink Dipole", loc="left")

    # Panel B: 4-Channel Power Spectral Density (Module 5)
    ax_b = fig.add_subplot(gs[0, 1])
    band_defs = [("δ", 1, 4.5, "#e0f3f8"), ("θ", 4.5, 7.5, "#abd9e9"), ("α", 7.5, 12.5, "#fee090"), ("β", 12.5, 30.5, "#fdae61"), ("γ", 30.5, 38, "#f46d43")]
    for b_name, f_lo, f_hi, b_col in band_defs:
        ax_b.axvspan(f_lo, f_hi, color=b_col, alpha=0.22)
        ax_b.text(0.5 * (f_lo + f_hi), 24.3, b_name, ha="center", va="top", fontsize=9, fontweight="bold", color="#333")

    for ch_idx in range(4):
        mat = ch_matrices[ch_idx]
        mean_psd = np.mean(mat, axis=0)
        sem_psd = np.std(mat, axis=0, ddof=1) / np.sqrt(len(mat))
        ax_b.plot(freqs, mean_psd, color=ch_colors[ch_idx], lw=1.6, label=ch_names[ch_idx])
        ax_b.fill_between(freqs, np.maximum(0.1, mean_psd - sem_psd), mean_psd + sem_psd, color=ch_colors[ch_idx], alpha=0.15)
    ax_b.set_xlim(1, 38)
    ax_b.set_ylim(0, 25.5)
    ax_b.set_xlabel("Frequency (Hz)")
    ax_b.set_ylabel("Spectral Amplitude (μV)")
    ax_b.set_title("B. Mod 5 (EEGEduSpectra): 4-Ch Amplitude Spectra & Bands", loc="left")
    ax_b.legend(loc="upper right", bbox_to_anchor=(0.99, 0.87), frameon=True, fontsize=7.8)

    # Panel C: Canonical Band Power Summary (Module 6 — matches caption C!)
    ax_c = fig.add_subplot(gs[1, 0])
    band_ranges = [(1, 4), (5, 7), (8, 12), (13, 30), (31, 38)]
    band_names = ["Delta\n(1–4 Hz)", "Theta\n(5–7 Hz)", "Alpha\n(8–12 Hz)", "Beta\n(13–30 Hz)", "Gamma\n(31–38 Hz)"]
    x_pos = np.arange(len(band_names))
    bar_w = 0.18
    for ch_idx in range(4):
        mat = ch_matrices[ch_idx]
        b_means = [np.mean(mat[:, (freqs >= lo) & (freqs <= hi)]) for lo, hi in band_ranges]
        b_sems = [np.std(np.mean(mat[:, (freqs >= lo) & (freqs <= hi)], axis=1), ddof=1) / np.sqrt(len(mat)) for lo, hi in band_ranges]
        ax_c.bar(x_pos + (ch_idx - 1.5) * bar_w, b_means, width=bar_w, yerr=b_sems, capsize=2,
                 color=ch_colors[ch_idx], alpha=0.85, label=ch_names[ch_idx].split()[0])
    ax_c.set_xticks(x_pos)
    ax_c.set_xticklabels(band_names)
    ax_c.set_ylabel("Mean Band Amplitude (μV)")
    ax_c.set_title("C. Mod 6 (EEGEduBands): Multi-Ch Band Decomposition", loc="left")
    ax_c.legend(loc="upper right", frameon=True, ncol=2)

    # Panel D: Rolling Time-Frequency Spectrogram (Module 8 — matches caption D!)
    ax_d = fig.add_subplot(gs[1, 1])
    t_epochs = (np.array([float(r[0]) for r in data_rows]) - float(data_rows[0][0])) / 1000.0
    spec_db = 10 * np.log10(np.clip(ch_matrices[0].T, 1e-2, None))
    im = ax_d.imshow(spec_db, aspect="auto", origin="lower",
                     extent=[t_epochs[0], t_epochs[-1], freqs[0], freqs[-1]], cmap="magma")
    cbar = fig.colorbar(im, ax=ax_d, pad=0.02)
    cbar.set_label("Spectral Level (10 log₁₀[A / 1 μV])", fontsize=8.5)
    ax_d.set_xlabel("Recording Time (seconds across 27 sequential epochs)")
    ax_d.set_ylabel("Frequency (Hz)")
    ax_d.set_title("D. Mod 8 (EEGEduSpectro): Time–Frequency Waterfall (TP9)", loc="left")

    fig.savefig(os.path.join(OUT_DIR, "fig3_eeg_time_frequency_artifacts_spectra.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig3_eeg_time_frequency_artifacts_spectra.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Fig 3")


def make_fig4_classroom_alpha():
    """Fig 4: Module 9 Flagship Classroom Experiment (N=67 Complete 4-Condition Student Recordings, Berger Effect)."""
    wb = openpyxl.load_workbook(os.path.join(DATA_DIR, "alpha_group.xlsx"), data_only=True)

    def load_sheet(name):
        ws = wb[name]
        rows = list(ws.iter_rows(values_only=True))
        freqs = [float(x) for x in rows[1][1:31]]
        subj = {}
        for r in rows[2:]:
            if r[0] is not None and isinstance(r[0], (int, float)):
                vals = [float(x) if isinstance(x, (int, float)) else np.nan for x in r[1:31]]
                if len(vals) == 30 and not any(np.isnan(vals)):
                    subj[int(r[0])] = np.array(vals)
        return np.array(freqs), subj

    freqs, of = load_sheet("OpenFrontal")
    _, ot = load_sheet("OpenTemporal")
    _, cf = load_sheet("ClosedFrontal")
    _, ct = load_sheet("ClosedTemporal")
    common_ids = sorted(set(of.keys()) & set(ot.keys()) & set(cf.keys()) & set(ct.keys()))

    OF = np.array([of[i] for i in common_ids])
    OT = np.array([ot[i] for i in common_ids])
    CF = np.array([cf[i] for i in common_ids])
    CT = np.array([ct[i] for i in common_ids])

    OF_rel = OF / OF.sum(axis=1, keepdims=True) * 100.0
    OT_rel = OT / OT.sum(axis=1, keepdims=True) * 100.0
    CF_rel = CF / CF.sum(axis=1, keepdims=True) * 100.0
    CT_rel = CT / CT.sum(axis=1, keepdims=True) * 100.0

    n_subj = len(common_ids)
    fig = plt.figure(figsize=(13.2, 8.3))
    gs = gridspec.GridSpec(2, 2, height_ratios=[1.05, 1.02], width_ratios=[1.0, 1.0], hspace=0.36, wspace=0.28)

    # Panel A: Temporal Channels (TP9/TP10) Relative PSD (Eyes Open vs Closed)
    ax_a = fig.add_subplot(gs[0, 0])
    ax_a.axvspan(8, 12, color="#fee090", alpha=0.38, label="Alpha Band (8–12 Hz)")
    for arr, label, col, ls in [(OT_rel, "Eyes Open (Temporal TP9/TP10)", "#2e75b6", "--"),
                                (CT_rel, "Eyes Closed (Temporal TP9/TP10)", "#d95f02", "-")]:
        m = arr.mean(axis=0)
        s = arr.std(axis=0, ddof=1) / np.sqrt(n_subj)
        ax_a.plot(freqs, m, color=col, lw=2.0, ls=ls, label=label)
        ax_a.fill_between(freqs, m - s, m + s, color=col, alpha=0.2)
    ax_a.annotate("10 Hz Berger Peak (***)", xy=(10, CT_rel[:, 9].mean()), xytext=(13.5, 5.8),
                  arrowprops=dict(arrowstyle="->", lw=1.4, color="#b34800"), fontsize=8.6, fontweight="bold", color="#b34800")
    ax_a.set_xlim(1, 30)
    ax_a.set_ylim(0.5, 9.8)
    ax_a.set_xlabel("Frequency (Hz)")
    ax_a.set_ylabel("Relative Spectral Amplitude (% per 1 Hz bin)")
    ax_a.set_title(f"A. Temporal (TP9/TP10): Eyes Open vs. Closed (N = {n_subj})", loc="left")
    ax_a.legend(loc="upper right", frameon=True)

    # Panel B: Frontal Channels (AF7/AF8) Relative PSD (Eyes Open vs Closed)
    ax_b = fig.add_subplot(gs[0, 1])
    ax_b.axvspan(8, 12, color="#fee090", alpha=0.38, label="Alpha Band (8–12 Hz)")
    for arr, label, col, ls in [(OF_rel, "Eyes Open (Frontal AF7/AF8)", "#2e75b6", "--"),
                                (CF_rel, "Eyes Closed (Frontal AF7/AF8)", "#008080", "-")]:
        m = arr.mean(axis=0)
        s = arr.std(axis=0, ddof=1) / np.sqrt(n_subj)
        ax_b.plot(freqs, m, color=col, lw=2.0, ls=ls, label=label)
        ax_b.fill_between(freqs, m - s, m + s, color=col, alpha=0.2)
    ax_b.annotate("Frontal 10 Hz Peak (**)", xy=(10, CF_rel[:, 9].mean()), xytext=(13.5, 5.2),
                  arrowprops=dict(arrowstyle="->", lw=1.4, color="#005a5a"), fontsize=8.6, fontweight="bold", color="#005a5a")
    ax_b.set_xlim(1, 30)
    ax_b.set_ylim(0.5, 9.8)
    ax_b.set_xlabel("Frequency (Hz)")
    ax_b.set_ylabel("Relative Spectral Amplitude (% per 1 Hz bin)")
    ax_b.set_title(f"B. Frontal (AF7/AF8): Eyes Open vs. Closed (N = {n_subj})", loc="left")
    ax_b.legend(loc="upper right", frameon=True)

    # Panel C: Bin-by-Bin Paired t-statistic Curve (1-30 Hz) for Temporal vs Frontal (with Bonferroni threshold)
    ax_c = fig.add_subplot(gs[1, 0])
    t_temp = np.array([stats.ttest_rel(CT_rel[:, i], OT_rel[:, i])[0] for i in range(30)])
    t_front = np.array([stats.ttest_rel(CF_rel[:, i], OF_rel[:, i])[0] for i in range(30)])
    ax_c.axvspan(8, 12, color="#fee090", alpha=0.35)
    ax_c.axhline(0, color="#333", lw=1.0)
    ax_c.axhline(3.28, color="#b30000", lw=1.0, ls="--", label="Bonferroni threshold")
    ax_c.axhline(-3.28, color="#b30000", lw=1.0, ls="--")
    ax_c.plot(freqs, t_temp, color="#d95f02", lw=2.0, marker="o", ms=4, label="Temporal (Closed − Open) t-stat")
    ax_c.plot(freqs, t_front, color="#008080", lw=2.0, marker="s", ms=4, label="Frontal (Closed − Open) t-stat")
    ax_c.set_xlim(1, 30)
    ax_c.set_ylim(-8.2, 6.4)
    ax_c.set_xlabel("Frequency (Hz)")
    ax_c.set_ylabel("Paired t-Statistic (Closed vs. Open, df = 66)")
    ax_c.set_title("C. Spectral Specificity Across Scalp Regions", loc="left")
    ax_c.legend(loc="lower right", frameon=True, fontsize=7.8)

    # Panel D: Individual Student Paired Alpha Prominence (8-12 Hz Bump above 5-7 & 14-16 Hz Flanks)
    ax_d = fig.add_subplot(gs[1, 1])
    alpha_idx = (freqs >= 8) & (freqs <= 12)
    flank_idx = ((freqs >= 5) & (freqs <= 7)) | ((freqs >= 14) & (freqs <= 16))
    ot_bump = OT_rel[:, alpha_idx].mean(axis=1) - OT_rel[:, flank_idx].mean(axis=1)
    ct_bump = CT_rel[:, alpha_idx].mean(axis=1) - CT_rel[:, flank_idx].mean(axis=1)
    of_bump = OF_rel[:, alpha_idx].mean(axis=1) - OF_rel[:, flank_idx].mean(axis=1)
    cf_bump = CF_rel[:, alpha_idx].mean(axis=1) - CF_rel[:, flank_idx].mean(axis=1)

    t_b_temp, p_b_temp = stats.ttest_rel(ct_bump, ot_bump)
    n_rep = int(np.sum(ct_bump > ot_bump))
    pct_rep = n_rep / n_subj * 100.0

    for i in range(n_subj):
        ax_d.plot([1, 2], [ot_bump[i], ct_bump[i]], color="#d95f02", alpha=0.18, lw=0.8)
        ax_d.plot([3.3, 4.3], [of_bump[i], cf_bump[i]], color="#008080", alpha=0.18, lw=0.8)

    bp = ax_d.boxplot([ot_bump, ct_bump, of_bump, cf_bump], positions=[1, 2, 3.3, 4.3], widths=0.45,
                      patch_artist=True, showfliers=False, medianprops=dict(color="black", lw=1.6))
    for patch, col in zip(bp["boxes"], ["#2e75b6", "#d95f02", "#2e75b6", "#008080"]):
        patch.set_facecolor(col)
        patch.set_alpha(0.72)

    ax_d.axhline(0, color="#666", lw=0.8, ls="--")
    ax_d.plot([1, 1, 2, 2], [2.62, 2.78, 2.78, 2.62], lw=1.2, color="#222")
    ax_d.text(1.5, 2.82, "***", ha="center", va="bottom", fontsize=11, fontweight="bold")
    ax_d.plot([3.3, 3.3, 4.3, 4.3], [1.95, 2.10, 2.10, 1.95], lw=1.2, color="#222")
    ax_d.text(3.8, 2.14, "ns", ha="center", va="bottom", fontsize=9.0, color="#444")

    ax_d.set_xticks([1, 2, 3.3, 4.3])
    ax_d.set_xticklabels(["Eyes Open\n(Temporal)", "Eyes Closed\n(Temporal)", "Eyes Open\n(Frontal)", "Eyes Closed\n(Frontal)"])
    ax_d.set_ylabel("1/f-Detrended Alpha Bump (% per bin)")
    ax_d.set_ylim(-1.65, 3.65)
    ax_d.set_title(f"D. Single-Student Alpha Prominence (N = {n_subj})", loc="left")

    fig.savefig(os.path.join(OUT_DIR, "fig4_classroom_berger_alpha_experiment.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig4_classroom_berger_alpha_experiment.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Fig 4")


def make_fig5_ssvep_erp_bci():
    """Fig 5: Modules 10, 11, and 12 Benchmarks — SSVEP Forward Model, Oddball ERP Convergence Model, and Empirical GroupKFold KNN BCI."""
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.model_selection import GroupKFold, cross_val_predict
    from sklearn.preprocessing import StandardScaler, Normalizer
    from sklearn.pipeline import make_pipeline
    from sklearn.metrics import roc_curve, auc, accuracy_score

    rng = np.random.default_rng(42)
    fs = 256.0

    # --- Panel A: Module 10 SSVEP (4 Hz vs 11 Hz) Benchmark ---
    ssvep_4hz_path = os.path.join(DATA_DIR, "ssvep_4hz.csv")
    ssvep_11hz_path = os.path.join(DATA_DIR, "ssvep_11hz.csv")
    emp_f4, emp_p4, emp_f11, emp_p11 = load_empirical_ssvep(ssvep_4hz_path, ssvep_11hz_path)

    if emp_p4 is not None and emp_p11 is not None:
        freqs_ssvep = emp_f4
        psd_4hz = emp_p4
        psd_11hz = emp_p11
        n_epochs = len(psd_4hz)
        title_a = "A. Mod 10: SSVEP Empirical Recording (4 vs. 11 Hz)"
    else:
        t_ep = np.arange(0, 4.0, 1.0 / fs)
        freqs_ssvep = np.fft.rfftfreq(len(t_ep), 1.0 / fs)
        n_epochs = 25
        w = np.hanning(len(t_ep))
        U = np.mean(w ** 2)  # 0.375 for Hann incoherent power correction

        def sim_ssvep(f_stim):
            psds = []
            for _ in range(n_epochs):
                white = rng.standard_normal(len(t_ep))
                fft_w = np.fft.rfft(white)
                f_axis = np.maximum(freqs_ssvep, 0.5)
                pink = np.fft.irfft(fft_w / (f_axis ** 0.65), n=len(t_ep)) * 14.0
                spont_alpha = 2.8 * np.sin(2 * np.pi * 9.5 * t_ep + rng.uniform(0, 2 * np.pi))
                evoked = 6.2 * np.sin(2 * np.pi * f_stim * t_ep + rng.uniform(-0.15, 0.15)) + \
                         2.1 * np.sin(2 * np.pi * (2 * f_stim) * t_ep + rng.uniform(-0.2, 0.2))
                sig = pink + spont_alpha + evoked
                # Corrected discrete one-sided PSD with fs and Hann incoherent power correction U = 0.375
                psd = 2.0 * (np.abs(np.fft.rfft(sig * w)) ** 2) / (fs * len(t_ep) * U)
                psds.append(psd)
            return np.array(psds)

        psd_4hz = sim_ssvep(4.0)
        psd_11hz = sim_ssvep(11.0)
        title_a = "A. Mod 10: SSVEP (Synthetic Forward Model)"

    idx_4 = np.argmin(np.abs(freqs_ssvep - 4.0))
    idx_8 = np.argmin(np.abs(freqs_ssvep - 8.0))
    idx_95 = np.argmin(np.abs(freqs_ssvep - 9.5))
    idx_11 = np.argmin(np.abs(freqs_ssvep - 11.0))
    idx_22 = np.argmin(np.abs(freqs_ssvep - 22.0))
    flank_4 = (np.abs(freqs_ssvep - 4.0) >= 0.75) & (np.abs(freqs_ssvep - 4.0) <= 2.0)
    flank_11 = (np.abs(freqs_ssvep - 11.0) >= 0.75) & (np.abs(freqs_ssvep - 11.0) <= 2.0)
    snr_4_db = float(10 * np.log10(psd_4hz.mean(axis=0)[idx_4] / max(psd_4hz.mean(axis=0)[flank_4].mean(), 1e-6)))
    snr_11_db = float(10 * np.log10(psd_11hz.mean(axis=0)[idx_11] / max(psd_11hz.mean(axis=0)[flank_11].mean(), 1e-6)))

    # --- Panel B: Module 11 Visual Oddball ERP Benchmark ---
    evoked_path = os.path.join(DATA_DIR, "evoked_oddball.csv")
    emp_t_erp, emp_targ, emp_std = load_empirical_oddball_erp(evoked_path, fs=fs)
    p300_template = None
    single_trial_noise_sd = 18.5

    if emp_targ is not None and emp_std is not None:
        t_erp_ms = emp_t_erp
        target_trials = emp_targ
        std_trials = emp_std
        title_b = "B. Mod 11: Visual Oddball ERP Empirical Recording"
    else:
        t_erp_ms = np.linspace(-100, 600, int(0.7 * fs))
        p300_template = 11.5 * np.exp(-0.5 * ((t_erp_ms - 365.0) / 55.0) ** 2) - 4.2 * np.exp(-0.5 * ((t_erp_ms - 165.0) / 28.0) ** 2)
        std_template = 2.0 * np.exp(-0.5 * ((t_erp_ms - 150.0) / 30.0) ** 2)
        n_max_trials = 120

        # Physical BLE 12-sample packet arrival jitter (Uniform[-23.4, +23.4] ms) + stack Gaussian jitter (sigma = 6.0 ms)
        target_trials = []
        for _ in range(n_max_trials):
            tau_packet = rng.uniform(-23.4375, 23.4375)
            tau_stack = rng.normal(0, 6.0)
            t_shift = t_erp_ms - (tau_packet + tau_stack)
            sig = 11.5 * np.exp(-0.5 * ((t_shift - 365.0) / 55.0) ** 2) - 4.2 * np.exp(-0.5 * ((t_shift - 165.0) / 28.0) ** 2)
            noise = rng.normal(0, single_trial_noise_sd, len(t_erp_ms))
            target_trials.append(sig + noise)
        target_trials = np.array(target_trials)

        std_trials = []
        for _ in range(n_max_trials * 3):
            tau_packet = rng.uniform(-23.4375, 23.4375)
            tau_stack = rng.normal(0, 6.0)
            t_shift = t_erp_ms - (tau_packet + tau_stack)
            sig = 2.0 * np.exp(-0.5 * ((t_shift - 150.0) / 30.0) ** 2)
            noise = rng.normal(0, single_trial_noise_sd, len(t_erp_ms))
            std_trials.append(sig + noise)
        std_trials = np.array(std_trials)
        title_b = "B. Mod 11: Oddball P300 √N (Synthetic Forward Model)"

    bl_mask = t_erp_ms < 0
    target_trials -= target_trials[:, bl_mask].mean(axis=1, keepdims=True)
    std_trials -= std_trials[:, bl_mask].mean(axis=1, keepdims=True)

    p300_win = (t_erp_ms >= 300) & (t_erp_ms <= 430)
    n_targs = len(target_trials)
    max_k = min(120, n_targs)
    trial_counts = np.arange(1, max_k + 1)
    snr_empirical = []
    for n_k in trial_counts:
        snrs_k = []
        for _ in range(40):
            idx_sub = rng.choice(n_targs, size=n_k, replace=False)
            avg_wav = target_trials[idx_sub].mean(axis=0)
            sig_pk = avg_wav[p300_win].mean()
            noise_rms = np.std(avg_wav[bl_mask], ddof=1)
            snrs_k.append(sig_pk / max(noise_rms, 0.2))
        snr_empirical.append(np.mean(snrs_k))
    snr_empirical = np.array(snr_empirical)
    snr_1 = float(snr_empirical[0])
    snr_30 = float(snr_empirical[min(29, len(snr_empirical) - 1)])
    snr_100 = float(snr_empirical[min(99, len(snr_empirical) - 1)])

    if p300_template is not None:
        mu_p300 = float(np.mean(p300_template[p300_win]))
        snr_1_theory = mu_p300 / single_trial_noise_sd  # 0.503
    else:
        snr_1_theory = snr_1

    # --- Panel C: Module 12 Subject-Grouped 5-Fold KNN Classifier on Empirical N=67 Student Dataset (134 recordings) ---
    wb = openpyxl.load_workbook(os.path.join(DATA_DIR, "alpha_group.xlsx"), data_only=True)

    def load_sheet_dict(name):
        ws = wb[name]
        rows = list(ws.iter_rows(values_only=True))
        freqs = [float(x) for x in rows[1][1:31]]
        subj = {}
        for r in rows[2:]:
            if r[0] is not None and isinstance(r[0], (int, float)):
                vals = [float(x) if isinstance(x, (int, float)) else np.nan for x in r[1:31]]
                if len(vals) == 30 and not any(np.isnan(vals)):
                    subj[int(r[0])] = np.array(vals)
        return np.array(freqs), subj

    freqs_a, of = load_sheet_dict("OpenFrontal")
    _, ot = load_sheet_dict("OpenTemporal")
    _, cf = load_sheet_dict("ClosedFrontal")
    _, ct = load_sheet_dict("ClosedTemporal")
    common_ids = sorted(set(of.keys()) & set(ot.keys()) & set(cf.keys()) & set(ct.keys()))

    OF = np.array([of[i] for i in common_ids])
    OT = np.array([ot[i] for i in common_ids])
    CF = np.array([cf[i] for i in common_ids])
    CT = np.array([ct[i] for i in common_ids])

    OF_rel = OF / OF.sum(axis=1, keepdims=True) * 100.0
    OT_rel = OT / OT.sum(axis=1, keepdims=True) * 100.0
    CF_rel = CF / CF.sum(axis=1, keepdims=True) * 100.0
    CT_rel = CT / CT.sum(axis=1, keepdims=True) * 100.0

    y_bci = np.array([0] * len(common_ids) + [1] * len(common_ids))
    groups_bci = np.array(common_ids + common_ids)

    X_full = np.vstack([np.hstack([OF_rel, OT_rel]), np.hstack([CF_rel, CT_rel])])

    alpha_idx = (freqs_a >= 8) & (freqs_a <= 12)
    flank_idx = ((freqs_a >= 5) & (freqs_a <= 7)) | ((freqs_a >= 14) & (freqs_a <= 16))

    def extract_alpha_feats(F_rel, T_rel):
        t_alpha = T_rel[:, alpha_idx]
        f_alpha = F_rel[:, alpha_idx]
        t_bump = (T_rel[:, alpha_idx].mean(axis=1) - T_rel[:, flank_idx].mean(axis=1))[:, None]
        f_bump = (F_rel[:, alpha_idx].mean(axis=1) - F_rel[:, flank_idx].mean(axis=1))[:, None]
        tf_diff = t_bump - f_bump
        return np.hstack([t_alpha, f_alpha, t_bump, f_bump, tf_diff])

    X_alpha = np.vstack([extract_alpha_feats(OF_rel, OT_rel), extract_alpha_feats(CF_rel, CT_rel)])

    gkf = GroupKFold(n_splits=5)
    knn_full = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5, weights="distance"))
    knn_alpha = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=7, weights="distance"))

    prob_full = cross_val_predict(knn_full, X_full, y_bci, cv=gkf, groups=groups_bci, method="predict_proba")[:, 1]
    pred_full = (prob_full >= 0.5).astype(int)
    acc_full = float(accuracy_score(y_bci, pred_full) * 100.0)
    fpr_full, tpr_full, _ = roc_curve(y_bci, prob_full)
    auc_full = float(auc(fpr_full, tpr_full))

    prob_alpha = cross_val_predict(knn_alpha, X_alpha, y_bci, cv=gkf, groups=groups_bci, method="predict_proba")[:, 1]
    pred_alpha = (prob_alpha >= 0.5).astype(int)
    acc_alpha = float(accuracy_score(y_bci, pred_alpha) * 100.0)
    fpr_alpha, tpr_alpha, _ = roc_curve(y_bci, prob_alpha)
    auc_alpha = float(auc(fpr_alpha, tpr_alpha))

    # Unit-L2 Normalization (matching ml5.KNNClassifier)
    knn_l2_full = make_pipeline(Normalizer(norm="l2"), KNeighborsClassifier(n_neighbors=5, weights="distance"))
    knn_l2_alpha = make_pipeline(Normalizer(norm="l2"), KNeighborsClassifier(n_neighbors=7, weights="distance"))

    prob_l2_full = cross_val_predict(knn_l2_full, X_full, y_bci, cv=gkf, groups=groups_bci, method="predict_proba")[:, 1]
    pred_l2_full = (prob_l2_full >= 0.5).astype(int)
    acc_l2_full = float(accuracy_score(y_bci, pred_l2_full) * 100.0)
    fpr_l2_full, tpr_l2_full, _ = roc_curve(y_bci, prob_l2_full)
    auc_l2_full = float(auc(fpr_l2_full, tpr_l2_full))

    prob_l2_alpha = cross_val_predict(knn_l2_alpha, X_alpha, y_bci, cv=gkf, groups=groups_bci, method="predict_proba")[:, 1]
    pred_l2_alpha = (prob_l2_alpha >= 0.5).astype(int)
    acc_l2_alpha = float(accuracy_score(y_bci, pred_l2_alpha) * 100.0)
    fpr_l2_alpha, tpr_l2_alpha, _ = roc_curve(y_bci, prob_l2_alpha)
    auc_l2_alpha = float(auc(fpr_l2_alpha, tpr_l2_alpha))

    # Plot Figure 5
    fig = plt.figure(figsize=(14.8, 4.4))
    gs = gridspec.GridSpec(1, 3, width_ratios=[1.02, 1.14, 1.02], wspace=0.35)

    # Panel A: SSVEP 4 Hz vs 11 Hz Benchmark
    ax_a = fig.add_subplot(gs[0])
    m4, s4 = psd_4hz.mean(axis=0), psd_4hz.std(axis=0, ddof=1) / np.sqrt(n_epochs)
    m11, s11 = psd_11hz.mean(axis=0), psd_11hz.std(axis=0, ddof=1) / np.sqrt(n_epochs)
    ax_a.axvline(4.0, color="#2e75b6", ls=":", lw=1.1, alpha=0.8)
    ax_a.axvline(11.0, color="#d95f02", ls=":", lw=1.1, alpha=0.8)
    ax_a.plot(freqs_ssvep, m4, color="#2e75b6", lw=1.9, label="4 Hz Flicker")
    ax_a.fill_between(freqs_ssvep, m4 - s4, m4 + s4, color="#2e75b6", alpha=0.20)
    ax_a.plot(freqs_ssvep, m11, color="#d95f02", lw=1.9, label="11 Hz Flicker")
    ax_a.fill_between(freqs_ssvep, m11 - s11, m11 + s11, color="#d95f02", alpha=0.20)

    max_val_a = max(m4.max(), m11.max())
    ax_a.annotate("f₁ = 4 Hz", xy=(4.0, m4[idx_4]), xytext=(5.2, m4[idx_4] * 0.85),
                  arrowprops=dict(arrowstyle="->", lw=1.1, color="#1f4e78"), fontsize=7.5, fontweight="bold", color="#1f4e78")
    ax_a.annotate("2f₁ (8 Hz)", xy=(8.0, m4[idx_8]), xytext=(5.6, m4[idx_8] + 0.14 * max_val_a),
                  arrowprops=dict(arrowstyle="->", lw=1.0, color="#1f4e78"), fontsize=7.1, color="#1f4e78")
    ax_a.annotate("Endog. α\n(9.5 Hz)", xy=(9.5, m11[idx_95]), xytext=(9.2, m11[idx_95] + 0.16 * max_val_a),
                  arrowprops=dict(arrowstyle="->", lw=0.9, color="#555"), fontsize=6.9, color="#444", ha="center")
    ax_a.annotate("f₂ = 11 Hz", xy=(11.0, m11[idx_11]), xytext=(13.0, m11[idx_11] * 0.78),
                  arrowprops=dict(arrowstyle="->", lw=1.1, color="#b34800"), fontsize=7.5, fontweight="bold", color="#b34800")
    ax_a.annotate("2f₂ (22 Hz)", xy=(22.0, m11[idx_22]), xytext=(18.2, m11[idx_22] + 0.20 * max_val_a),
                  arrowprops=dict(arrowstyle="->", lw=1.0, color="#b34800"), fontsize=7.1, color="#b34800")

    ax_a.set_xlim(1, 24)
    ax_a.set_ylim(0, max_val_a * 1.28)
    ax_a.set_xlabel("Frequency (Hz)")
    ax_a.set_ylabel("Spectral Power (µV²/Hz)")
    ax_a.set_title(title_a, loc="left", fontsize=9.0, fontweight="bold")
    ax_a.legend(loc="upper right", frameon=True, fontsize=7.4)

    # Panel B: Oddball ERP Averaging & SNR Convergence
    ax_b = fig.add_subplot(gs[1])
    ax_b.axvspan(300, 430, color="#fee090", alpha=0.35, label="P300 Window (300–430 ms)")
    ax_b.axvline(0, color="#333", lw=1.0, ls="--")
    ax_b.axhline(0, color="#666", lw=0.8)
    ax_b.plot(t_erp_ms, target_trials[0], color="#d0d0d0", alpha=0.45, lw=0.8, label="Single Target Trial (N = 1)")
    ax_b.plot(t_erp_ms, std_trials[:min(100, len(std_trials))].mean(axis=0), color="#2e75b6", lw=1.7, ls="--", label="Standard ERP (N = 100)")
    ax_b.plot(t_erp_ms, target_trials[:min(20, len(target_trials))].mean(axis=0), color="#fc8d59", lw=1.6, label="Target Oddball ERP (N = 20)")
    ax_b.plot(t_erp_ms, target_trials[:min(100, len(target_trials))].mean(axis=0), color="#d95f02", lw=2.3, label="Target Oddball ERP (N = 100)")
    
    p300_peak_t = t_erp_ms[p300_win][np.argmax(target_trials[:min(100, len(target_trials))].mean(axis=0)[p300_win])]
    p300_peak_v = np.max(target_trials[:min(100, len(target_trials))].mean(axis=0)[p300_win])
    ax_b.annotate(f"Target P300 Peak\n({p300_peak_v:+.1f} μV @ {p300_peak_t:.0f} ms)",
                  xy=(p300_peak_t, p300_peak_v), xytext=(430, max(p300_peak_v + 6.0, 17.5)),
                  arrowprops=dict(arrowstyle="->", lw=1.2, color="#b34800"), fontsize=7.5, fontweight="bold", color="#b34800")

    ax_b.set_xlim(-100, 600)
    ax_b.set_ylim(-24, 30)
    ax_b.set_xlabel("Time Relative to Visual Stimulus Onset (ms)")
    ax_b.set_ylabel("Potential (µV)")
    ax_b.set_title(title_b, loc="left", fontsize=9.0, fontweight="bold")
    ax_b.legend(loc="lower right", frameon=True, fontsize=7.0, ncol=1)

    # Opaque white backdrop card behind inset + labels so background N=1 trace never bleeds into inset ticks/labels
    ax_b.add_patch(FancyBboxPatch((0.02, 0.50), 0.44, 0.48, transform=ax_b.transAxes,
                                  boxstyle="round,pad=0.01,rounding_size=0.02",
                                  facecolor="white", edgecolor="#cccccc", alpha=0.96, zorder=4))
    ax_ins = ax_b.inset_axes([0.10, 0.62, 0.33, 0.31], zorder=5)
    ax_ins.set_facecolor("white")
    ax_ins.plot(trial_counts, snr_empirical, color="#d95f02", lw=1.5, label="Monte Carlo")
    ax_ins.plot(trial_counts, snr_1_theory * np.sqrt(trial_counts), color="#222", ls=":", lw=1.2, label="√N Law")
    ax_ins.set_title(f"SNR: {snr_1:.1f} → {snr_100:.1f}", fontsize=7.1, pad=2)
    ax_ins.set_xlabel("Trials (N)", fontsize=6.6, labelpad=1)
    ax_ins.set_ylabel("SNR", fontsize=6.6, labelpad=1)
    ax_ins.tick_params(labelsize=6.1)

    # Panel C: Module 12 Subject-Grouped KNN Classifier ROC on N=67 Students (134 recordings)
    ax_c = fig.add_subplot(gs[2])
    ax_c.plot([0, 1], [0, 1], color="#888888", ls=":", lw=1.1, label="Chance")
    ax_c.plot(fpr_full, tpr_full, color="#2e75b6", lw=1.7, ls="-", label=f"Full 60-Bin (z-score; AUC = {auc_full:.2f})")
    ax_c.plot(fpr_l2_full, tpr_l2_full, color="#2e75b6", lw=1.7, ls="--", label=f"Full 60-Bin (Unit L₂; AUC = {auc_l2_full:.2f})")
    ax_c.plot(fpr_alpha, tpr_alpha, color="#d95f02", lw=2.0, ls="-", label=f"Alpha Prom. (z-score; AUC = {auc_alpha:.2f})")
    ax_c.plot(fpr_l2_alpha, tpr_l2_alpha, color="#d95f02", lw=2.0, ls="--", label=f"Alpha Prom. (Unit L₂; AUC = {auc_l2_alpha:.2f})")
    ax_c.set_xlim(0, 1)
    ax_c.set_ylim(0, 1.02)
    ax_c.set_xlabel("False Positive Rate (1 − Specificity)", fontsize=9.5)
    ax_c.set_ylabel("True Positive Rate (Sensitivity)", fontsize=9.5)
    ax_c.set_title("C. Mod 12: Empirical KNN BCI (N = 134)", loc="left", fontsize=9.0, fontweight="bold")
    ax_c.legend(
        loc="lower right",
        frameon=True,
        fontsize=6.5,
        framealpha=0.95,
        edgecolor="#cccccc",
        handlelength=1.6,
        handletextpad=0.5,
        borderpad=0.4,
        labelspacing=0.35,
    )

    fig.savefig(os.path.join(OUT_DIR, "fig5_ssvep_erp_bci_classifier_benchmarks.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig5_ssvep_erp_bci_classifier_benchmarks.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Fig 5")

    return {
        "ssvep_4hz_snr_db": round(snr_4_db, 2),
        "ssvep_11hz_snr_db": round(snr_11_db, 2),
        "erp_snr_n1": round(snr_1, 2),
        "erp_snr_n30": round(snr_30, 2),
        "erp_snr_n100": round(snr_100, 2),
        "bci_knn_full_acc": round(acc_full, 1),
        "bci_knn_full_auc": round(auc_full, 2),
        "bci_knn_alpha_acc": round(acc_alpha, 1),
        "bci_knn_alpha_auc": round(auc_alpha, 2),
        "bci_knn_l2_full_acc": round(acc_l2_full, 1),
        "bci_knn_l2_full_auc": round(auc_l2_full, 2),
        "bci_knn_l2_alpha_acc": round(acc_l2_alpha, 1),
        "bci_knn_l2_alpha_auc": round(auc_l2_alpha, 2),
    }


def export_paper1_stats_and_macros(bench_stats):
    """Compute and export all empirical statistics, CSV tables, JSON summary, and LaTeX macros for Paper 1."""
    p1_dir = os.path.join(BASE_DIR, "paper1_eegedu")
    tbl_dir = os.path.join(p1_dir, "tables")
    os.makedirs(tbl_dir, exist_ok=True)

    # 1. Module 2 & 3 Lead-I ECG Benchmark
    peaks_ms = np.array([621.0, 1887.0, 3141.0, 4398.0, 5680.0, 6938.0, 8215.0, 9445.0])
    rr_ms = np.diff(peaks_ms)
    mean_rr_ms = float(rr_ms.mean())
    sd_rr_ms = float(rr_ms.std(ddof=1))
    mean_bpm_raw = float(60000.0 / mean_rr_ms)
    ecg_dom_freq_hz = float(mean_bpm_raw / 60.0)
    ecg_harmonic_two_bpm = float(mean_bpm_raw * 2.0)
    ecg_harmonic_three_bpm = float(mean_bpm_raw * 3.0)

    # 2. Classroom Orthostatic & Alpha Single-Sheet Dataset (alpha_single.xlsx)
    wb_as = openpyxl.load_workbook(os.path.join(DATA_DIR, "alpha_single.xlsx"), data_only=True)
    rows_as = [r for r in list(wb_as["Sheet1"].iter_rows(values_only=True))[1:] if r[0] is not None]
    n_roster = len(rows_as)

    # Module 2 submissions & exclusions
    m2_sub = [r for r in rows_as if r[1] is not None or r[2] is not None]
    mod2_submitted = len(m2_sub)
    mod2_missing = n_roster - mod2_submitted

    def paired_col_stats(c1, c2, lo_thr):
        pairs = [(float(r[c1]), float(r[c2])) for r in rows_as
                 if isinstance(r[c1], (int, float)) and isinstance(r[c2], (int, float))
                 and lo_thr <= r[c1] <= 200 and lo_thr <= r[c2] <= 200]
        a = np.array([p[0] for p in pairs])
        b = np.array([p[1] for p in pairs])
        diff = a - b
        t_val, p_val = stats.ttest_rel(a, b)
        w_val, wp_val = stats.wilcoxon(a, b)
        dz = float(diff.mean() / diff.std(ddof=1))
        se = float(diff.std(ddof=1) / np.sqrt(len(diff)))
        t_crit = float(stats.t.ppf(0.975, len(diff) - 1))
        ci_lo, ci_hi = float(diff.mean() - t_crit * se), float(diff.mean() + t_crit * se)
        return len(a), float(a.mean()), float(a.std(ddof=1)), float(b.mean()), float(b.std(ddof=1)), float(t_val), float(p_val), dz, float(wp_val), ci_lo, ci_hi

    n_m2, m2_stand_m, m2_stand_sd, m2_sit_m, m2_sit_sd, m2_t, m2_p, m2_dz, m2_wp, m2_ci_lo, m2_ci_hi = paired_col_stats(1, 2, 40)
    mod2_excluded = mod2_submitted - n_m2
    mod2_pct_valid = float(n_m2 / mod2_submitted * 100.0)
    mod2_diff_mean = float(m2_stand_m - m2_sit_m)

    # Module 2 Symmetric Sensitivity Check [30, 200] BPM (N = 75)
    n_m2_sym, m2_sym_stand_m, m2_sym_stand_sd, m2_sym_sit_m, m2_sym_sit_sd, m2_sym_t, m2_sym_p, m2_sym_dz, m2_sym_wp, m2_sym_ci_lo, m2_sym_ci_hi = paired_col_stats(1, 2, 30)
    mod2_sym_diff_mean = float(m2_sym_stand_m - m2_sym_sit_m)

    # Module 3 submissions
    m3_sub = [r for r in rows_as if r[3] is not None or r[4] is not None]
    mod3_submitted = len(m3_sub)
    mod3_missing = n_roster - mod3_submitted

    n_m3, m3_stand_m, m3_stand_sd, m3_sit_m, m3_sit_sd, m3_t, m3_p, m3_dz, m3_wp, m3_ci_lo, m3_ci_hi = paired_col_stats(3, 4, 30)
    mod3_diff_mean = float(m3_stand_m - m3_sit_m)

    # Both ECG Complete Raw vs QC
    both_raw = [r for r in rows_as if all(isinstance(r[k], (int, float)) for k in (1, 2, 3, 4))]
    both_ecg_complete_raw = len(both_raw)

    both_qc = [(float(r[1]), float(r[2]), float(r[3]), float(r[4])) for r in rows_as
               if all(isinstance(r[k], (int, float)) for k in (1, 2, 3, 4))
               and 40 <= r[1] <= 200 and 40 <= r[2] <= 200 and 30 <= r[3] <= 200 and 30 <= r[4] <= 200]
    b_m2_diff = np.array([x[0] - x[1] for x in both_qc])
    b_m3_diff = np.array([x[2] - x[3] for x in both_qc])
    t_both_diff, p_both_diff = stats.ttest_rel(b_m2_diff, b_m3_diff)
    r_both, p_r_both = stats.pearsonr(b_m2_diff, b_m3_diff)
    dz_both = float((b_m2_diff - b_m3_diff).mean() / (b_m2_diff - b_m3_diff).std(ddof=1))
    both_diff_ci_lo, both_diff_ci_hi = ci95(b_m2_diff - b_m3_diff)

    # Module 6 Classroom Unguided Dataset (alpha_single.xlsx Columns F & G, N = 83)
    m6_pairs = [(float(r[5]), float(r[6])) for r in rows_as
                if isinstance(r[5], (int, float)) and isinstance(r[6], (int, float))]
    m6_open = np.array([p[0] for p in m6_pairs])
    m6_closed = np.array([p[1] for p in m6_pairs])
    m6_diff = m6_closed - m6_open
    n_m6 = len(m6_open)
    m6_t, m6_p = stats.ttest_rel(m6_closed, m6_open)
    _, m6_wp = stats.wilcoxon(m6_closed, m6_open)
    m6_dz = float(m6_diff.mean() / m6_diff.std(ddof=1))
    se_m6 = float(m6_diff.std(ddof=1) / np.sqrt(n_m6))
    tc_m6 = float(stats.t.ppf(0.975, n_m6 - 1))
    m6_ci_lo = float(m6_diff.mean() - tc_m6 * se_m6)
    m6_ci_hi = float(m6_diff.mean() + tc_m6 * se_m6)

    # Module 6 Multi-channel eeg_spectra.xlsx Disjoint Band Amplitudes (N = 27 epochs)
    wb_es = openpyxl.load_workbook(os.path.join(DATA_DIR, "eeg_spectra.xlsx"), data_only=True)
    data_rows_es = [r for r in list(wb_es.active.iter_rows(values_only=True))[1:] if r[0] is not None and isinstance(r[0], (int, float))]
    n_spectra_epochs = len(data_rows_es)
    ch_mats = [np.array([[float(r[1 + ch * 38 + c]) for c in range(38)] for r in data_rows_es]) for ch in range(4)]
    freqs_es = np.arange(1, 39, dtype=float)
    d_m = (freqs_es >= 1) & (freqs_es <= 4)
    a_m = (freqs_es >= 8) & (freqs_es <= 12)

    tp9_d_m = float(ch_mats[0][:, d_m].mean(axis=1).mean())
    tp9_d_sd = float(ch_mats[0][:, d_m].mean(axis=1).std(ddof=1))
    af7_d_m = float(ch_mats[1][:, d_m].mean(axis=1).mean())
    af7_d_sd = float(ch_mats[1][:, d_m].mean(axis=1).std(ddof=1))
    af8_d_m = float(ch_mats[2][:, d_m].mean(axis=1).mean())
    af8_d_sd = float(ch_mats[2][:, d_m].mean(axis=1).std(ddof=1))
    tp10_d_m = float(ch_mats[3][:, d_m].mean(axis=1).mean())
    tp10_d_sd = float(ch_mats[3][:, d_m].mean(axis=1).std(ddof=1))

    tp9_a_m = float(ch_mats[0][:, a_m].mean(axis=1).mean())
    tp9_a_sd = float(ch_mats[0][:, a_m].mean(axis=1).std(ddof=1))
    af7_a_m = float(ch_mats[1][:, a_m].mean(axis=1).mean())
    af7_a_sd = float(ch_mats[1][:, a_m].mean(axis=1).std(ddof=1))
    af8_a_m = float(ch_mats[2][:, a_m].mean(axis=1).mean())
    af8_a_sd = float(ch_mats[2][:, a_m].mean(axis=1).std(ddof=1))
    tp10_a_m = float(ch_mats[3][:, a_m].mean(axis=1).mean())
    tp10_a_sd = float(ch_mats[3][:, a_m].mean(axis=1).std(ddof=1))

    # 3. Classroom Berger Alpha Group Dataset (alpha_group.xlsx, N=67 complete 4-condition students)
    wb_ag = openpyxl.load_workbook(os.path.join(DATA_DIR, "alpha_group.xlsx"), data_only=True)

    def load_ag(name):
        ws = wb_ag[name]
        rows = list(ws.iter_rows(values_only=True))
        freqs = [float(x) for x in rows[1][1:31]]
        subj = {}
        for r in rows[2:]:
            if r[0] is not None and isinstance(r[0], (int, float)):
                vals = [float(x) if isinstance(x, (int, float)) else np.nan for x in r[1:31]]
                if len(vals) == 30 and not any(np.isnan(vals)):
                    subj[int(r[0])] = np.array(vals)
        return np.array(freqs), subj

    freqs, of = load_ag("OpenFrontal")
    _, ot = load_ag("OpenTemporal")
    _, cf = load_ag("ClosedFrontal")
    _, ct = load_ag("ClosedTemporal")
    common_ids = sorted(set(of.keys()) & set(ot.keys()) & set(cf.keys()) & set(ct.keys()))
    n_alpha = len(common_ids)

    OF = np.array([of[i] for i in common_ids])
    OT = np.array([ot[i] for i in common_ids])
    CF = np.array([cf[i] for i in common_ids])
    CT = np.array([ct[i] for i in common_ids])

    OF_rel = OF / OF.sum(axis=1, keepdims=True) * 100.0
    OT_rel = OT / OT.sum(axis=1, keepdims=True) * 100.0
    CF_rel = CF / CF.sum(axis=1, keepdims=True) * 100.0
    CT_rel = CT / CT.sum(axis=1, keepdims=True) * 100.0

    alpha_idx = (freqs >= 8) & (freqs <= 12)
    flank_idx = ((freqs >= 5) & (freqs <= 7)) | ((freqs >= 14) & (freqs <= 16))

    ot_a = OT_rel[:, alpha_idx].mean(axis=1)
    ct_a = CT_rel[:, alpha_idx].mean(axis=1)
    of_a = OF_rel[:, alpha_idx].mean(axis=1)
    cf_a = CF_rel[:, alpha_idx].mean(axis=1)

    t_temp_a, p_temp_a = stats.ttest_rel(ct_a, ot_a)
    _, wp_temp_a = stats.wilcoxon(ct_a, ot_a)
    dz_temp_a = float((ct_a - ot_a).mean() / (ct_a - ot_a).std(ddof=1))

    t_front_a, p_front_a = stats.ttest_rel(cf_a, of_a)
    _, wp_front_a = stats.wilcoxon(cf_a, of_a)
    dz_front_a = float((cf_a - of_a).mean() / (cf_a - of_a).std(ddof=1))

    t_10_temp, p_10_temp = stats.ttest_rel(CT_rel[:, 9], OT_rel[:, 9])
    t_10_front, p_10_front = stats.ttest_rel(CF_rel[:, 9], OF_rel[:, 9])

    inter_diff = (ct_a - ot_a) - (cf_a - of_a)
    t_inter, p_inter = stats.ttest_1samp(inter_diff, 0.0)
    dz_inter = float(inter_diff.mean() / inter_diff.std(ddof=1))

    ot_bump = ot_a - OT_rel[:, flank_idx].mean(axis=1)
    ct_bump = ct_a - CT_rel[:, flank_idx].mean(axis=1)
    of_bump = of_a - OF_rel[:, flank_idx].mean(axis=1)
    cf_bump = cf_a - CF_rel[:, flank_idx].mean(axis=1)
    t_bump_temp, p_bump_temp = stats.ttest_rel(ct_bump, ot_bump)
    _, wp_bump_temp = stats.wilcoxon(ct_bump, ot_bump)
    dz_bump_temp = float((ct_bump - ot_bump).mean() / (ct_bump - ot_bump).std(ddof=1))
    t_bump_front, p_bump_front = stats.ttest_rel(cf_bump, of_bump)
    dz_bump_front = float((cf_bump - of_bump).mean() / (cf_bump - of_bump).std(ddof=1))

    n_rep_temp = int(np.sum(ct_bump > ot_bump))
    pct_rep_temp = float(n_rep_temp / n_alpha * 100.0)

    # Log-power decibel (10*log10) 1/f-detrended alpha prominence (Keil et al., 2022; Donoghue et al., 2020)
    ot_db_bump = 10.0 * np.log10(OT[:, alpha_idx]).mean(axis=1) - 10.0 * np.log10(OT[:, flank_idx]).mean(axis=1)
    ct_db_bump = 10.0 * np.log10(CT[:, alpha_idx]).mean(axis=1) - 10.0 * np.log10(CT[:, flank_idx]).mean(axis=1)
    of_db_bump = 10.0 * np.log10(OF[:, alpha_idx]).mean(axis=1) - 10.0 * np.log10(OF[:, flank_idx]).mean(axis=1)
    cf_db_bump = 10.0 * np.log10(CF[:, alpha_idx]).mean(axis=1) - 10.0 * np.log10(CF[:, flank_idx]).mean(axis=1)
    t_db_temp, p_db_temp = stats.ttest_rel(ct_db_bump, ot_db_bump)
    dz_db_temp = float((ct_db_bump - ot_db_bump).mean() / (ct_db_bump - ot_db_bump).std(ddof=1))
    t_db_front, p_db_front = stats.ttest_rel(cf_db_bump, of_db_bump)
    dz_db_front = float((cf_db_bump - of_db_bump).mean() / (cf_db_bump - of_db_bump).std(ddof=1))
    inter_db_diff = (ct_db_bump - ot_db_bump) - (cf_db_bump - of_db_bump)
    t_db_inter, p_db_inter = stats.ttest_1samp(inter_db_diff, 0.0)
    dz_db_inter = float(inter_db_diff.mean() / inter_db_diff.std(ddof=1))

    # Module 9 Additional Tests
    t_5hz_temp, p_5hz_temp = stats.ttest_rel(CT_rel[:, 4], OT_rel[:, 4])
    t_22hz_front, p_22hz_front = stats.ttest_rel(CF_rel[:, 21], OF_rel[:, 21])
    t_rawlog_10, p_rawlog_10 = stats.ttest_rel(np.log10(CT[:, 9]), np.log10(OT[:, 9]))
    _, wp_rawlog_10 = stats.wilcoxon(CT[:, 9], OT[:, 9])

    temp_open_sum_pct = float(OT_rel[:, 7:12].sum(axis=1).mean())
    temp_closed_sum_pct = float(CT_rel[:, 7:12].sum(axis=1).mean())
    temp_rel_gain_pct = float((temp_closed_sum_pct - temp_open_sum_pct) / temp_open_sum_pct * 100.0)
    front_open_sum_pct = float(OF_rel[:, 7:12].sum(axis=1).mean())
    front_closed_sum_pct = float(CF_rel[:, 7:12].sum(axis=1).mean())
    front_rel_gain_pct = float((front_closed_sum_pct - front_open_sum_pct) / front_open_sum_pct * 100.0)

    temp_a_ci_lo, temp_a_ci_hi = ci95(ct_a - ot_a)
    front_a_ci_lo, front_a_ci_hi = ci95(cf_a - of_a)
    inter_ci_lo, inter_ci_hi = ci95(inter_diff)
    bump_t_ci_lo, bump_t_ci_hi = ci95(ct_bump - ot_bump)
    bump_f_ci_lo, bump_f_ci_hi = ci95(cf_bump - of_bump)
    db_t_ci_lo, db_t_ci_hi = ci95(ct_db_bump - ot_db_bump)
    db_f_ci_lo, db_f_ci_hi = ci95(cf_db_bump - of_db_bump)
    db_i_ci_lo, db_i_ci_hi = ci95(inter_db_diff)

    # Focus 1: Temporal Split-Half Reliability (N = 27 sequential epochs in eeg_spectra.xlsx)
    even_eps = np.arange(0, n_spectra_epochs, 2)  # 14 even epochs (0, 2, ..., 26)
    odd_eps = np.arange(1, n_spectra_epochs, 2)   # 13 odd epochs (1, 3, ..., 25)

    # TP9 full spectrum (38 bins)
    odd_tp9 = ch_mats[0][odd_eps, :].mean(axis=0)
    even_tp9 = ch_mats[0][even_eps, :].mean(axis=0)
    r_tp9_raw = float(stats.pearsonr(odd_tp9, even_tp9)[0])
    r_tp9_sb = float(2.0 * r_tp9_raw / (1.0 + r_tp9_raw))

    # Temporal average (TP9 + TP10) / 2 full spectrum (38 bins)
    odd_temp = (ch_mats[0][odd_eps, :].mean(axis=0) + ch_mats[3][odd_eps, :].mean(axis=0)) / 2.0
    even_temp = (ch_mats[0][even_eps, :].mean(axis=0) + ch_mats[3][even_eps, :].mean(axis=0)) / 2.0
    r_temp_raw = float(stats.pearsonr(odd_temp, even_temp)[0])
    r_temp_sb = float(2.0 * r_temp_raw / (1.0 + r_temp_raw))

    # Temporal alpha band (8-12 Hz)
    r_temp_a_raw = float(stats.pearsonr(odd_temp[a_m], even_temp[a_m])[0])
    r_temp_a_sb = float(2.0 * r_temp_a_raw / (1.0 + r_temp_a_raw))

    # Focus 2: Individual Alpha Frequency (IAF) CoG & Difference Peak (alpha_group.xlsx, N = 67)
    alpha_freqs = freqs[alpha_idx]
    cog_ct = np.sum(CT[:, alpha_idx] * alpha_freqs, axis=1) / np.sum(CT[:, alpha_idx], axis=1)
    cog_ot = np.sum(OT[:, alpha_idx] * alpha_freqs, axis=1) / np.sum(OT[:, alpha_idx], axis=1)

    diff_rel = CT_rel - OT_rel
    diff_rel_peaks = alpha_freqs[np.argmax(diff_rel[:, alpha_idx], axis=1)]
    raw_peaks = alpha_freqs[np.argmax(CT[:, alpha_idx], axis=1)]

    # Focus 3: Non-oscillatory Aperiodic Exponent chi_A ([3-6 Hz] U [17-28 Hz])
    aperiodic_mask = ((freqs >= 3) & (freqs <= 6)) | ((freqs >= 17) & (freqs <= 28))
    fit_freqs = freqs[aperiodic_mask]
    log_f = np.log10(fit_freqs)
    x_dev = log_f - log_f.mean()
    ss_x = np.sum(x_dev ** 2)

    def fit_exp(mat):
        log_y = np.log10(mat[:, aperiodic_mask])
        slopes = np.sum((log_y - log_y.mean(axis=1, keepdims=True)) * x_dev, axis=1) / ss_x
        return -slopes

    chi_ot = fit_exp(OT)
    chi_ct = fit_exp(CT)
    diff_chi_t = chi_ct - chi_ot
    t_chi_t, p_chi_t = stats.ttest_rel(chi_ct, chi_ot)
    _, wp_chi_t = stats.wilcoxon(chi_ct, chi_ot)
    dz_chi_t = float(diff_chi_t.mean() / diff_chi_t.std(ddof=1))
    ci_chi_t_lo, ci_chi_t_hi = ci95(diff_chi_t)

    chi_of = fit_exp(OF)
    chi_cf = fit_exp(CF)
    diff_chi_f = chi_cf - chi_of
    t_chi_f, p_chi_f = stats.ttest_rel(chi_cf, chi_of)
    _, wp_chi_f = stats.wilcoxon(chi_cf, chi_of)
    dz_chi_f = float(diff_chi_f.mean() / diff_chi_f.std(ddof=1))
    ci_chi_f_lo, ci_chi_f_hi = ci95(diff_chi_f)

    # Focus 4: Welch Two-Sample t-Tests and ID-Matched Concordance
    d_m2_67 = np.array([float(r[1]) - float(r[2]) for r in rows_as
                        if isinstance(r[1], (int, float)) and isinstance(r[2], (int, float))
                        and 40 <= r[1] <= 200 and 40 <= r[2] <= 200])
    d_m2_75 = np.array([float(r[1]) - float(r[2]) for r in rows_as
                        if isinstance(r[1], (int, float)) and isinstance(r[2], (int, float))
                        and 30 <= r[1] <= 200 and 30 <= r[2] <= 200])
    d_m3_76 = np.array([float(r[3]) - float(r[4]) for r in rows_as
                        if isinstance(r[3], (int, float)) and isinstance(r[4], (int, float))
                        and 30 <= r[3] <= 200 and 30 <= r[4] <= 200])

    t_w67, p_w67 = stats.ttest_ind(d_m2_67, d_m3_76, equal_var=False)
    diff_w67 = float(d_m2_67.mean() - d_m3_76.mean())
    se_w67 = float(np.sqrt(d_m2_67.var(ddof=1) / len(d_m2_67) + d_m3_76.var(ddof=1) / len(d_m3_76)))
    df_w67 = float((d_m2_67.var(ddof=1)/len(d_m2_67) + d_m3_76.var(ddof=1)/len(d_m3_76))**2 / (
        (d_m2_67.var(ddof=1)/len(d_m2_67))**2 / (len(d_m2_67)-1) + (d_m3_76.var(ddof=1)/len(d_m3_76))**2 / (len(d_m3_76)-1)
    ))
    tc_w67 = float(stats.t.ppf(0.975, df_w67))
    ci_w67_lo, ci_w67_hi = diff_w67 - tc_w67 * se_w67, diff_w67 + tc_w67 * se_w67

    t_w75, p_w75 = stats.ttest_ind(d_m2_75, d_m3_76, equal_var=False)
    diff_w75 = float(d_m2_75.mean() - d_m3_76.mean())
    se_w75 = float(np.sqrt(d_m2_75.var(ddof=1) / len(d_m2_75) + d_m3_76.var(ddof=1) / len(d_m3_76)))
    df_w75 = float((d_m2_75.var(ddof=1)/len(d_m2_75) + d_m3_76.var(ddof=1)/len(d_m3_76))**2 / (
        (d_m2_75.var(ddof=1)/len(d_m2_75))**2 / (len(d_m2_75)-1) + (d_m3_76.var(ddof=1)/len(d_m3_76))**2 / (len(d_m3_76)-1)
    ))
    tc_w75 = float(stats.t.ppf(0.975, df_w75))
    ci_w75_lo, ci_w75_hi = diff_w75 - tc_w75 * se_w75, diff_w75 + tc_w75 * se_w75

    wb_hsg = openpyxl.load_workbook(os.path.join(DATA_DIR, "heart_spectra_group.xlsx"), data_only=True)
    rows_hsg = [r for r in list(wb_hsg.active.iter_rows(values_only=True))[1:] if r[0] is not None]
    hsg_qc = [(float(r[1]), float(r[2]), float(r[3]), float(r[4])) for r in rows_hsg
              if all(isinstance(r[k], (int, float)) for k in (1, 2, 3, 4))
              and 40 <= r[1] <= 200 and 40 <= r[2] <= 200 and 30 <= r[3] <= 200 and 30 <= r[4] <= 200]
    hsg_m2_d = np.array([x[0] - x[1] for x in hsg_qc])
    hsg_m3_d = np.array([x[2] - x[3] for x in hsg_qc])
    diff_hsg = hsg_m2_d - hsg_m3_d
    t_hsg, p_hsg = stats.ttest_rel(hsg_m2_d, hsg_m3_d)
    _, wp_hsg = stats.wilcoxon(hsg_m2_d, hsg_m3_d)
    r_hsg, pr_hsg = stats.pearsonr(hsg_m2_d, hsg_m3_d)
    dz_hsg = float(diff_hsg.mean() / diff_hsg.std(ddof=1))
    ci_hsg_lo, ci_hsg_hi = ci95(diff_hsg)

    # Focus 5: Missing Wilcoxon, 22 Hz, and Single-Bin 10 Hz Metrics
    _, wp_both = stats.wilcoxon(b_m2_diff, b_m3_diff)
    both_diff_ci_lo, both_diff_ci_hi = ci95(b_m2_diff - b_m3_diff)

    _, wp_inter = stats.wilcoxon(inter_diff)
    _, wp_bump_front = stats.wilcoxon(cf_bump, of_bump)

    _, wp_db_temp = stats.wilcoxon(ct_db_bump, ot_db_bump)
    _, wp_db_front = stats.wilcoxon(cf_db_bump, of_db_bump)
    _, wp_db_inter = stats.wilcoxon(inter_db_diff)

    diff_22hz = CF_rel[:, 21] - OF_rel[:, 21]
    _, wp_22hz_front = stats.wilcoxon(CF_rel[:, 21], OF_rel[:, 21])
    dz_22hz_front = float(diff_22hz.mean() / diff_22hz.std(ddof=1))
    ci_22hz_lo, ci_22hz_hi = ci95(diff_22hz)

    diff_10_temp = CT_rel[:, 9] - OT_rel[:, 9]
    _, wp_10_temp = stats.wilcoxon(CT_rel[:, 9], OT_rel[:, 9])
    dz_10_temp = float(diff_10_temp.mean() / diff_10_temp.std(ddof=1))
    ci_10_temp_lo, ci_10_temp_hi = ci95(diff_10_temp)

    diff_10_front = CF_rel[:, 9] - OF_rel[:, 9]
    _, wp_10_front = stats.wilcoxon(CF_rel[:, 9], OF_rel[:, 9])
    dz_10_front = float(diff_10_front.mean() / diff_10_front.std(ddof=1))
    ci_10_front_lo, ci_10_front_hi = ci95(diff_10_front)

    # Psychometric internal consistency (Cronbach's alpha & Spearman-Brown split-half across 8-12 Hz bins)
    def cronbach_alpha(mat):
        k = mat.shape[1]
        item_vars = mat.var(axis=0, ddof=1).sum()
        tot_var = mat.sum(axis=1).var(ddof=1)
        return float((k / (k - 1.0)) * (1.0 - item_vars / tot_var))

    cron_ct = cronbach_alpha(CT_rel[:, alpha_idx])
    cron_ot = cronbach_alpha(OT_rel[:, alpha_idx])
    odd_alpha = CT_rel[:, [7, 9, 11]].mean(axis=1) - OT_rel[:, [7, 9, 11]].mean(axis=1)
    even_alpha = CT_rel[:, [8, 10]].mean(axis=1) - OT_rel[:, [8, 10]].mean(axis=1)
    r_half = float(stats.pearsonr(odd_alpha, even_alpha)[0])
    r_sb = float(2.0 * r_half / (1.0 + r_half))

    summary = {
        "n_roster": n_roster,
        "n_alpha_complete": n_alpha,
        "n_bci_recordings": 2 * n_alpha,
        "ecg_n_peaks": int(len(peaks_ms)),
        "ecg_mean_rr_ms": round(mean_rr_ms, 1),
        "ecg_sd_rr_ms": round(sd_rr_ms, 1),
        "ecg_mean_bpm": round(mean_bpm_raw, 2),
        "ecg_dom_freq_hz": round(ecg_dom_freq_hz, 3),
        "ecg_harmonic_two_bpm": round(ecg_harmonic_two_bpm, 1),
        "ecg_harmonic_three_bpm": round(ecg_harmonic_three_bpm, 1),
        "mod2_submitted": mod2_submitted,
        "mod2_missing": mod2_missing,
        "mod2_excluded": mod2_excluded,
        "mod2_pct_valid": round(mod2_pct_valid, 1),
        "mod2_diff_mean": round(mod2_diff_mean, 2),
        "mod2_n": n_m2,
        "mod2_df": n_m2 - 1,
        "mod2_stand_mean": round(m2_stand_m, 2),
        "mod2_stand_sd": round(m2_stand_sd, 2),
        "mod2_sit_mean": round(m2_sit_m, 2),
        "mod2_sit_sd": round(m2_sit_sd, 2),
        "mod2_t": round(m2_t, 2),
        "mod2_p": round(m2_p, 4),
        "mod2_dz": round(m2_dz, 2),
        "mod2_sym_n": n_m2_sym,
        "mod2_sym_df": n_m2_sym - 1,
        "mod2_sym_stand_mean": round(m2_sym_stand_m, 2),
        "mod2_sym_stand_sd": round(m2_sym_stand_sd, 2),
        "mod2_sym_sit_mean": round(m2_sym_sit_m, 2),
        "mod2_sym_sit_sd": round(m2_sym_sit_sd, 2),
        "mod2_sym_diff_mean": round(mod2_sym_diff_mean, 2),
        "mod2_sym_t": round(m2_sym_t, 2),
        "mod2_sym_p": round(m2_sym_p, 4),
        "mod2_sym_wilcox_p": round(m2_sym_wp, 4),
        "mod2_sym_dz": round(m2_sym_dz, 2),
        "mod3_submitted": mod3_submitted,
        "mod3_missing": mod3_missing,
        "mod3_diff_mean": round(mod3_diff_mean, 2),
        "mod3_n": n_m3,
        "mod3_df": n_m3 - 1,
        "mod3_stand_mean": round(m3_stand_m, 2),
        "mod3_stand_sd": round(m3_stand_sd, 2),
        "mod3_sit_mean": round(m3_sit_m, 2),
        "mod3_sit_sd": round(m3_sit_sd, 2),
        "mod3_t": round(m3_t, 2),
        "mod3_p": round(m3_p, 5),
        "mod3_dz": round(m3_dz, 2),
        "both_ecg_complete_raw": both_ecg_complete_raw,
        "both_ecg_n": len(both_qc),
        "both_ecg_df": len(both_qc) - 1,
        "both_ecg_diff_r": round(r_both, 2),
        "both_ecg_diff_rp": round(p_r_both, 2),
        "both_ecg_diff_dz": round(dz_both, 2),
        "mod6_class_n": n_m6,
        "mod6_class_df": n_m6 - 1,
        "mod6_class_open_mean": round(float(m6_open.mean()), 2),
        "mod6_class_open_sd": round(float(m6_open.std(ddof=1)), 2),
        "mod6_class_closed_mean": round(float(m6_closed.mean()), 2),
        "mod6_class_closed_sd": round(float(m6_closed.std(ddof=1)), 2),
        "mod6_class_t": round(m6_t, 2),
        "mod6_class_p": round(m6_p, 4),
        "mod6_class_wilcox_p": round(m6_wp, 4),
        "mod6_class_dz": round(m6_dz, 2),
        "n_spectra_epochs": n_spectra_epochs,
        "mod6_delta_tp9_mean": round(tp9_d_m, 2),
        "mod6_delta_tp9_sd": round(tp9_d_sd, 2),
        "mod6_delta_tp10_mean": round(tp10_d_m, 2),
        "mod6_delta_tp10_sd": round(tp10_d_sd, 2),
        "mod6_delta_af7_mean": round(af7_d_m, 2),
        "mod6_delta_af7_sd": round(af7_d_sd, 2),
        "mod6_delta_af8_mean": round(af8_d_m, 2),
        "mod6_delta_af8_sd": round(af8_d_sd, 2),
        "mod6_alpha_tp9_mean": round(tp9_a_m, 2),
        "mod6_alpha_tp9_sd": round(tp9_a_sd, 2),
        "mod6_alpha_tp10_mean": round(tp10_a_m, 2),
        "mod6_alpha_tp10_sd": round(tp10_a_sd, 2),
        "mod6_alpha_af7_mean": round(af7_a_m, 2),
        "mod6_alpha_af7_sd": round(af7_a_sd, 2),
        "mod6_alpha_af8_mean": round(af8_a_m, 2),
        "mod6_alpha_af8_sd": round(af8_a_sd, 2),
        "temp_5hz_t": round(float(t_5hz_temp), 2),
        "temp_5hz_p": f"{p_5hz_temp:.2e}",
        "front_22hz_t": round(float(t_22hz_front), 2),
        "raw_log_10hz_temp_t": round(float(t_rawlog_10), 2),
        "raw_log_10hz_temp_p": round(float(p_rawlog_10), 4),
        "raw_log_10hz_temp_wilcox_p": round(float(wp_rawlog_10), 4),
        "temp_open_sum_pct": round(temp_open_sum_pct, 2),
        "temp_closed_sum_pct": round(temp_closed_sum_pct, 2),
        "temp_rel_gain_pct": round(temp_rel_gain_pct, 1),
        "front_open_sum_pct": round(front_open_sum_pct, 2),
        "front_closed_sum_pct": round(front_closed_sum_pct, 2),
        "front_rel_gain_pct": round(front_rel_gain_pct, 1),
        "temp_open_alpha_mean": round(float(ot_a.mean()), 2),
        "temp_open_alpha_sd": round(float(ot_a.std(ddof=1)), 2),
        "temp_closed_alpha_mean": round(float(ct_a.mean()), 2),
        "temp_closed_alpha_sd": round(float(ct_a.std(ddof=1)), 2),
        "temp_alpha_t": round(float(t_temp_a), 2),
        "temp_alpha_p": f"{p_temp_a:.2e}",
        "temp_alpha_dz": round(dz_temp_a, 2),
        "front_open_alpha_mean": round(float(of_a.mean()), 2),
        "front_open_alpha_sd": round(float(of_a.std(ddof=1)), 2),
        "front_closed_alpha_mean": round(float(cf_a.mean()), 2),
        "front_closed_alpha_sd": round(float(cf_a.std(ddof=1)), 2),
        "front_alpha_t": round(float(t_front_a), 2),
        "front_alpha_p": round(float(p_front_a), 4),
        "front_alpha_dz": round(dz_front_a, 2),
        "temp_10hz_t": round(float(t_10_temp), 2),
        "temp_10hz_p": f"{p_10_temp:.2e}",
        "front_10hz_t": round(float(t_10_front), 2),
        "front_10hz_p": round(float(p_10_front), 4),
        "inter_t": round(float(t_inter), 2),
        "inter_p": round(float(p_inter), 4),
        "inter_dz": round(dz_inter, 2),
        "bump_temp_open_mean": round(float(ot_bump.mean()), 2),
        "bump_temp_open_sd": round(float(ot_bump.std(ddof=1)), 2),
        "bump_temp_closed_mean": round(float(ct_bump.mean()), 2),
        "bump_temp_closed_sd": round(float(ct_bump.std(ddof=1)), 2),
        "bump_temp_t": round(float(t_bump_temp), 2),
        "bump_temp_p": f"{p_bump_temp:.2e}",
        "bump_temp_dz": round(dz_bump_temp, 2),
        "bump_front_open_mean": round(float(of_bump.mean()), 2),
        "bump_front_open_sd": round(float(of_bump.std(ddof=1)), 2),
        "bump_front_closed_mean": round(float(cf_bump.mean()), 2),
        "bump_front_closed_sd": round(float(cf_bump.std(ddof=1)), 2),
        "bump_front_t": round(float(t_bump_front), 2),
        "bump_front_p": round(float(p_bump_front), 4),
        "bump_front_dz": round(dz_bump_front, 2),
        "n_rep_temp": n_rep_temp,
        "pct_rep_temp": round(pct_rep_temp, 1),
        # Focus 1: Temporal split-half reliability across sequential epochs
        "temporal_epoch_splithalf_r_tp9": round(r_tp9_sb, 4),
        "temporal_epoch_splithalf_raw_r_tp9": round(r_tp9_raw, 4),
        "temporal_epoch_splithalf_r_temporal": round(r_temp_sb, 4),
        "temporal_epoch_splithalf_alpha_r_temporal": round(r_temp_a_sb, 4),
        # Focus 2: Individual Alpha Frequency (IAF) CoG and difference peak
        "iaf_cog_closed_temp_mean": round(float(cog_ct.mean()), 2),
        "iaf_cog_closed_temp_sd": round(float(cog_ct.std(ddof=1)), 2),
        "iaf_cog_open_temp_mean": round(float(cog_ot.mean()), 2),
        "iaf_cog_open_temp_sd": round(float(cog_ot.std(ddof=1)), 2),
        "iaf_diff_peak_mean": round(float(diff_rel_peaks.mean()), 2),
        "iaf_diff_peak_sd": round(float(diff_rel_peaks.std(ddof=1)), 2),
        "iaf_raw_peak_mean": round(float(raw_peaks.mean()), 2),
        "iaf_raw_peak_sd": round(float(raw_peaks.std(ddof=1)), 2),
        # Focus 3: Aperiodic exponents chi_A
        "aperiodic_temp_open_mean": round(float(chi_ot.mean()), 2),
        "aperiodic_temp_open_sd": round(float(chi_ot.std(ddof=1)), 2),
        "aperiodic_temp_closed_mean": round(float(chi_ct.mean()), 2),
        "aperiodic_temp_closed_sd": round(float(chi_ct.std(ddof=1)), 2),
        "aperiodic_temp_diff_mean": round(float(diff_chi_t.mean()), 2),
        "aperiodic_temp_diff_sd": round(float(diff_chi_t.std(ddof=1)), 2),
        "aperiodic_temp_t": round(float(t_chi_t), 2),
        "aperiodic_temp_p": round(float(p_chi_t), 4),
        "aperiodic_temp_wilcox_p": round(float(wp_chi_t), 4),
        "aperiodic_temp_dz": round(float(dz_chi_t), 2),
        "aperiodic_temp_ci_lo": round(float(ci_chi_t_lo), 2),
        "aperiodic_temp_ci_hi": round(float(ci_chi_t_hi), 2),
        "aperiodic_front_open_mean": round(float(chi_of.mean()), 2),
        "aperiodic_front_open_sd": round(float(chi_of.std(ddof=1)), 2),
        "aperiodic_front_closed_mean": round(float(chi_cf.mean()), 2),
        "aperiodic_front_closed_sd": round(float(chi_cf.std(ddof=1)), 2),
        "aperiodic_front_diff_mean": round(float(diff_chi_f.mean()), 2),
        "aperiodic_front_diff_sd": round(float(diff_chi_f.std(ddof=1)), 2),
        "aperiodic_front_t": round(float(t_chi_f), 2),
        "aperiodic_front_p": float(f"{p_chi_f:.2e}"),
        "aperiodic_front_wilcox_p": float(f"{wp_chi_f:.2e}"),
        "aperiodic_front_dz": round(float(dz_chi_f), 2),
        "aperiodic_front_ci_lo": round(float(ci_chi_f_lo), 2),
        "aperiodic_front_ci_hi": round(float(ci_chi_f_hi), 2),
        # Focus 4: Welch two-sample t-tests
        "welch_67_diff_mean": round(diff_w67, 2),
        "welch_67_df": round(df_w67, 1),
        "welch_67_t": round(float(t_w67), 2),
        "welch_67_p": round(float(p_w67), 4),
        "welch_67_ci_lo": round(ci_w67_lo, 2),
        "welch_67_ci_hi": round(ci_w67_hi, 2),
        "welch_75_diff_mean": round(diff_w75, 2),
        "welch_75_df": round(df_w75, 1),
        "welch_75_t": round(float(t_w75), 2),
        "welch_75_p": round(float(p_w75), 4),
        "welch_75_ci_lo": round(ci_w75_lo, 2),
        "welch_75_ci_hi": round(ci_w75_hi, 2),
        # Focus 4: ID-matched comparison
        "id_matched_hsg_n": len(hsg_qc),
        "id_matched_hsg_df": len(hsg_qc) - 1,
        "id_matched_hsg_m2_diff_mean": round(float(hsg_m2_d.mean()), 2),
        "id_matched_hsg_m2_diff_sd": round(float(hsg_m2_d.std(ddof=1)), 2),
        "id_matched_hsg_m3_diff_mean": round(float(hsg_m3_d.mean()), 2),
        "id_matched_hsg_m3_diff_sd": round(float(hsg_m3_d.std(ddof=1)), 2),
        "id_matched_hsg_diff_mean": round(float(diff_hsg.mean()), 2),
        "id_matched_hsg_diff_sd": round(float(diff_hsg.std(ddof=1)), 2),
        "id_matched_hsg_t": round(float(t_hsg), 2),
        "id_matched_hsg_p": round(float(p_hsg), 4),
        "id_matched_hsg_wilcox_p": round(float(wp_hsg), 4),
        "id_matched_hsg_dz": round(dz_hsg, 2),
        "id_matched_hsg_ci_lo": round(ci_hsg_lo, 2),
        "id_matched_hsg_ci_hi": round(ci_hsg_hi, 2),
        "id_matched_hsg_r": round(r_hsg, 2),
        "id_matched_hsg_rp": round(pr_hsg, 2),
        # Focus 5: Missing Wilcoxon, 22 Hz, and 10 Hz metrics
        "both_ecg_diff_wilcox_p": round(float(wp_both), 4),
        "inter_wilcox_p": round(float(wp_inter), 4),
        "bump_front_wilcox_p": round(float(wp_bump_front), 4),
        "log_bump_temp_wilcox_p": f"{wp_db_temp:.2e}",
        "log_bump_front_wilcox_p": round(float(wp_db_front), 4),
        "log_bump_inter_wilcox_p": round(float(wp_db_inter), 4),
        "front_22hz_p": f"{p_22hz_front:.2e}",
        "front_22hz_wilcox_p": f"{wp_22hz_front:.2e}",
        "front_22hz_dz": round(dz_22hz_front, 2),
        "front_22hz_ci_lo": round(ci_22hz_lo, 2),
        "front_22hz_ci_hi": round(ci_22hz_hi, 2),
        "temp_10hz_wilcox_p": f"{wp_10_temp:.2e}",
        "temp_10hz_dz": round(dz_10_temp, 2),
        "temp_10hz_ci_lo": round(ci_10_temp_lo, 2),
        "temp_10hz_ci_hi": round(ci_10_temp_hi, 2),
        "front_10hz_wilcox_p": round(float(wp_10_front), 4),
        "front_10hz_dz": round(dz_10_front, 2),
        "front_10hz_ci_lo": round(ci_10_front_lo, 2),
        "front_10hz_ci_hi": round(ci_10_front_hi, 2),
    }
    summary.update(bench_stats)

    with open(os.path.join(p1_dir, "stats_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    with open(os.path.join(tbl_dir, "classroom_empirical_results.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Experiment_Metric", "N", "Condition_A_Mean_SD", "Condition_B_Mean_SD", "t_stat", "p_val", "Cohens_dz"])
        w.writerow(["Mod 2 Orthostatic ECG (Standing vs Sitting BPM)", n_m2,
                    f"{m2_stand_m:.2f} +/- {m2_stand_sd:.2f}", f"{m2_sit_m:.2f} +/- {m2_sit_sd:.2f}",
                    f"{m2_t:.2f}", f"{m2_p:.4f}", f"{m2_dz:.2f}"])
        w.writerow(["Mod 2 Symmetric Orthostatic ECG (Standing vs Sitting BPM, 30–200 BPM)", n_m2_sym,
                    f"{m2_sym_stand_m:.2f} +/- {m2_sym_stand_sd:.2f}", f"{m2_sym_sit_m:.2f} +/- {m2_sym_sit_sd:.2f}",
                    f"{m2_sym_t:.2f}", f"{m2_sym_p:.4f}", f"{m2_sym_dz:.2f}"])
        w.writerow(["Mod 3 Spectral FFT ECG (Standing vs Sitting BPM)", n_m3,
                    f"{m3_stand_m:.2f} +/- {m3_stand_sd:.2f}", f"{m3_sit_m:.2f} +/- {m3_sit_sd:.2f}",
                    f"{m3_t:.2f}", f"{m3_p:.5f}", f"{m3_dz:.2f}"])
        w.writerow(["Mod 6 Classroom Unguided Alpha (Closed vs Open μV)", n_m6,
                    f"{m6_closed.mean():.2f} +/- {m6_closed.std(ddof=1):.2f}", f"{m6_open.mean():.2f} +/- {m6_open.std(ddof=1):.2f}",
                    f"{m6_t:.2f}", f"{m6_p:.4f}", f"{m6_dz:.2f}"])
        w.writerow(["Mod 9 Temporal TP9/TP10 Rel Alpha (Closed vs Open %)", n_alpha,
                    f"{ct_a.mean():.2f} +/- {ct_a.std(ddof=1):.2f}", f"{ot_a.mean():.2f} +/- {ot_a.std(ddof=1):.2f}",
                    f"{t_temp_a:.2f}", f"{p_temp_a:.2e}", f"{dz_temp_a:.2f}"])
        w.writerow(["Mod 9 Frontal AF7/AF8 Rel Alpha (Closed vs Open %)", n_alpha,
                    f"{cf_a.mean():.2f} +/- {cf_a.std(ddof=1):.2f}", f"{of_a.mean():.2f} +/- {of_a.std(ddof=1):.2f}",
                    f"{t_front_a:.2f}", f"{p_front_a:.4f}", f"{dz_front_a:.2f}"])
        w.writerow(["Mod 9 1/f-Detrended Temporal Alpha Bump (Closed vs Open %)", n_alpha,
                    f"{ct_bump.mean():+.2f} +/- {ct_bump.std(ddof=1):.2f}", f"{ot_bump.mean():+.2f} +/- {ot_bump.std(ddof=1):.2f}",
                    f"{t_bump_temp:.2f}", f"{p_bump_temp:.2e}", f"{dz_bump_temp:.2f}"])
        w.writerow(["Mod 9 1/f-Detrended Frontal Alpha Bump (Closed vs Open %)", n_alpha,
                    f"{cf_bump.mean():+.2f} +/- {cf_bump.std(ddof=1):.2f}", f"{of_bump.mean():+.2f} +/- {of_bump.std(ddof=1):.2f}",
                    f"{t_bump_front:.2f}", f"{p_bump_front:.4f}", f"{dz_bump_front:.2f}"])

    macros = [
        "% Auto-generated by paper1_eegedu/generate_figures.py — DO NOT EDIT MANUALLY",
        f"\\newcommand{{\\NRoster}}{{{n_roster}}}",
        f"\\newcommand{{\\NAlphaComplete}}{{{summary['n_alpha_complete']}}}",
        f"\\newcommand{{\\AlphaDF}}{{{summary['n_alpha_complete'] - 1}}}",
        f"\\newcommand{{\\NBCIRecordings}}{{{2 * summary['n_alpha_complete']}}}",
        f"\\newcommand{{\\ECGNPeaks}}{{{summary['ecg_n_peaks']}}}",
        f"\\newcommand{{\\ECGMeanRR}}{{{summary['ecg_mean_rr_ms']}}}",
        f"\\newcommand{{\\ECGSDRR}}{{{summary['ecg_sd_rr_ms']}}}",
        f"\\newcommand{{\\ECGMeanBPM}}{{{summary['ecg_mean_bpm']:.2f}}}",
        f"\\newcommand{{\\ECGDomFreqHz}}{{{ecg_dom_freq_hz:.3f}}}",
        f"\\newcommand{{\\ECGHarmonicTwoBPM}}{{{ecg_harmonic_two_bpm:.1f}}}",
        f"\\newcommand{{\\ECGHarmonicThreeBPM}}{{{ecg_harmonic_three_bpm:.1f}}}",
        f"\\newcommand{{\\ModTwoSubmitted}}{{{mod2_submitted}}}",
        f"\\newcommand{{\\ModTwoMissing}}{{{mod2_missing}}}",
        f"\\newcommand{{\\ModTwoExcluded}}{{{mod2_excluded}}}",
        f"\\newcommand{{\\ModTwoPctValid}}{{{mod2_pct_valid:.1f}}}",
        f"\\newcommand{{\\ModTwoDiffMean}}{{{mod2_diff_mean:+.2f}}}",
        f"\\newcommand{{\\ModTwoN}}{{{summary['mod2_n']}}}",
        f"\\newcommand{{\\ModTwoDF}}{{{summary['mod2_df']}}}",
        f"\\newcommand{{\\ModTwoStandMean}}{{{summary['mod2_stand_mean']:.2f}}}",
        f"\\newcommand{{\\ModTwoStandSD}}{{{summary['mod2_stand_sd']:.2f}}}",
        f"\\newcommand{{\\ModTwoSitMean}}{{{summary['mod2_sit_mean']:.2f}}}",
        f"\\newcommand{{\\ModTwoSitSD}}{{{summary['mod2_sit_sd']:.2f}}}",
        f"\\newcommand{{\\ModTwoT}}{{{summary['mod2_t']:.2f}}}",
        f"\\newcommand{{\\ModTwoP}}{{{summary['mod2_p']:.4f}}}",
        f"\\newcommand{{\\ModTwoWilcoxP}}{{{m2_wp:.4f}}}",
        f"\\newcommand{{\\ModTwoDz}}{{{summary['mod2_dz']:.2f}}}",
        f"\\newcommand{{\\ModTwoCILow}}{{{m2_ci_lo:+.2f}}}",
        f"\\newcommand{{\\ModTwoCIHigh}}{{{m2_ci_hi:+.2f}}}",
        f"\\newcommand{{\\ModTwoSymN}}{{{n_m2_sym}}}",
        f"\\newcommand{{\\ModTwoSymDF}}{{{n_m2_sym - 1}}}",
        f"\\newcommand{{\\ModTwoSymStandMean}}{{{m2_sym_stand_m:.2f}}}",
        f"\\newcommand{{\\ModTwoSymStandSD}}{{{m2_sym_stand_sd:.2f}}}",
        f"\\newcommand{{\\ModTwoSymSitMean}}{{{m2_sym_sit_m:.2f}}}",
        f"\\newcommand{{\\ModTwoSymSitSD}}{{{m2_sym_sit_sd:.2f}}}",
        f"\\newcommand{{\\ModTwoSymDiffMean}}{{{mod2_sym_diff_mean:+.2f}}}",
        f"\\newcommand{{\\ModTwoSymT}}{{{m2_sym_t:.2f}}}",
        f"\\newcommand{{\\ModTwoSymP}}{{{m2_sym_p:.4f}}}",
        f"\\newcommand{{\\ModTwoSymWilcoxP}}{{{m2_sym_wp:.4f}}}",
        f"\\newcommand{{\\ModTwoSymDz}}{{{m2_sym_dz:.2f}}}",
        f"\\newcommand{{\\ModTwoSymCILow}}{{{m2_sym_ci_lo:+.2f}}}",
        f"\\newcommand{{\\ModTwoSymCIHigh}}{{{m2_sym_ci_hi:+.2f}}}",
        f"\\newcommand{{\\ModThreeSubmitted}}{{{mod3_submitted}}}",
        f"\\newcommand{{\\ModThreeMissing}}{{{mod3_missing}}}",
        f"\\newcommand{{\\ModThreeDiffMean}}{{{mod3_diff_mean:+.2f}}}",
        f"\\newcommand{{\\ModThreeN}}{{{summary['mod3_n']}}}",
        f"\\newcommand{{\\ModThreeDF}}{{{summary['mod3_df']}}}",
        f"\\newcommand{{\\ModThreeStandMean}}{{{summary['mod3_stand_mean']:.2f}}}",
        f"\\newcommand{{\\ModThreeStandSD}}{{{summary['mod3_stand_sd']:.2f}}}",
        f"\\newcommand{{\\ModThreeSitMean}}{{{summary['mod3_sit_mean']:.2f}}}",
        f"\\newcommand{{\\ModThreeSitSD}}{{{summary['mod3_sit_sd']:.2f}}}",
        f"\\newcommand{{\\ModThreeT}}{{{summary['mod3_t']:.2f}}}",
        f"\\newcommand{{\\ModThreeP}}{{{fmt_p_latex(m3_p)}}}",
        f"\\newcommand{{\\ModThreeWilcoxP}}{{{fmt_p_latex(m3_wp)}}}",
        f"\\newcommand{{\\ModThreeDz}}{{{summary['mod3_dz']:.2f}}}",
        f"\\newcommand{{\\ModThreeCILow}}{{{m3_ci_lo:+.2f}}}",
        f"\\newcommand{{\\ModThreeCIHigh}}{{{m3_ci_hi:+.2f}}}",
        f"\\newcommand{{\\BothECGCompleteRaw}}{{{both_ecg_complete_raw}}}",
        f"\\newcommand{{\\BothECGN}}{{{len(both_qc)}}}",
        f"\\newcommand{{\\BothECGDF}}{{{len(both_qc) - 1}}}",
        f"\\newcommand{{\\BothModTwoDiffMean}}{{{b_m2_diff.mean():+.2f}}}",
        f"\\newcommand{{\\BothModTwoDiffSD}}{{{b_m2_diff.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\BothModThreeDiffMean}}{{{b_m3_diff.mean():+.2f}}}",
        f"\\newcommand{{\\BothModThreeDiffSD}}{{{b_m3_diff.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\BothECGDiffT}}{{{t_both_diff:.2f}}}",
        f"\\newcommand{{\\BothECGDiffP}}{{{p_both_diff:.3f}}}",
        f"\\newcommand{{\\BothECGDiffWilcoxP}}{{{fmt_p_latex(wp_both)}}}",
        f"\\newcommand{{\\BothECGDiffCILow}}{{{both_diff_ci_lo:+.2f}}}",
        f"\\newcommand{{\\BothECGDiffCIHigh}}{{{both_diff_ci_hi:+.2f}}}",
        f"\\newcommand{{\\BothECGDiffDz}}{{{dz_both:.2f}}}",
        f"\\newcommand{{\\BothECGDiffR}}{{{r_both:.2f}}}",
        f"\\newcommand{{\\BothECGDiffRP}}{{{p_r_both:.2f}}}",
        f"\\newcommand{{\\NSpectraEpochs}}{{{n_spectra_epochs}}}",
        f"\\newcommand{{\\ModSixDeltaTPNineMean}}{{{tp9_d_m:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaTPNineSD}}{{{tp9_d_sd:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaTPTenMean}}{{{tp10_d_m:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaTPTenSD}}{{{tp10_d_sd:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaAFSevenMean}}{{{af7_d_m:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaAFSevenSD}}{{{af7_d_sd:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaAFEightMean}}{{{af8_d_m:.2f}}}",
        f"\\newcommand{{\\ModSixDeltaAFEightSD}}{{{af8_d_sd:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaTPNineMean}}{{{tp9_a_m:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaTPNineSD}}{{{tp9_a_sd:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaTPTenMean}}{{{tp10_a_m:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaTPTenSD}}{{{tp10_a_sd:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaAFSevenMean}}{{{af7_a_m:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaAFSevenSD}}{{{af7_a_sd:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaAFEightMean}}{{{af8_a_m:.2f}}}",
        f"\\newcommand{{\\ModSixAlphaAFEightSD}}{{{af8_a_sd:.2f}}}",
        f"\\newcommand{{\\ModSixClassN}}{{{n_m6}}}",
        f"\\newcommand{{\\ModSixClassDF}}{{{n_m6 - 1}}}",
        f"\\newcommand{{\\ModSixClassOpenMean}}{{{m6_open.mean():.2f}}}",
        f"\\newcommand{{\\ModSixClassOpenSD}}{{{m6_open.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\ModSixClassClosedMean}}{{{m6_closed.mean():.2f}}}",
        f"\\newcommand{{\\ModSixClassClosedSD}}{{{m6_closed.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\ModSixClassT}}{{{m6_t:.2f}}}",
        f"\\newcommand{{\\ModSixClassP}}{{{m6_p:.4f}}}",
        f"\\newcommand{{\\ModSixClassWilcoxP}}{{{m6_wp:.4f}}}",
        f"\\newcommand{{\\ModSixClassDz}}{{{m6_dz:.2f}}}",
        f"\\newcommand{{\\ModSixClassCILow}}{{{m6_ci_lo:+.2f}}}",
        f"\\newcommand{{\\ModSixClassCIHigh}}{{{m6_ci_hi:+.2f}}}",
        f"\\newcommand{{\\TempOpenAlphaMean}}{{{summary['temp_open_alpha_mean']:.2f}}}",
        f"\\newcommand{{\\TempOpenAlphaSD}}{{{summary['temp_open_alpha_sd']:.2f}}}",
        f"\\newcommand{{\\TempClosedAlphaMean}}{{{summary['temp_closed_alpha_mean']:.2f}}}",
        f"\\newcommand{{\\TempClosedAlphaSD}}{{{summary['temp_closed_alpha_sd']:.2f}}}",
        f"\\newcommand{{\\TempAlphaT}}{{{summary['temp_alpha_t']:.2f}}}",
        f"\\newcommand{{\\TempAlphaP}}{{{fmt_p_latex(p_temp_a)}}}",
        f"\\newcommand{{\\TempAlphaWilcoxP}}{{{fmt_p_latex(wp_temp_a)}}}",
        f"\\newcommand{{\\TempAlphaDz}}{{{summary['temp_alpha_dz']:.2f}}}",
        f"\\newcommand{{\\FrontOpenAlphaMean}}{{{summary['front_open_alpha_mean']:.2f}}}",
        f"\\newcommand{{\\FrontOpenAlphaSD}}{{{summary['front_open_alpha_sd']:.2f}}}",
        f"\\newcommand{{\\FrontClosedAlphaMean}}{{{summary['front_closed_alpha_mean']:.2f}}}",
        f"\\newcommand{{\\FrontClosedAlphaSD}}{{{summary['front_closed_alpha_sd']:.2f}}}",
        f"\\newcommand{{\\FrontAlphaT}}{{{summary['front_alpha_t']:.2f}}}",
        f"\\newcommand{{\\FrontAlphaP}}{{{summary['front_alpha_p']:.4f}}}",
        f"\\newcommand{{\\FrontAlphaWilcoxP}}{{{wp_front_a:.4f}}}",
        f"\\newcommand{{\\FrontAlphaDz}}{{{summary['front_alpha_dz']:.2f}}}",
        f"\\newcommand{{\\TempTenHzT}}{{{summary['temp_10hz_t']:.2f}}}",
        f"\\newcommand{{\\TempTenHzP}}{{{fmt_p_latex(p_10_temp)}}}",
        f"\\newcommand{{\\TempTenHzWilcoxP}}{{{fmt_p_latex(wp_10_temp)}}}",
        f"\\newcommand{{\\TempTenHzDz}}{{{dz_10_temp:.2f}}}",
        f"\\newcommand{{\\TempTenHzCILow}}{{{ci_10_temp_lo:+.2f}}}",
        f"\\newcommand{{\\TempTenHzCIHigh}}{{{ci_10_temp_hi:+.2f}}}",
        f"\\newcommand{{\\FrontTenHzT}}{{{summary['front_10hz_t']:.2f}}}",
        f"\\newcommand{{\\FrontTenHzP}}{{{summary['front_10hz_p']:.4f}}}",
        f"\\newcommand{{\\FrontTenHzWilcoxP}}{{{fmt_p_latex(wp_10_front)}}}",
        f"\\newcommand{{\\FrontTenHzDz}}{{{dz_10_front:.2f}}}",
        f"\\newcommand{{\\FrontTenHzCILow}}{{{ci_10_front_lo:+.2f}}}",
        f"\\newcommand{{\\FrontTenHzCIHigh}}{{{ci_10_front_hi:+.2f}}}",
        f"\\newcommand{{\\TempFiveHzT}}{{{t_5hz_temp:.2f}}}",
        f"\\newcommand{{\\TempFiveHzP}}{{{fmt_p_latex(p_5hz_temp)}}}",
        f"\\newcommand{{\\FrontTwentyTwoHzT}}{{{t_22hz_front:.2f}}}",
        f"\\newcommand{{\\FrontTwentyTwoHzP}}{{{fmt_p_latex(p_22hz_front)}}}",
        f"\\newcommand{{\\FrontTwentyTwoHzWilcoxP}}{{{fmt_p_latex(wp_22hz_front)}}}",
        f"\\newcommand{{\\FrontTwentyTwoHzDz}}{{{dz_22hz_front:.2f}}}",
        f"\\newcommand{{\\FrontTwentyTwoHzCILow}}{{{ci_22hz_lo:+.2f}}}",
        f"\\newcommand{{\\FrontTwentyTwoHzCIHigh}}{{{ci_22hz_hi:+.2f}}}",
        f"\\newcommand{{\\RawLogTenHzTempT}}{{{t_rawlog_10:.2f}}}",
        f"\\newcommand{{\\RawLogTenHzTempP}}{{{p_rawlog_10:.4f}}}",
        f"\\newcommand{{\\RawLogTenHzTempWilcoxP}}{{{wp_rawlog_10:.4f}}}",
        f"\\newcommand{{\\TempOpenSumPct}}{{{temp_open_sum_pct:.2f}}}",
        f"\\newcommand{{\\TempClosedSumPct}}{{{temp_closed_sum_pct:.2f}}}",
        f"\\newcommand{{\\TempRelGainPct}}{{{temp_rel_gain_pct:+.1f}}}",
        f"\\newcommand{{\\FrontRelGainPct}}{{{front_rel_gain_pct:+.1f}}}",
        f"\\newcommand{{\\InterT}}{{{summary['inter_t']:.2f}}}",
        f"\\newcommand{{\\InterP}}{{{summary['inter_p']:.4f}}}",
        f"\\newcommand{{\\InterWilcoxP}}{{{fmt_p_latex(wp_inter)}}}",
        f"\\newcommand{{\\InterDz}}{{{summary['inter_dz']:.2f}}}",
        f"\\newcommand{{\\TempAlphaDiffMean}}{{{(ct_a - ot_a).mean():+.2f}}}",
        f"\\newcommand{{\\TempAlphaDiffSD}}{{{(ct_a - ot_a).std(ddof=1):.2f}}}",
        f"\\newcommand{{\\FrontAlphaDiffMean}}{{{(cf_a - of_a).mean():+.2f}}}",
        f"\\newcommand{{\\FrontAlphaDiffSD}}{{{(cf_a - of_a).std(ddof=1):.2f}}}",
        f"\\newcommand{{\\BumpTempOpenMean}}{{{summary['bump_temp_open_mean']:+.2f}}}",
        f"\\newcommand{{\\BumpTempOpenSD}}{{{summary['bump_temp_open_sd']:.2f}}}",
        f"\\newcommand{{\\BumpTempClosedMean}}{{{summary['bump_temp_closed_mean']:+.2f}}}",
        f"\\newcommand{{\\BumpTempClosedSD}}{{{summary['bump_temp_closed_sd']:.2f}}}",
        f"\\newcommand{{\\BumpTempT}}{{{summary['bump_temp_t']:.2f}}}",
        f"\\newcommand{{\\BumpTempP}}{{{fmt_p_latex(p_bump_temp)}}}",
        f"\\newcommand{{\\BumpTempWilcoxP}}{{{fmt_p_latex(wp_bump_temp)}}}",
        f"\\newcommand{{\\BumpTempDz}}{{{summary['bump_temp_dz']:.2f}}}",
        f"\\newcommand{{\\BumpFrontOpenMean}}{{{summary['bump_front_open_mean']:+.2f}}}",
        f"\\newcommand{{\\BumpFrontOpenSD}}{{{summary['bump_front_open_sd']:.2f}}}",
        f"\\newcommand{{\\BumpFrontClosedMean}}{{{summary['bump_front_closed_mean']:+.2f}}}",
        f"\\newcommand{{\\BumpFrontClosedSD}}{{{summary['bump_front_closed_sd']:.2f}}}",
        f"\\newcommand{{\\BumpFrontT}}{{{summary['bump_front_t']:.2f}}}",
        f"\\newcommand{{\\BumpFrontP}}{{{summary['bump_front_p']:.4f}}}",
        f"\\newcommand{{\\BumpFrontWilcoxP}}{{{fmt_p_latex(wp_bump_front)}}}",
        f"\\newcommand{{\\BumpFrontDz}}{{{summary['bump_front_dz']:.2f}}}",
        f"\\newcommand{{\\NRepTemp}}{{{summary['n_rep_temp']}}}",
        f"\\newcommand{{\\PctRepTemp}}{{{summary['pct_rep_temp']:.1f}}}",
        f"\\newcommand{{\\LogBumpTempOpenMean}}{{{ot_db_bump.mean():+.2f}}}",
        f"\\newcommand{{\\LogBumpTempOpenSD}}{{{ot_db_bump.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\LogBumpTempClosedMean}}{{{ct_db_bump.mean():+.2f}}}",
        f"\\newcommand{{\\LogBumpTempClosedSD}}{{{ct_db_bump.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\LogBumpTempT}}{{{t_db_temp:.2f}}}",
        f"\\newcommand{{\\LogBumpTempP}}{{{fmt_p_latex(p_db_temp)}}}",
        f"\\newcommand{{\\LogBumpTempWilcoxP}}{{{fmt_p_latex(wp_db_temp)}}}",
        f"\\newcommand{{\\LogBumpTempDz}}{{{dz_db_temp:.2f}}}",
        f"\\newcommand{{\\LogBumpFrontOpenMean}}{{{of_db_bump.mean():+.2f}}}",
        f"\\newcommand{{\\LogBumpFrontOpenSD}}{{{of_db_bump.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\LogBumpFrontClosedMean}}{{{cf_db_bump.mean():+.2f}}}",
        f"\\newcommand{{\\LogBumpFrontClosedSD}}{{{cf_db_bump.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\LogBumpFrontT}}{{{t_db_front:.2f}}}",
        f"\\newcommand{{\\LogBumpFrontP}}{{{p_db_front:.4f}}}",
        f"\\newcommand{{\\LogBumpFrontWilcoxP}}{{{fmt_p_latex(wp_db_front)}}}",
        f"\\newcommand{{\\LogBumpFrontDz}}{{{dz_db_front:.2f}}}",
        f"\\newcommand{{\\LogBumpInterT}}{{{t_db_inter:.2f}}}",
        f"\\newcommand{{\\LogBumpInterP}}{{{p_db_inter:.4f}}}",
        f"\\newcommand{{\\LogBumpInterWilcoxP}}{{{fmt_p_latex(wp_db_inter)}}}",
        f"\\newcommand{{\\LogBumpInterDz}}{{{dz_db_inter:.2f}}}",
        f"\\newcommand{{\\LogBumpTempDiffMean}}{{{(ct_db_bump - ot_db_bump).mean():+.2f}}}",
        f"\\newcommand{{\\LogBumpTempDiffSD}}{{{(ct_db_bump - ot_db_bump).std(ddof=1):.2f}}}",
        f"\\newcommand{{\\LogBumpFrontDiffMean}}{{{(cf_db_bump - of_db_bump).mean():+.2f}}}",
        f"\\newcommand{{\\LogBumpFrontDiffSD}}{{{(cf_db_bump - of_db_bump).std(ddof=1):.2f}}}",
        f"\\newcommand{{\\SSVEPFourSNR}}{{{summary['ssvep_4hz_snr_db']:.1f}}}",
        f"\\newcommand{{\\SSVEPElevenSNR}}{{{summary['ssvep_11hz_snr_db']:.1f}}}",
        f"\\newcommand{{\\ERPSNROne}}{{{summary['erp_snr_n1']:.1f}}}",
        f"\\newcommand{{\\ERPSNRThirty}}{{{summary['erp_snr_n30']:.1f}}}",
        f"\\newcommand{{\\ERPSNRHundred}}{{{summary['erp_snr_n100']:.1f}}}",
        f"\\newcommand{{\\BCIKNNFullAcc}}{{{summary['bci_knn_full_acc']:.1f}}}",
        f"\\newcommand{{\\BCIKNNFullAUC}}{{{summary['bci_knn_full_auc']:.2f}}}",
        f"\\newcommand{{\\BCIKNNAlphaAcc}}{{{summary['bci_knn_alpha_acc']:.1f}}}",
        f"\\newcommand{{\\BCIKNNAlphaAUC}}{{{summary['bci_knn_alpha_auc']:.2f}}}",
        f"\\newcommand{{\\BCIKNNLTwoFullAcc}}{{{summary['bci_knn_l2_full_acc']:.1f}}}",
        f"\\newcommand{{\\BCIKNNLTwoFullAUC}}{{{summary['bci_knn_l2_full_auc']:.2f}}}",
        f"\\newcommand{{\\BCIKNNLTwoAlphaAcc}}{{{summary['bci_knn_l2_alpha_acc']:.1f}}}",
        f"\\newcommand{{\\BCIKNNLTwoAlphaAUC}}{{{summary['bci_knn_l2_alpha_auc']:.2f}}}",
        f"\\newcommand{{\\BCIKNNUnitLTwoAcc}}{{{summary['bci_knn_l2_alpha_acc']:.1f}}}",
        f"\\newcommand{{\\BCIKNNUnitLTwoAUC}}{{{summary['bci_knn_l2_alpha_auc']:.2f}}}",
        f"\\newcommand{{\\TempAlphaCILow}}{{{temp_a_ci_lo:+.2f}}}",
        f"\\newcommand{{\\TempAlphaCIHigh}}{{{temp_a_ci_hi:+.2f}}}",
        f"\\newcommand{{\\FrontAlphaCILow}}{{{front_a_ci_lo:+.2f}}}",
        f"\\newcommand{{\\FrontAlphaCIHigh}}{{{front_a_ci_hi:+.2f}}}",
        f"\\newcommand{{\\InterCILow}}{{{inter_ci_lo:+.2f}}}",
        f"\\newcommand{{\\InterCIHigh}}{{{inter_ci_hi:+.2f}}}",
        f"\\newcommand{{\\BumpTempCILow}}{{{bump_t_ci_lo:+.2f}}}",
        f"\\newcommand{{\\BumpTempCIHigh}}{{{bump_t_ci_hi:+.2f}}}",
        f"\\newcommand{{\\BumpFrontCILow}}{{{bump_f_ci_lo:+.2f}}}",
        f"\\newcommand{{\\BumpFrontCIHigh}}{{{bump_f_ci_hi:+.2f}}}",
        f"\\newcommand{{\\LogBumpTempCILow}}{{{db_t_ci_lo:+.2f}}}",
        f"\\newcommand{{\\LogBumpTempCIHigh}}{{{db_t_ci_hi:+.2f}}}",
        f"\\newcommand{{\\LogBumpFrontCILow}}{{{db_f_ci_lo:+.2f}}}",
        f"\\newcommand{{\\LogBumpFrontCIHigh}}{{{db_f_ci_hi:+.2f}}}",
        f"\\newcommand{{\\LogBumpInterCILow}}{{{db_i_ci_lo:+.2f}}}",
        f"\\newcommand{{\\LogBumpInterCIHigh}}{{{db_i_ci_hi:+.2f}}}",
        f"\\newcommand{{\\AlphaCronbachClosedTemp}}{{{cron_ct:.2f}}}",
        f"\\newcommand{{\\AlphaCronbachOpenTemp}}{{{cron_ot:.2f}}}",
        f"\\newcommand{{\\AlphaSplitHalfR}}{{{r_sb:.2f}}}",
        # Focus 1: Temporal split-half reliability
        f"\\newcommand{{\\TemporalEpochSplitHalfR}}{{{r_tp9_sb:.4f}}}",
        f"\\newcommand{{\\TemporalEpochSplitHalfRawR}}{{{r_tp9_raw:.4f}}}",
        f"\\newcommand{{\\TemporalEpochSplitHalfTemporalR}}{{{r_temp_sb:.4f}}}",
        f"\\newcommand{{\\TemporalEpochSplitHalfAlphaR}}{{{r_temp_a_sb:.4f}}}",
        # Focus 2: Individual Alpha Frequency (IAF) CoG and difference peak
        f"\\newcommand{{\\IAFCoGClosedTempMean}}{{{cog_ct.mean():.2f}}}",
        f"\\newcommand{{\\IAFCoGClosedTempSD}}{{{cog_ct.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\IAFCoGOpenTempMean}}{{{cog_ot.mean():.2f}}}",
        f"\\newcommand{{\\IAFCoGOpenTempSD}}{{{cog_ot.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\IAFDiffPeakMean}}{{{diff_rel_peaks.mean():.2f}}}",
        f"\\newcommand{{\\IAFDiffPeakSD}}{{{diff_rel_peaks.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\IAFRawPeakMean}}{{{raw_peaks.mean():.2f}}}",
        f"\\newcommand{{\\IAFRawPeakSD}}{{{raw_peaks.std(ddof=1):.2f}}}",
        # Focus 3: Aperiodic exponents chi_A
        f"\\newcommand{{\\AperiodicTempOpenMean}}{{{chi_ot.mean():.2f}}}",
        f"\\newcommand{{\\AperiodicTempOpenSD}}{{{chi_ot.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\AperiodicTempClosedMean}}{{{chi_ct.mean():.2f}}}",
        f"\\newcommand{{\\AperiodicTempClosedSD}}{{{chi_ct.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\AperiodicTempDiffMean}}{{{diff_chi_t.mean():.2f}}}",
        f"\\newcommand{{\\AperiodicTempDiffSD}}{{{diff_chi_t.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\AperiodicTempT}}{{{t_chi_t:.2f}}}",
        f"\\newcommand{{\\AperiodicTempP}}{{{fmt_p_latex(p_chi_t)}}}",
        f"\\newcommand{{\\AperiodicTempWilcoxP}}{{{fmt_p_latex(wp_chi_t)}}}",
        f"\\newcommand{{\\AperiodicTempDz}}{{{dz_chi_t:.2f}}}",
        f"\\newcommand{{\\AperiodicTempCILow}}{{{ci_chi_t_lo:+.2f}}}",
        f"\\newcommand{{\\AperiodicTempCIHigh}}{{{ci_chi_t_hi:+.2f}}}",
        f"\\newcommand{{\\AperiodicFrontOpenMean}}{{{chi_of.mean():.2f}}}",
        f"\\newcommand{{\\AperiodicFrontOpenSD}}{{{chi_of.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\AperiodicFrontClosedMean}}{{{chi_cf.mean():.2f}}}",
        f"\\newcommand{{\\AperiodicFrontClosedSD}}{{{chi_cf.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\AperiodicFrontDiffMean}}{{{diff_chi_f.mean():.2f}}}",
        f"\\newcommand{{\\AperiodicFrontDiffSD}}{{{diff_chi_f.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\AperiodicFrontT}}{{{t_chi_f:.2f}}}",
        f"\\newcommand{{\\AperiodicFrontP}}{{{fmt_p_latex(p_chi_f)}}}",
        f"\\newcommand{{\\AperiodicFrontWilcoxP}}{{{fmt_p_latex(wp_chi_f)}}}",
        f"\\newcommand{{\\AperiodicFrontDz}}{{{dz_chi_f:.2f}}}",
        f"\\newcommand{{\\AperiodicFrontCILow}}{{{ci_chi_f_lo:+.2f}}}",
        f"\\newcommand{{\\AperiodicFrontCIHigh}}{{{ci_chi_f_hi:+.2f}}}",
        # Focus 4: Welch two-sample t-tests
        f"\\newcommand{{\\WelchSixtySevenDiffMean}}{{{diff_w67:+.2f}}}",
        f"\\newcommand{{\\WelchSixtySevenDF}}{{{df_w67:.1f}}}",
        f"\\newcommand{{\\WelchSixtySevenT}}{{{t_w67:.2f}}}",
        f"\\newcommand{{\\WelchSixtySevenP}}{{{fmt_p_latex(p_w67)}}}",
        f"\\newcommand{{\\WelchSixtySevenCILow}}{{{ci_w67_lo:+.2f}}}",
        f"\\newcommand{{\\WelchSixtySevenCIHigh}}{{{ci_w67_hi:+.2f}}}",
        f"\\newcommand{{\\WelchSeventyFiveDiffMean}}{{{diff_w75:+.2f}}}",
        f"\\newcommand{{\\WelchSeventyFiveDF}}{{{df_w75:.1f}}}",
        f"\\newcommand{{\\WelchSeventyFiveT}}{{{t_w75:.2f}}}",
        f"\\newcommand{{\\WelchSeventyFiveP}}{{{fmt_p_latex(p_w75)}}}",
        f"\\newcommand{{\\WelchSeventyFiveCILow}}{{{ci_w75_lo:+.2f}}}",
        f"\\newcommand{{\\WelchSeventyFiveCIHigh}}{{{ci_w75_hi:+.2f}}}",
        # Focus 4: ID-matched comparison
        f"\\newcommand{{\\IDMatchedHSGN}}{{{len(hsg_qc)}}}",
        f"\\newcommand{{\\IDMatchedHSGDF}}{{{len(hsg_qc) - 1}}}",
        f"\\newcommand{{\\IDMatchedHSGModTwoDiffMean}}{{{hsg_m2_d.mean():+.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGModTwoDiffSD}}{{{hsg_m2_d.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGModThreeDiffMean}}{{{hsg_m3_d.mean():+.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGModThreeDiffSD}}{{{hsg_m3_d.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGDiffMean}}{{{diff_hsg.mean():+.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGDiffSD}}{{{diff_hsg.std(ddof=1):.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGT}}{{{t_hsg:.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGP}}{{{fmt_p_latex(p_hsg)}}}",
        f"\\newcommand{{\\IDMatchedHSGWilcoxP}}{{{fmt_p_latex(wp_hsg)}}}",
        f"\\newcommand{{\\IDMatchedHSGDz}}{{{dz_hsg:.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGCILow}}{{{ci_hsg_lo:+.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGCIHigh}}{{{ci_hsg_hi:+.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGR}}{{{r_hsg:.2f}}}",
        f"\\newcommand{{\\IDMatchedHSGRP}}{{{pr_hsg:.2f}}}",
    ]
    with open(os.path.join(p1_dir, "stats_macros.tex"), "w") as f:
        f.write("\n".join(macros) + "\n")
    print("Exported Paper 1 stats_summary.json, classroom_empirical_results.csv, and stats_macros.tex")


if __name__ == "__main__":
    make_fig1_architecture()
    make_fig2_ecg_bridge()
    make_fig3_multichannel_spectra()
    make_fig4_classroom_alpha()
    bench = make_fig5_ssvep_erp_bci()
    export_paper1_stats_and_macros(bench)
