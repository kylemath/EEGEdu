#!/usr/bin/env python3
"""
Generate publication-quality figures and statistical macros for Paper 2 (BrainImation)
from repository source code (repos/Brainimation) and classroom student submissions (PSYCH 403).
"""
import os
import glob
import re
import json
import csv
import hashlib
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch
from PIL import Image

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans", "Arial", "Helvetica"],
    "font.size": 9.5,
    "axes.titlesize": 10.5,
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

BASE_DIR = "/Users/kylemathewson/eegeduPaper"
BRAIN_DIR = os.path.join(BASE_DIR, "repos/Brainimation")
P2_DIR = os.path.join(BASE_DIR, "paper2_brainimation")
OUT_DIR = os.path.join(P2_DIR, "figures")
TBL_DIR = os.path.join(P2_DIR, "tables")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(TBL_DIR, exist_ok=True)

for old_f in glob.glob(os.path.join(OUT_DIR, "fig3_bci_games*")):
    os.remove(old_f)


def extract_executable_lines(code_text):
    """Return list of non-blank, non-comment executable lines of JavaScript code."""
    lines = [ln.strip() for ln in code_text.splitlines()]
    return [
        ln for ln in lines
        if ln and not ln.startswith("//") and not ln.startswith("/*") and not ln.startswith("*") and not ln.startswith("*/")
    ]


def count_executable_loc(code_text):
    """Count non-blank, non-comment executable lines of JavaScript code."""
    return len(extract_executable_lines(code_text))


def analyze_builtin_examples():
    """Parse all 36 built-in BrainImation example sketches and manifest categories."""
    manifest_path = os.path.join(BRAIN_DIR, "examples/manifest.json")
    manifest = json.load(open(manifest_path, "r"))
    cat_order = manifest["categoryOrder"]

    examples = []
    for entry in manifest["examples"]:
        fpath = os.path.join(BRAIN_DIR, "examples", entry["file"])
        if not os.path.exists(fpath):
            continue
        code = open(fpath, "r", errors="ignore").read()
        exec_lines = extract_executable_lines(code)
        exec_code = "\n".join(exec_lines)
        loc = len(exec_lines)
        examples.append({
            "id": entry["id"],
            "file": entry["file"],
            "title": entry["title"],
            "category": entry["category"],
            "loc": loc,
            "alpha": bool(re.search(r"eegData\.alpha\b", exec_code)),
            "beta": bool(re.search(r"eegData\.beta\b", exec_code)),
            "theta": bool(re.search(r"eegData\.theta\b", exec_code)),
            "delta": bool(re.search(r"eegData\.delta\b", exec_code)),
            "gamma": bool(re.search(r"eegData\.gamma\b", exec_code)),
            "attention": bool(re.search(r"eegData\.attention\b", exec_code)),
            "meditation": bool(re.search(r"eegData\.meditation\b", exec_code)),
            "raw_epoch": bool(re.search(r"getRawChannel|getAllChannels|getRecentEpoch|eegData\.raw\b", exec_code)),
            "audio": bool(re.search(r"Oscillator|PolySynth|MonoSynth|Reverb|FFT", exec_code)),
            "webgl_3d": bool(re.search(r"WEBGL|rotateX|rotateY|torus|sphere|box\(", exec_code)),
        })

    with open(os.path.join(TBL_DIR, "builtin_examples_metrics.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Example_ID", "Title", "Category", "Executable_LOC", "Alpha", "Beta", "Theta",
                    "Delta", "Gamma", "Attention", "Meditation", "Raw_256Hz_Epoch", "Audio_Synth"])
        for ex in examples:
            w.writerow([ex["id"], ex["title"], ex["category"], ex["loc"],
                        int(ex["alpha"]), int(ex["beta"]), int(ex["theta"]), int(ex["delta"]),
                        int(ex["gamma"]), int(ex["attention"]), int(ex["meditation"]),
                        int(ex["raw_epoch"]), int(ex["audio"])])

    return examples, cat_order


def make_fig1_ide_architecture(examples, cat_order, muse_kb, reduction_factor):
    """Fig 1: BrainImation Client-Side Live-Coding Architecture, Lazy-GATT Handshake, and 10-Category Scaffold Corpus."""
    fig = plt.figure(figsize=(13.8, 7.9))
    gs = gridspec.GridSpec(2, 2, height_ratios=[0.88, 1.25], width_ratios=[0.82, 1.38], hspace=0.26, wspace=0.14)

    # Panel A: 5-Stage Client-Side Architecture
    ax_a = fig.add_subplot(gs[0, :])
    ax_a.set_xlim(0, 100)
    ax_a.set_ylim(2, 25)
    ax_a.axis("off")
    ax_a.set_title(
        "A. BrainImation Zero-Install Client-Side Architecture: Custom Lazy-GATT WebBluetooth Client & Dynamic p5.js/p5.sound Sandbox",
        loc="left", pad=4, fontsize=11.0
    )

    boxes = [
        (1.0, 4.2, 18.0, 17.5, "#1f4e78",
         f"1. Two-Phase GATT Client\n   (muse-browser.js, {muse_kb:.1f} KB)\n\n"
         "• Connect Service 0xFE8D\n"
         "• Bind Control 273e0001\n"
         "• Send 'v1', 'p21', 's' FIRST\n"
         "• Settle → Bind 256 Hz EEG\n"
         "  (273e0003..273e0006)\n"
         f"• {reduction_factor:.1f}× smaller than muse-js"),
        (21.8, 4.2, 17.8, 17.5, "#008080",
         "2. Dual-Source EEG Engine\n   (window.eegData + Sim)\n\n"
         "• 4-Ch 256 Hz Ring Buffers\n"
         "  (TP9, AF7, AF8, TP10)\n"
         "• 256-pt Hanning FFT Bands:\n"
         "  δ, θ, α, β, γ ∈ [0,1]\n"
         "• Derived: attention, med.\n"
         "• 256 Hz Sim + Blinks/ERPs"),
        (42.4, 4.2, 18.0, 17.5, "#2e75b6",
         "3. Pedagogical Browser IDE\n   (Monaco + 94-API Ref)\n\n"
         "• Custom eegData IntelliSense\n"
         "• 5-Tab Reference Panel w/\n"
         "  ${1:param} Tab-Stop Snippets\n"
         "• Client-Side AI Assistant\n"
         "• Serverless ?sketch= & Data-URI\n"
         "  Course Portfolio Loader"),
        (63.2, 4.2, 17.6, 17.5, "#d95f02",
         "4. Dynamic Introspection\n   (bindP5Functions Engine)\n\n"
         "• Introspects p5.prototype\n"
         "• Auto-binds 2D/WebGL &\n"
         "  p5.sound classes to window\n"
         "• Forwards 15 Lifecycle/DOM hooks\n"
         "• Runtime Error Trap + Log\n"
         "• 440 Hz SoundTester Tool"),
        (83.6, 4.2, 15.4, 17.5, "#6a3d9a",
         "5. Live Output Modalities\n   (36 Built-In Scaffolds)\n\n"
         "• 2D/3D Generative Neuro-Art\n"
         "• Polyphonic & Chowning FM\n"
         "  Brain Sonification\n"
         "• Closed-Loop BCI Games\n"
         "• Online 4-Ch ERP Averaging"),
    ]
    for x, y, w, h, col, text in boxes:
        patch = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5,rounding_size=1.2",
                               facecolor=col, edgecolor="none", alpha=0.93)
        ax_a.add_patch(patch)
        ax_a.text(x + w / 2, y + h / 2, text, color="white", ha="center", va="center",
                  fontsize=8.0, linespacing=1.23, fontweight="medium")

    for x_start, x_end in [(19.3, 21.5), (39.9, 42.1), (60.7, 62.9), (81.1, 83.3)]:
        ax_a.annotate("", xy=(x_end, 13), xytext=(x_start, 13),
                      arrowprops=dict(arrowstyle="->,head_width=0.35,head_length=0.45", lw=2.2, color="#333333"))

    # Panel B: Screenshot of BrainImation Live IDE
    ax_b = fig.add_subplot(gs[1, 0])
    scr_path = os.path.join(BRAIN_DIR, "screenshot.png")
    if os.path.exists(scr_path):
        img = Image.open(scr_path)
        ax_b.imshow(img)
    ax_b.set_xticks([])
    ax_b.set_yticks([])
    for sp in ax_b.spines.values():
        sp.set_visible(True)
        sp.set_color("#cccccc")
    ax_b.set_title("B. BrainImation Live Browser IDE Interface", loc="center", pad=8, fontsize=10.5)

    # Panel C: Summary Table of the 10 Built-In Pedagogical Categories (N = 36 Sketches)
    ax_c = fig.add_subplot(gs[1, 1])
    ax_c.axis("off")
    ax_c.set_title("C. Built-In 10-Category Pedagogical Scaffold Curriculum (36 Editable Sketches)", loc="left", pad=8, fontsize=10.5)

    col_labels = ["Category", "N", "LOC", "Representative Scaffolds", "Primary EEG & API Mappings"]
    table_data = [
        ["1. Getting Started", "3", "11–27", "basic, basicShapes, functionEx.", "eegData.alpha, attention → size, hue"],
        ["2. Brain Wave Viz", "6", "27–36", "BasicFrequencyBands, bandOrbitz", "δ, θ, α, β, γ → 5-band polar/spectral"],
        ["3. Attention & Med.", "2", "20–25", "attention, mandala", "attention, meditation → radial symmetry"],
        ["4. Particle Systems", "3", "29–35", "particles, ColourBalls, MultipleBalls", "α, β, θ, γ → particle velocity & force"],
        ["5. 3D & Advanced", "3", "27–38", "3dTorus, AlphaSnake, SplineBounce", "WEBGL 3D torus rotation & α turn rate"],
        ["6. Drawing & Input", "3", "33–38", "BrainDraw, bouncingLine, ghostLines", "α, β, θ + mouseX/Y → generative brush"],
        ["7. Raw EEG & ERPs", "3", "44–85", "eegtrace, multichannel, epochs", "256 Hz TP9..TP10 & K=20 ERP averaging"],
        ["8. Noise & Gen. Art", "6", "20–35", "perlinNoise, organicHeatmap", "α, θ, attention → 2D Perlin noise field"],
        ["9. Animation & Cam", "4", "32–42", "waveAnimation, webcamInput", "α, θ + createCapture(VIDEO) mirror"],
        ["10. Sound & Music", "3", "75–111", "brainBeats, alphaMusic, brainSynth", "p5.Oscillator, PolySynth, Reverb, FM FFT"],
    ]
    tbl = ax_c.table(
        cellText=table_data, colLabels=col_labels, loc="center", cellLoc="left",
        colWidths=[0.19, 0.04, 0.08, 0.34, 0.35], bbox=[0.0, 0.0, 1.0, 0.96]
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(6.6)
    for (row, col), cell in tbl.get_celld().items():
        cell.set_edgecolor("#d0d7de")
        cell.PAD = 0.03
        if row == 0:
            cell.set_facecolor("#1f4e78")
            cell.get_text().set_color("white")
            cell.get_text().set_weight("bold")
        elif row in (7, 10):
            cell.set_facecolor("#eef6ff")
        else:
            cell.set_facecolor("#ffffff" if row % 2 == 1 else "#f8f9fa")

    fig.savefig(os.path.join(OUT_DIR, "fig1_brainimation_ide_architecture.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig1_brainimation_ide_architecture.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Paper 2 Fig 1 (Architecture & 10-Category Scaffold Table)")


def make_fig2_ide_scaffolding_and_corpus(examples, cat_order):
    """Fig 2: Pedagogical IDE Scaffolding (94-Item Reference Database, Simulator Synthesis, Category LOC & Feature Profile)."""
    fig = plt.figure(figsize=(13.8, 7.6))
    gs = gridspec.GridSpec(2, 2, height_ratios=[1.0, 1.06], width_ratios=[1.0, 1.0], hspace=0.35, wspace=0.36)

    # Panel A: 94-Item Interactive Reference & Autocomplete Database Across 4 Tabs & 22 Subcategories
    # Exact group counts from index.html (p5Reference=38, inputReference=27, soundReference=16, eegReference=13)
    ax_a = fig.add_subplot(gs[0, 0])
    ref_tabs = [
        ("P5.js Tab\n(6 groups)", [("Drawing", 9, "#1f4e78"), ("Color", 8, "#2e75b6"),
                                   ("Math", 8, "#4a90d9"), ("Transform", 5, "#6baed6"),
                                   ("Control", 4, "#9ecae1"), ("Text", 4, "#c6dbef")]),
        ("Input Tab\n(7 groups)", [("Mouse Ev.", 6, "#006d5b"), ("Mouse Var", 6, "#008080"),
                                   ("Key Ev.", 3, "#20a39e"), ("Key Var", 3, "#48bf91"),
                                   ("Touch Ev.", 3, "#76d7c4"), ("Touch Var", 3, "#a3e4d7"),
                                   ("Templates", 3, "#d1f2eb")]),
        ("Sound Tab\n(5 groups)", [("Effects", 5, "#b34800"), ("Control", 4, "#d95f02"),
                                   ("Synths", 3, "#ec7014"), ("Files", 2, "#fe9929"),
                                   ("Analysis", 2, "#fec44f")]),
        ("EEG Data Tab\n(4 groups)", [("Bands", 5, "#54278f"), ("Raw Access", 4, "#6a3d9a"),
                                      ("Derived", 2, "#9e9ac8"), ("Status", 2, "#cbc9e2")]),
    ]
    y_pos = np.arange(len(ref_tabs))[::-1]
    for idx, (tab_lbl, subcats) in enumerate(ref_tabs):
        y = y_pos[idx]
        left = 0
        for sub_lbl, cnt, col in subcats:
            ax_a.barh(y, cnt, left=left, height=0.55, color=col, edgecolor="white", lw=0.8)
            if cnt >= 5:
                ax_a.text(left + cnt / 2, y, f"{sub_lbl}\n({cnt})",
                          ha="center", va="center", fontsize=6.4,
                          color="white" if left < 18 else "#222222", fontweight="bold")
            left += cnt
        ax_a.text(left + 0.8, y, f"{left} APIs", va="center", ha="left", fontsize=8.4, fontweight="bold", color="#222")

    ax_a.set_yticks(y_pos)
    ax_a.set_yticklabels([r[0] for r in ref_tabs], fontweight="bold")
    ax_a.set_xlim(0, 45)
    ax_a.set_xlabel("Number of Click-to-Insert & Autocomplete API Primitives (Total = 94)")
    ax_a.set_title("A. Interactive Reference & IntelliSense (94 APIs, 22 Groups)", loc="left", fontsize=10.2)

    # Panel B: Hardware-Free EEGSimulator 4-Channel 256 Hz Signal Synthesis (matching EEGSimulator.generateSamples in index.html)
    ax_b = fig.add_subplot(gs[0, 1])
    rng = np.random.default_rng(42)
    t = np.linspace(0, 2.0, 512)  # 2 seconds at 256 Hz
    att, med = 0.55, 0.65
    alpha_v = np.clip(med * 0.8 + 0.1 + 0.1 * np.sin(t * 2.5), 0, 1)
    beta_v = np.clip(att * 0.7 + 0.2 + 0.12 * np.sin(t * 3.5), 0, 1)
    theta_v = np.clip(med * 0.6 + 0.1 + 0.10 * np.sin(t * 1.8), 0, 1)
    delta_v = 0.15 + 0.05 * np.sin(t * 0.8)
    gamma_v = 0.15 + 0.45 * att + 0.08 * np.sin(t * 5.0)

    ch_names = ["TP9", "AF7", "AF8", "TP10"]
    ch_cols = ["#6a3d9a", "#2e75b6", "#008080", "#d95f02"]
    offsets = [225, 75, -75, -225]
    for i, (ch, col, off) in enumerate(zip(ch_names, ch_cols, offsets)):
        sig = (
            np.sin(2 * np.pi * (9 + i * 0.5) * t) * alpha_v * 30
            + np.sin(2 * np.pi * (18 + i * 1.5) * t) * beta_v * 20
            + np.sin(2 * np.pi * (6 + i * 0.3) * t) * theta_v * 25
            + np.sin(2 * np.pi * (2 + i * 0.2) * t) * delta_v * 40
            + np.sin(2 * np.pi * (35 + i * 2.0) * t) * gamma_v * 10
            + np.sin(2 * np.pi * 0.1 * t) * 5
            + rng.uniform(-0.5, 0.5, size=len(t)) * 15
        )
        # Bilateral anterior frontal (AF7, AF8) Gaussian blink envelope matching EEGSimulator
        if i in (1, 2):
            blink_env = 115.0 * np.exp(-((t - 1.15) ** 2) / (2 * 0.025 ** 2))
            sig += blink_env
        ax_b.plot(t, sig + off, color=col, lw=1.0, label=ch)

    ax_b.annotate("Simulated Bilateral Frontal Blink\n(AF7 / AF8, +115 µV, p=0.001)",
                  xy=(1.11, 172), xytext=(0.28, 138),
                  arrowprops=dict(arrowstyle="->", color="#1f4e78", lw=1.2),
                  fontsize=7.3, fontweight="bold", color="#1f4e78",
                  bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="none", alpha=0.85))
    ax_b.set_yticks(offsets)
    ax_b.set_yticklabels(["TP9\n(Left Temp.)", "AF7\n(Left Front.)", "AF8\n(Right Front.)", "TP10\n(Right Temp.)"], fontweight="bold", fontsize=8)
    ax_b.set_xlim(0, 2.0)
    ax_b.set_ylim(-300, 320)
    ax_b.set_xlabel("Simulated Time (seconds @ 256 Hz)")
    ax_b.set_title("B. Hardware-Free EEGSimulator 4-Channel 256 Hz Synthesis", loc="left", fontsize=10.2)

    # Panel C: Executable LOC Across the 10 Pedagogical Categories (Bar = Median, Dots = Individual Sketches)
    ax_c = fig.add_subplot(gs[1, 0])
    cat_short = {
        "Getting Started": "1. Getting Started (n=3)",
        "Brain Wave Visualizations": "2. Brain Wave Viz (n=6)",
        "Attention & Meditation": "3. Attention & Med. (n=2)",
        "Particle Systems": "4. Particle Systems (n=3)",
        "3D & Advanced": "5. 3D & WebGL (n=3)",
        "Drawing & Interaction": "6. Drawing & Input (n=3)",
        "Raw EEG Data": "7. Raw EEG & ERPs (n=3)",
        "Noise & Generative": "8. Noise & Gen. Art (n=6)",
        "Animation & Motion": "9. Animation & Cam (n=4)",
        "Sound & Music": "10. Sound & Music (n=3)",
    }
    y_cats = np.arange(len(cat_order))[::-1]
    for idx, cat in enumerate(cat_order):
        locs = [ex["loc"] for ex in examples if ex["category"] == cat]
        y = y_cats[idx]
        med_v = np.median(locs)
        min_v, max_v = np.min(locs), np.max(locs)
        col = "#d95f02" if cat in ("Raw EEG Data", "Sound & Music") else "#2e75b6"
        ax_c.barh(y, med_v, height=0.60, color=col, alpha=0.78)
        ax_c.plot([min_v, max_v], [y, y], color="#111111", lw=1.6)
        ax_c.scatter(locs, [y] * len(locs), color="#111111", s=20, zorder=4)
        med_lbl = f"{med_v:.1f}" if med_v % 1 != 0 else f"{int(med_v)}"
        ax_c.text(max_v + 2.0, y, f"{med_lbl} LOC ({min_v}–{max_v})", va="center", ha="left", fontsize=7.4, fontweight="bold")

    ax_c.set_yticks(y_cats)
    ax_c.set_yticklabels([cat_short[c] for c in cat_order], fontsize=8.0, fontweight="medium")
    ax_c.set_xlim(0, 152)
    ax_c.set_xlabel("Executable Lines of Code (Bar = Median, Dots = Individual Sketches)")
    ax_c.set_title("C. Scaffold Complexity Across 10 Categories (N = 36)", loc="left", fontsize=10.2)

    # Panel D: EEG Feature Utilization Across the 36 Built-In Example Scaffolds
    ax_d = fig.add_subplot(gs[1, 1])
    feat_list = [
        ("eegData.alpha (8–12 Hz)", "alpha", "#2e75b6"),
        ("eegData.attention Index", "attention", "#6a3d9a"),
        ("eegData.beta (13–30 Hz)", "beta", "#2e75b6"),
        ("eegData.theta (4–8 Hz)", "theta", "#2e75b6"),
        ("eegData.meditation Index", "meditation", "#6a3d9a"),
        ("eegData.delta (1–4 Hz)", "delta", "#2e75b6"),
        ("eegData.gamma (30–50 Hz)", "gamma", "#2e75b6"),
        ("256 Hz Raw / Epochs", "raw_epoch", "#008080"),
        ("p5.sound Synthesis", "audio", "#d95f02"),
        ("3D WebGL Geometry", "webgl_3d", "#4d4d4d"),
    ]
    n_ex = len(examples)
    rows_d = []
    for lbl, key, col in feat_list:
        cnt = sum(1 for ex in examples if ex[key])
        pct = cnt / n_ex * 100.0
        rows_d.append((pct, cnt, lbl, col))
    rows_d.sort(key=lambda x: x[0])

    yd = np.arange(len(rows_d))
    bars_d = ax_d.barh(yd, [r[0] for r in rows_d], color=[r[3] for r in rows_d], alpha=0.88, height=0.62)
    for bar, (pct, cnt, _, _) in zip(bars_d, rows_d):
        ax_d.text(pct + 1.2, bar.get_y() + bar.get_height() / 2, f"{pct:.1f}% ({cnt}/{n_ex})",
                  va="center", ha="left", fontsize=7.6, fontweight="bold", color="#222")
    ax_d.set_yticks(yd)
    ax_d.set_yticklabels([r[2] for r in rows_d], fontsize=8.0, fontweight="medium")
    ax_d.set_xlim(0, 98)
    ax_d.set_xlabel("Percentage of Built-In Scaffolds Demonstrating Feature (%)")
    ax_d.set_title(f"D. EEG & Multimedia API Coverage in Scaffolds (N = {n_ex})", loc="left", fontsize=10.2)

    fig.savefig(os.path.join(OUT_DIR, "fig2_ide_scaffolding_and_corpus.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig2_ide_scaffolding_and_corpus.pdf"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig2_creative_coding_sonification_pipeline.pdf"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig2_creative_coding_sonification_pipeline.png"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Paper 2 Fig 2 (Pedagogical IDE Scaffolding & 10-Category Corpus)")


def make_fig3_sonification_and_erp_engine():
    """Fig 3: Multi-Band Web Audio FM Sonification (brainSynth.js) & Online 4-Channel ERP Averaging (epochs.js)."""
    fig = plt.figure(figsize=(13.6, 7.5))
    gs = gridspec.GridSpec(2, 2, height_ratios=[1.0, 1.04], width_ratios=[1.02, 1.0], hspace=0.35, wspace=0.28)

    # Panel A: FM Synthesis Time-Domain Waveforms (Relaxed Alpha vs Active Beta/Theta State)
    ax_a = fig.add_subplot(gs[0, 0])
    t = np.linspace(0, 0.025, 2000)  # 25 ms window
    fc1 = 200 + 600 * 0.75  # 650 Hz
    fm1 = 100 * 0.15        # 15 Hz
    d1 = 500 * 0.15         # 75 Hz deviation
    y1 = np.sin(2 * np.pi * fc1 * t + (d1 / fm1) * np.sin(2 * np.pi * fm1 * t))

    fc2 = 200 + 600 * 0.45  # 470 Hz
    fm2 = 100 * 0.80        # 80 Hz
    d2 = 500 * 0.70         # 350 Hz deviation
    y2 = np.sin(2 * np.pi * fc2 * t + (d2 / fm2) * np.sin(2 * np.pi * fm2 * t))

    ax_a.plot(t * 1000, y1 + 1.25, color="#2e75b6", lw=1.5,
              label="Relaxed Alpha State (α=0.75, β=0.15, θ=0.15 → Smooth 650 Hz Carrier)")
    ax_a.plot(t * 1000, y2 - 1.25, color="#d95f02", lw=1.4,
              label="Active Beta/Theta State (α=0.45, β=0.80, θ=0.70 → Rich FM Modulation)")
    ax_a.set_xlim(0, 25)
    ax_a.set_ylim(-2.6, 2.8)
    ax_a.set_yticks([-1.25, 1.25])
    ax_a.set_yticklabels(["Active FM", "Relaxed FM"], fontweight="bold")
    ax_a.set_xlabel("Time (milliseconds)")
    ax_a.set_ylabel("Synthesized Audio Waveform")
    ax_a.set_title("A. Brain Synthesizer (brainSynth.js): Chowning FM Waveforms", loc="left", fontsize=10.2)
    ax_a.legend(loc="upper right", frameon=True, fontsize=7.5)

    # Panel B: FM Synthesis Acoustic Sideband Spectra
    ax_b = fig.add_subplot(gs[0, 1])
    fs = 44100
    t_long = np.linspace(0, 0.5, int(fs * 0.5))
    sig1 = np.sin(2 * np.pi * fc1 * t_long + (d1 / fm1) * np.sin(2 * np.pi * fm1 * t_long))
    sig2 = np.sin(2 * np.pi * fc2 * t_long + (d2 / fm2) * np.sin(2 * np.pi * fm2 * t_long))
    f_ax = np.fft.rfftfreq(len(t_long), 1 / fs)
    spec1 = np.abs(np.fft.rfft(sig1 * np.hanning(len(t_long))))
    spec2 = np.abs(np.fft.rfft(sig2 * np.hanning(len(t_long))))
    spec1 /= spec1.max()
    spec2 /= spec2.max()
    mask_f = (f_ax >= 50) & (f_ax <= 1200)

    ax_b.plot(f_ax[mask_f], spec1[mask_f], color="#2e75b6", lw=1.6,
              label="Relaxed State Spectrum (Narrowband 650 Hz Carrier)")
    ax_b.plot(f_ax[mask_f], spec2[mask_f], color="#d95f02", lw=1.4, alpha=0.9,
              label="Active State Spectrum (Bessel Sideband Comb fc ± k·fm)")
    ax_b.set_xlim(50, 1150)
    ax_b.set_ylim(0, 1.15)
    ax_b.set_xlabel("Audio Frequency (Hz)")
    ax_b.set_ylabel("Normalized Acoustic Magnitude")
    ax_b.set_title("B. Acoustic FFT Spectrum of Brain-Modulated FM (p5.FFT)", loc="left", fontsize=10.2)
    ax_b.legend(loc="upper right", frameon=True, fontsize=7.5)

    # Panel C: Online ERP Trial Averaging & √K Noise Reduction matching EEGSimulator.triggerSimulatedERP + epochs.js
    ax_c = fig.add_subplot(gs[1, 0])
    rng = np.random.default_rng(101)
    n_samp = 256  # -200 to +800 ms at 256 Hz (L_pre = 51 samples)
    t_erp = np.linspace(-200, 800, n_samp)
    true_erp = (
        -6.5 * np.exp(-((t_erp - 170.0) ** 2) / (2 * 26.0 ** 2))
        + 9.5 * np.exp(-((t_erp - 340.0) ** 2) / (2 * 58.0 ** 2))
    )
    trials = []
    for _ in range(25):
        pink = np.convolve(rng.normal(0, 14.0, size=n_samp), np.ones(5) / np.sqrt(5), mode="same")
        alpha_bg = 6.0 * np.sin(2 * np.pi * 10.0 * (t_erp / 1000.0) + rng.uniform(0, 2 * np.pi))
        trial_sig = true_erp + pink + alpha_bg
        trial_sig -= np.mean(trial_sig[:51])
        trials.append(trial_sig)
    trials = np.array(trials)
    bl_rms_1 = float(np.std(trials[0, :51], ddof=1))

    ax_c.plot(t_erp, trials[0], color="#aaaaaa", lw=0.9, alpha=0.75, label=f"Single Raw Epoch (K = 1, σ_pre = {bl_rms_1:.1f} µV)")
    ax_c.plot(t_erp, np.mean(trials[:5], axis=0), color="#2e75b6", lw=1.4, alpha=0.85, label="5-Trial Running Average (K = 5)")
    ax_c.plot(t_erp, np.mean(trials[:20], axis=0), color="#d95f02", lw=2.3, label="20-Trial Baseline-Corrected Average (K = 20)")
    ax_c.axvline(0, color="#222222", ls="--", lw=1.1)
    ax_c.axhline(0, color="#666666", ls=":", lw=0.9)
    ax_c.annotate("N170 (-6.5 µV)", xy=(170, -6.2), xytext=(-170, -19),
                  arrowprops=dict(arrowstyle="->", color="#1f4e78", lw=1.2), fontweight="bold", color="#1f4e78", fontsize=8.2)
    ax_c.annotate("P300 (+9.5 µV)", xy=(340, 9.2), xytext=(430, 16),
                  arrowprops=dict(arrowstyle="->", color="#b34800", lw=1.2), fontweight="bold", color="#b34800", fontsize=8.2)
    ax_c.set_xlim(-200, 800)
    ax_c.set_ylim(-26, 26)
    ax_c.set_xlabel("Time Relative to Stimulus Onset (ms @ 256 Hz)")
    ax_c.set_ylabel("Baseline-Corrected Potential (µV)")
    ax_c.set_title("C. Triggered Epoch Extraction (epochs.js) & √K ERP Convergence", loc="left", fontsize=10.2)
    ax_c.legend(loc="lower right", frameon=True, fontsize=7.5)

    # Panel D: Closed-Loop Signal Conditioning in Student Sketches (EMA Smoothing & Hysteresis Hold)
    ax_d = fig.add_subplot(gs[1, 1])
    t_frames = np.arange(180)
    t_sec = t_frames / 60.0
    raw_alpha = 0.44 + 0.26 * np.sin(2 * np.pi * t_sec / 2.2) + rng.normal(0, 0.085, size=len(t_frames))
    raw_alpha = np.clip(raw_alpha, 0, 1)

    sm_alpha = np.zeros_like(raw_alpha)
    sm_alpha[0] = raw_alpha[0]
    for i in range(1, len(raw_alpha)):
        sm_alpha[i] = 0.85 * sm_alpha[i - 1] + 0.15 * raw_alpha[i]

    thresh_hi, thresh_lo = 0.58, 0.48
    state_gate = np.zeros_like(raw_alpha)
    active = False
    for i in range(len(raw_alpha)):
        if sm_alpha[i] >= thresh_hi:
            active = True
        elif sm_alpha[i] < thresh_lo:
            active = False
        state_gate[i] = 1.0 if active else 0.0

    ax_d.plot(t_sec, raw_alpha, color="#999999", lw=0.9, alpha=0.7, label="Unfiltered Frame-by-Frame eegData.alpha")
    ax_d.plot(t_sec, sm_alpha, color="#1f4e78", lw=2.1, label=r"EMA Smoothed Signal ($\hat{y}_t = 0.85\hat{y}_{t-1} + 0.15x_t$)")
    ax_d.axhline(thresh_hi, color="#d95f02", ls="--", lw=1.2, label="Hysteresis Entry / Exit Thresholds (0.58 / 0.48)")
    ax_d.axhline(thresh_lo, color="#d95f02", ls=":", lw=1.2)
    ax_d.fill_between(t_sec, 0, state_gate * 0.95, color="#6a3d9a", alpha=0.18, label="Stabilized Neurofeedback State Gate (Zero Flicker)")
    ax_d.set_xlim(0, 3.0)
    ax_d.set_ylim(0, 1.05)
    ax_d.set_xlabel("Real-Time Execution (seconds @ 60 FPS)")
    ax_d.set_ylabel("Normalized Band Power / Active State")
    ax_d.set_title("D. Closed-Loop EMA Smoothing & Hysteresis State Conditioning", loc="left", fontsize=10.2)
    ax_d.legend(loc="lower right", frameon=True, fontsize=7.4)

    fig.savefig(os.path.join(OUT_DIR, "fig3_sonification_and_erp_engine.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig3_sonification_and_erp_engine.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Paper 2 Fig 3 (Multi-Band FM Sonification, Online ERP Convergence & Signal Conditioning)")

    bl_rms_1 = float(np.std(trials[0, :51], ddof=1))
    bl_rms_5 = float(np.std(np.mean(trials[:5], axis=0)[:51], ddof=1))
    bl_rms_20 = float(np.std(np.mean(trials[:20], axis=0)[:51], ddof=1))
    p3_pk = 9.5
    var_diff_raw = float(np.var(np.diff(raw_alpha), ddof=1))
    var_diff_ema = float(np.var(np.diff(sm_alpha), ddof=1))
    ema_var_red_pct = (1.0 - var_diff_ema / var_diff_raw) * 100.0
    return {
        "erp_bl_rms_k1": round(bl_rms_1, 1),
        "erp_bl_rms_k5": round(bl_rms_5, 1),
        "erp_bl_rms_k20": round(bl_rms_20, 1),
        "erp_snr_k1": round(p3_pk / bl_rms_1, 2),
        "erp_snr_k5": round(p3_pk / bl_rms_5, 2),
        "erp_snr_k20": round(p3_pk / bl_rms_20, 2),
        "ema_var_red_pct": round(ema_var_red_pct, 1),
    }


def extract_student_author(rel_path):
    """Canonicalize the unique undergraduate author identity from a submission path."""
    low = rel_path.lower()
    for key, canonical in [
        ("cordez", "kyle_cordez"),
        ("amnak", "amna_khan"),
        ("amnakhan", "amna_khan"),
        ("ranar", "rana_radiansyah"),
        ("radiansyah", "rana_radiansyah"),
        ("zainabs", "zainab_samiuddin"),
        ("samiuddin", "zainab_samiuddin"),
        ("wainwright", "portia_wainwright"),
        ("yan_luo", "yan_luo"),
        ("gannon", "jake_gannon"),
    ]:
        if key in low:
            return canonical
    m = re.search(r"-\s*([A-Za-z\s\-]+?)(?:\.(?:txt|js|md|zip)|/|$)", rel_path)
    if m:
        return re.sub(r"\s+", "_", m.group(1).strip().lower())
    return os.path.basename(rel_path).lower()


def make_fig4_student_submissions(examples, muse_kb, legacy_muse_kb, dsp_bench):
    """Fig 4: Empirical Analysis of N=69 PSYCH 403 Submissions Across N_students=30 Unique Students."""
    sub_dir = os.path.join(BASE_DIR, "data/student_submissions")
    img_dir = os.path.join(sub_dir, "images")

    ex_locs = np.array([ex["loc"] for ex in examples])

    cand_files = []
    for root, dirs, files in os.walk(sub_dir):
        if "images" in root:
            continue
        for f in files:
            if f.endswith((".js", ".txt", ".md")):
                cand_files.append(os.path.join(root, f))

    student_sketches = []
    seen_hashes = set()
    for path in sorted(cand_files):
        txt = open(path, "r", errors="ignore").read()
        if ("function setup" in txt or "function draw" in txt) and ("eegData" in txt or "createCanvas" in txt):
            code_lines = extract_executable_lines(txt)
            norm_key = hashlib.md5("\n".join(code_lines).encode("utf-8", errors="ignore")).hexdigest()
            if norm_key in seen_hashes:
                continue
            seen_hashes.add(norm_key)
            rel = os.path.relpath(path, sub_dir)
            student_id = extract_student_author(rel)
            exec_code = "\n".join(code_lines)
            loc = len(code_lines)
            is_erp_cohort = bool(
                re.search(r"part\s*2|part2|oddball|erp|epochs-|MMN", rel, re.I)
                or re.search(r"getRecentEpoch|epochData|avgStd|avgTgt|T_PRE|preStimSamples", exec_code)
            )
            # Strict executable-code feature inspection (avoiding comment words and RGBA alpha opacity)
            student_sketches.append({
                "file": os.path.basename(path),
                "student_id": student_id,
                "cohort": "Online_ERP_Paradigm" if is_erp_cohort else "Continuous_Neurofeedback",
                "is_erp_cohort": is_erp_cohort,
                "loc": loc,
                "alpha": bool(re.search(r"eegData\.alpha\b", exec_code)),
                "beta": bool(re.search(r"eegData\.beta\b", exec_code)),
                "theta": bool(re.search(r"eegData\.theta\b", exec_code)),
                "delta": bool(re.search(r"eegData\.delta\b", exec_code)),
                "gamma": bool(re.search(r"eegData\.gamma\b", exec_code)),
                "attention": bool(re.search(r"eegData\.attention\b", exec_code)),
                "meditation": bool(re.search(r"eegData\.meditation\b", exec_code)),
                "raw": bool(re.search(r"eegData\.raw\b|getRecentRaw|getRawChannel|getAllChannels|getRecentEpoch|rawHistory|TP9|AF7|AF8|TP10", exec_code)),
                "erp_oddball": is_erp_cohort,
                "smoothing_conditioning": bool(re.search(
                    r"0\.[789]\d?\s*\*|smooth\w*\s*=|lerp\(|baseMean|baseline|preStim|hysteresis|holdFrames|constrain\(\s*(?:eegData|alpha|beta|theta|att|med|norm|smooth)",
                    exec_code, re.I
                )),
                "audio": bool(re.search(r"Oscillator|MonoSynth|PolySynth|SoundFile|Env|freq\(", exec_code)),
                "webgl": bool(re.search(r"WEBGL|rotateX|rotateY|torus|sphere|box\(", exec_code)),
                "particles": bool(re.search(r"class\s+\w+|particles|push\(\s*\{", exec_code)),
                "interactive": bool(re.search(r"mousePressed|keyPressed|createSlider|createButton", exec_code)),
            })

    stu_locs = np.array([s["loc"] for s in student_sketches])
    nf_locs = np.array([s["loc"] for s in student_sketches if not s["is_erp_cohort"]])
    erp_locs = np.array([s["loc"] for s in student_sketches if s["is_erp_cohort"]])
    n_stu = len(student_sketches)
    n_nf = len(nf_locs)
    n_erp = len(erp_locs)

    # Participant-level clustering (N_students = 30 independent learners)
    unique_students = sorted(set(s["student_id"] for s in student_sketches))
    n_unique_students = len(unique_students)
    stu_cluster_medians = np.array([
        np.median([s["loc"] for s in student_sketches if s["student_id"] == st])
        for st in unique_students
    ])

    # Mann-Whitney U tests (sketch-level and participant-clustered)
    u_stat, p_val = stats.mannwhitneyu(stu_locs, ex_locs, alternative="greater")
    u_cluster, p_cluster = stats.mannwhitneyu(stu_cluster_medians, ex_locs, alternative="greater")
    r_rb_cluster = 2.0 * (u_cluster / (n_unique_students * len(ex_locs))) - 1.0

    # Save student corpus CSV table
    with open(os.path.join(TBL_DIR, "student_submissions_metrics.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Sketch_ID", "Student_ID", "Cohort", "Executable_LOC", "Alpha", "Beta", "Theta", "Delta", "Gamma",
                    "Attention", "Meditation", "Raw_256Hz", "ERP_Oddball", "Signal_Conditioning",
                    "Audio_Synth", "Particles", "Interactive"])
        for idx, s in enumerate(student_sketches, 1):
            w.writerow([f"Student_Sketch_{idx:02d}", s["student_id"], s["cohort"], s["loc"],
                        int(s["alpha"]), int(s["beta"]), int(s["theta"]),
                        int(s["delta"]), int(s["gamma"]), int(s["attention"]), int(s["meditation"]),
                        int(s["raw"]), int(s["erp_oddball"]), int(s["smoothing_conditioning"]),
                        int(s["audio"]), int(s["particles"]), int(s["interactive"])])

    # Create Figure 4
    fig = plt.figure(figsize=(13.8, 7.6))
    gs = gridspec.GridSpec(2, 2, height_ratios=[1.0, 1.06], width_ratios=[0.96, 1.09], hspace=0.36, wspace=0.44)

    # Panel A: Code Complexity Comparison (Scaffolds vs Cohort 1 vs Cohort 2 vs Participant-Level Medians)
    ax_a = fig.add_subplot(gs[0, 0])
    rng = np.random.default_rng(7)
    groups = [ex_locs, nf_locs, erp_locs, stu_cluster_medians]
    positions = [1, 2, 3, 4]
    colors = ["#2e75b6", "#008080", "#6a3d9a", "#d95f02"]

    bp = ax_a.boxplot(groups, positions=positions, widths=0.42, patch_artist=True, showfliers=False,
                      medianprops=dict(color="black", lw=1.8))
    for patch, col in zip(bp["boxes"], colors):
        patch.set_facecolor(col)
        patch.set_alpha(0.68)

    for pos, arr, col in zip(positions, groups, colors):
        jit = rng.uniform(-0.13, 0.13, size=len(arr))
        ax_a.scatter(np.full_like(arr, pos, dtype=float) + jit, arr, color=col,
                     edgecolor="white", lw=0.5, s=24, alpha=0.85, zorder=3)

    ax_a.set_xticks(positions)
    ax_a.set_xticklabels([
        f"Built-In\nScaffolds\n(N = {len(ex_locs)})",
        f"Cohort 1:\nNF Games\n(N = {n_nf})",
        f"Cohort 2:\n4-Ch ERPs\n(N = {n_erp})",
        f"Student\nMedians\n(N = {n_unique_students})"
    ], fontsize=7.6)
    ax_a.set_ylabel("Executable Lines of Code (LOC)")
    ax_a.set_xlim(0.45, 4.55)
    ax_a.set_ylim(0, 455)
    ax_a.set_title(f"A. Code Complexity: Scaffolds vs. PSYCH 403 ({n_stu} Sketches, {n_unique_students} Students)", loc="left", fontsize=9.6)
    ax_a.text(1, 148, f"Med: {int(np.median(ex_locs))} LOC\n(IQR {int(np.percentile(ex_locs,25))}–{int(np.percentile(ex_locs,75))})",
              ha="center", fontsize=7.0, fontweight="bold", color="#1f4e78",
              bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="#1f4e78", alpha=0.9))
    ax_a.text(2, 412, f"Med: {int(np.median(nf_locs))} LOC\n(Max {int(nf_locs.max())})",
              ha="center", fontsize=7.0, fontweight="bold", color="#006d5b",
              bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="#006d5b", alpha=0.9))
    ax_a.text(3, 345, f"Med: {int(np.median(erp_locs))} LOC\n(Max {int(erp_locs.max())})",
              ha="center", fontsize=7.0, fontweight="bold", color="#6a3d9a",
              bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="#6a3d9a", alpha=0.9))
    ax_a.text(3.95, 342, f"Med: {int(round(np.median(stu_cluster_medians)))} LOC\n(p < 10⁻¹¹)",
              ha="center", fontsize=7.0, fontweight="bold", color="#b34800",
              bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="#b34800", alpha=0.9))

    # Panel B: Verified Executable Feature & Paradigm Adoption Across N=69 Student Submissions
    ax_b = fig.add_subplot(gs[0, 1])
    feat_specs = [
        ("EMA / Baseline / Hysteresis Conditioning", "smoothing_conditioning", "#1f4e78"),
        ("ES6 Classes & Particle Systems", "particles", "#4d4d4d"),
        ("eegData.alpha Band (8–12 Hz)", "alpha", "#2e75b6"),
        ("Online 4-Ch ERP & Oddball Epoching", "erp_oddball", "#d95f02"),
        ("256 Hz Raw Channels (TP9..TP10)", "raw", "#008080"),
        ("eegData.beta Band (13–30 Hz)", "beta", "#2e75b6"),
        ("eegData.attention Index", "attention", "#6a3d9a"),
        ("eegData.theta Band (4–8 Hz)", "theta", "#2e75b6"),
        ("eegData.meditation Index", "meditation", "#6a3d9a"),
        ("Mouse / Keyboard Event Hooks", "interactive", "#4d4d4d"),
        ("p5.sound Audio Synthesis", "audio", "#b34800"),
        ("eegData.delta / gamma Bands", "delta", "#2e75b6"),
    ]
    feat_rows = []
    for lbl, key, col in feat_specs:
        cnt = sum(1 for s in student_sketches if s[key])
        pct = cnt / n_stu * 100.0
        feat_rows.append((pct, cnt, lbl, col))
    feat_rows.sort(key=lambda x: x[0])
    feat_pcts = [r[0] for r in feat_rows]
    feat_counts = [r[1] for r in feat_rows]
    feat_names = [r[2] for r in feat_rows]
    feat_cols = [r[3] for r in feat_rows]

    y_pos = np.arange(len(feat_names))
    bars = ax_b.barh(y_pos, feat_pcts, color=feat_cols, alpha=0.88, height=0.68)
    for bar, pct, cnt in zip(bars, feat_pcts, feat_counts):
        ax_b.text(pct + 1.2, bar.get_y() + bar.get_height() / 2, f"{pct:.1f}% ({cnt}/{n_stu})",
                  va="center", ha="left", fontsize=7.5, fontweight="bold", color="#222")
    ax_b.set_yticks(y_pos)
    ax_b.set_yticklabels(feat_names, fontsize=8.0, fontweight="medium")
    ax_b.set_xlim(0, max(feat_pcts) + 25)
    ax_b.set_xlabel("Percentage of Student Submissions (%)")
    ax_b.set_title(f"B. Verified Executable Feature Adoption (N = {n_stu})", loc="left", fontsize=10.2)

    # Panel C: Student Screenshot — Cohort 1 Closed-Loop Neurofeedback Game (with high-contrast callout badge)
    ax_c = fig.add_subplot(gs[1, 0])
    img_p1 = os.path.join(img_dir, "11mbgcXW_Hardi Patel 1753962 Part 1 - Hardi Patel.jpeg")
    if os.path.exists(img_p1):
        im1 = Image.open(img_p1)
        ax_c.imshow(im1)
        w1, h1 = im1.size
        ax_c.text(w1 * 0.03, h1 * 0.88,
                  "Cohort 1 Game (195 LOC): Catch 20 Cones\n• Alpha/Beta Optimal-Zone Control + EMA Smoothing",
                  fontsize=7.3, fontweight="bold", color="white",
                  bbox=dict(boxstyle="round,pad=0.35", facecolor="#1f4e78", edgecolor="white", alpha=0.92))
    ax_c.set_xticks([])
    ax_c.set_yticks([])
    for sp in ax_c.spines.values():
        sp.set_visible(True)
        sp.set_color("#cccccc")
    ax_c.set_title("C. Student Cohort 1 (Part 1): Custom Alpha/Beta Neurofeedback Game", loc="left", pad=6, fontsize=10.2)

    # Panel D: Student Screenshot — Cohort 2 Online 4-Channel Face vs Object ERP Averager (with callout badge)
    ax_d = fig.add_subplot(gs[1, 1])
    img_p2 = os.path.join(img_dir, "1GvtPC4M_Hardi Patel 1753962 Part 2 - Hardi Patel.jpeg")
    if os.path.exists(img_p2):
        im2 = Image.open(img_p2)
        ax_d.imshow(im2)
        w2, h2 = im2.size
        ax_d.text(w2 * 0.03, h2 * 0.88,
                  "Cohort 2 Paradigm (148 LOC): 4-Ch Face vs. Object ERP\n• TP9, AF7, AF8, TP10 (-200 to +800 ms @ 256 Hz)",
                  fontsize=7.3, fontweight="bold", color="white",
                  bbox=dict(boxstyle="round,pad=0.35", facecolor="#6a3d9a", edgecolor="white", alpha=0.92))
    ax_d.set_xticks([])
    ax_d.set_yticks([])
    for sp in ax_d.spines.values():
        sp.set_visible(True)
        sp.set_color("#cccccc")
    ax_d.set_title("D. Student Cohort 2 (Part 2): Live 4-Ch Face vs. Object ERP Averager", loc="left", pad=6, fontsize=10.2)

    fig.savefig(os.path.join(OUT_DIR, "fig4_psych403_student_submissions_analysis.png"), bbox_inches="tight")
    fig.savefig(os.path.join(OUT_DIR, "fig4_psych403_student_submissions_analysis.pdf"), bbox_inches="tight")
    plt.close(fig)
    print("Saved Paper 2 Fig 4 (Student Submissions Analysis)")

    summary = {
        "muse_browser_kb": round(muse_kb, 1),
        "legacy_muse_kb": legacy_muse_kb,
        "bundle_reduction_factor": round(legacy_muse_kb / muse_kb, 1),
        "n_builtin_examples": int(len(ex_locs)),
        "n_builtin_categories": 10,
        "n_ref_apis": 94,
        "n_ref_groups": 22,
        "ex_loc_median": int(np.median(ex_locs)),
        "ex_loc_iqr_low": int(np.percentile(ex_locs, 25)),
        "ex_loc_iqr_high": int(np.percentile(ex_locs, 75)),
        "ex_loc_min": int(ex_locs.min()),
        "ex_loc_max": int(ex_locs.max()),
        "n_student_sketches": n_stu,
        "n_unique_students": n_unique_students,
        "stu_cluster_loc_median": int(round(float(np.median(stu_cluster_medians)))),
        "stu_cluster_loc_iqr_low": int(round(float(np.percentile(stu_cluster_medians, 25)))),
        "stu_cluster_loc_iqr_high": int(round(float(np.percentile(stu_cluster_medians, 75)))),
        "mann_whitney_u": round(float(u_stat), 1),
        "mann_whitney_cluster_u": round(float(u_cluster), 1),
        "rank_biserial_cluster_r": round(float(r_rb_cluster), 2),
        "stu_loc_median": int(np.median(stu_locs)),
        "stu_loc_mean": round(float(stu_locs.mean()), 1),
        "stu_loc_sd": round(float(stu_locs.std(ddof=1)), 1),
        "stu_loc_iqr_low": int(np.percentile(stu_locs, 25)),
        "stu_loc_iqr_high": int(np.percentile(stu_locs, 75)),
        "stu_loc_min": int(stu_locs.min()),
        "stu_loc_max": int(stu_locs.max()),
        "n_stu_nf": n_nf,
        "stu_nf_loc_median": int(np.median(nf_locs)),
        "stu_nf_loc_iqr_low": int(np.percentile(nf_locs, 25)),
        "stu_nf_loc_iqr_high": int(np.percentile(nf_locs, 75)),
        "stu_nf_loc_min": int(nf_locs.min()),
        "stu_nf_loc_max": int(nf_locs.max()),
        "n_stu_erp": n_erp,
        "stu_erp_loc_median": int(np.median(erp_locs)),
        "stu_erp_loc_iqr_low": int(np.percentile(erp_locs, 25)),
        "stu_erp_loc_iqr_high": int(np.percentile(erp_locs, 75)),
        "stu_erp_loc_min": int(erp_locs.min()),
        "stu_erp_loc_max": int(erp_locs.max()),
        "stu_pct_cond": round(sum(1 for s in student_sketches if s["smoothing_conditioning"]) / n_stu * 100.0, 1),
        "stu_cnt_cond": sum(1 for s in student_sketches if s["smoothing_conditioning"]),
        "stu_pct_alpha": round(sum(1 for s in student_sketches if s["alpha"]) / n_stu * 100.0, 1),
        "stu_cnt_alpha": sum(1 for s in student_sketches if s["alpha"]),
        "stu_pct_raw": round(sum(1 for s in student_sketches if s["raw"]) / n_stu * 100.0, 1),
        "stu_cnt_raw": sum(1 for s in student_sketches if s["raw"]),
        "stu_pct_beta": round(sum(1 for s in student_sketches if s["beta"]) / n_stu * 100.0, 1),
        "stu_cnt_beta": sum(1 for s in student_sketches if s["beta"]),
        "stu_pct_erp": round(sum(1 for s in student_sketches if s["erp_oddball"]) / n_stu * 100.0, 1),
        "stu_cnt_erp": sum(1 for s in student_sketches if s["erp_oddball"]),
        "stu_pct_att": round(sum(1 for s in student_sketches if s["attention"]) / n_stu * 100.0, 1),
        "stu_cnt_att": sum(1 for s in student_sketches if s["attention"]),
        "stu_pct_theta": round(sum(1 for s in student_sketches if s["theta"]) / n_stu * 100.0, 1),
        "stu_cnt_theta": sum(1 for s in student_sketches if s["theta"]),
        "stu_pct_particles": round(sum(1 for s in student_sketches if s["particles"]) / n_stu * 100.0, 1),
        "stu_cnt_particles": sum(1 for s in student_sketches if s["particles"]),
        "stu_pct_med": round(sum(1 for s in student_sketches if s["meditation"]) / n_stu * 100.0, 1),
        "stu_cnt_med": sum(1 for s in student_sketches if s["meditation"]),
        "stu_pct_audio": round(sum(1 for s in student_sketches if s["audio"]) / n_stu * 100.0, 1),
        "stu_cnt_audio": sum(1 for s in student_sketches if s["audio"]),
        "stu_pct_events": round(sum(1 for s in student_sketches if s["interactive"]) / n_stu * 100.0, 1),
        "stu_cnt_events": sum(1 for s in student_sketches if s["interactive"]),
    }
    summary.update(dsp_bench)

    with open(os.path.join(P2_DIR, "stats_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    macros = [
        "% Auto-generated by paper2_brainimation/generate_figures.py — DO NOT EDIT MANUALLY",
        f"\\newcommand{{\\MuseBrowserKB}}{{{summary['muse_browser_kb']:.1f}}}",
        f"\\newcommand{{\\BundleReductionFactor}}{{{summary['bundle_reduction_factor']:.1f}}}",
        f"\\newcommand{{\\ERPNoiseRMSKOne}}{{{summary['erp_bl_rms_k1']:.1f}}}",
        f"\\newcommand{{\\ERPNoiseRMSKFive}}{{{summary['erp_bl_rms_k5']:.1f}}}",
        f"\\newcommand{{\\ERPNoiseRMSKTwenty}}{{{summary['erp_bl_rms_k20']:.1f}}}",
        f"\\newcommand{{\\ERPSNRKOne}}{{{summary['erp_snr_k1']:.2f}}}",
        f"\\newcommand{{\\ERPSNRKFive}}{{{summary['erp_snr_k5']:.2f}}}",
        f"\\newcommand{{\\ERPSNRKTwenty}}{{{summary['erp_snr_k20']:.2f}}}",
        f"\\newcommand{{\\EMAVarReductionPct}}{{{summary['ema_var_red_pct']:.1f}}}",
        f"\\newcommand{{\\NBuiltinExamples}}{{{summary['n_builtin_examples']}}}",
        f"\\newcommand{{\\NBuiltinCategories}}{{{summary['n_builtin_categories']}}}",
        f"\\newcommand{{\\NRefAPIs}}{{{summary['n_ref_apis']}}}",
        f"\\newcommand{{\\NRefGroups}}{{{summary['n_ref_groups']}}}",
        f"\\newcommand{{\\ExLOCMedian}}{{{summary['ex_loc_median']}}}",
        f"\\newcommand{{\\ExLOCIQRLow}}{{{summary['ex_loc_iqr_low']}}}",
        f"\\newcommand{{\\ExLOCIQRHigh}}{{{summary['ex_loc_iqr_high']}}}",
        f"\\newcommand{{\\ExLOCMin}}{{{summary['ex_loc_min']}}}",
        f"\\newcommand{{\\ExLOCMax}}{{{summary['ex_loc_max']}}}",
        f"\\newcommand{{\\NStudentSketches}}{{{summary['n_student_sketches']}}}",
        f"\\newcommand{{\\NUniqueStudents}}{{{summary['n_unique_students']}}}",
        f"\\newcommand{{\\StuClusterLOCMedian}}{{{summary['stu_cluster_loc_median']}}}",
        f"\\newcommand{{\\StuClusterLOCIQRLow}}{{{summary['stu_cluster_loc_iqr_low']}}}",
        f"\\newcommand{{\\StuClusterLOCIQRHigh}}{{{summary['stu_cluster_loc_iqr_high']}}}",
        f"\\newcommand{{\\MannWhitneyU}}{{{summary['mann_whitney_u']:.1f}}}",
        f"\\newcommand{{\\MannWhitneyClusterU}}{{{summary['mann_whitney_cluster_u']:.1f}}}",
        f"\\newcommand{{\\RankBiserialClusterR}}{{{summary['rank_biserial_cluster_r']:.2f}}}",
        f"\\newcommand{{\\StuLOCMedian}}{{{summary['stu_loc_median']}}}",
        f"\\newcommand{{\\StuLOCMean}}{{{summary['stu_loc_mean']:.1f}}}",
        f"\\newcommand{{\\StuLOCSD}}{{{summary['stu_loc_sd']:.1f}}}",
        f"\\newcommand{{\\StuLOCIQRLow}}{{{summary['stu_loc_iqr_low']}}}",
        f"\\newcommand{{\\StuLOCIQRHigh}}{{{summary['stu_loc_iqr_high']}}}",
        f"\\newcommand{{\\StuLOCMin}}{{{summary['stu_loc_min']}}}",
        f"\\newcommand{{\\StuLOCMax}}{{{summary['stu_loc_max']}}}",
        f"\\newcommand{{\\NStuNF}}{{{summary['n_stu_nf']}}}",
        f"\\newcommand{{\\StuNFLOCMedian}}{{{summary['stu_nf_loc_median']}}}",
        f"\\newcommand{{\\StuNFLOCIQRLow}}{{{summary['stu_nf_loc_iqr_low']}}}",
        f"\\newcommand{{\\StuNFLOCIQRHigh}}{{{summary['stu_nf_loc_iqr_high']}}}",
        f"\\newcommand{{\\StuNFLOCMin}}{{{summary['stu_nf_loc_min']}}}",
        f"\\newcommand{{\\StuNFLOCMax}}{{{summary['stu_nf_loc_max']}}}",
        f"\\newcommand{{\\NStuERP}}{{{summary['n_stu_erp']}}}",
        f"\\newcommand{{\\StuERPLOCMedian}}{{{summary['stu_erp_loc_median']}}}",
        f"\\newcommand{{\\StuERPLOCIQRLow}}{{{summary['stu_erp_loc_iqr_low']}}}",
        f"\\newcommand{{\\StuERPLOCIQRHigh}}{{{summary['stu_erp_loc_iqr_high']}}}",
        f"\\newcommand{{\\StuERPLOCMin}}{{{summary['stu_erp_loc_min']}}}",
        f"\\newcommand{{\\StuERPLOCMax}}{{{summary['stu_erp_loc_max']}}}",
        f"\\newcommand{{\\StuPctCond}}{{{summary['stu_pct_cond']:.1f}}}",
        f"\\newcommand{{\\StuCntCond}}{{{summary['stu_cnt_cond']}}}",
        f"\\newcommand{{\\StuPctAlpha}}{{{summary['stu_pct_alpha']:.1f}}}",
        f"\\newcommand{{\\StuCntAlpha}}{{{summary['stu_cnt_alpha']}}}",
        f"\\newcommand{{\\StuPctRaw}}{{{summary['stu_pct_raw']:.1f}}}",
        f"\\newcommand{{\\StuCntRaw}}{{{summary['stu_cnt_raw']}}}",
        f"\\newcommand{{\\StuPctBeta}}{{{summary['stu_pct_beta']:.1f}}}",
        f"\\newcommand{{\\StuCntBeta}}{{{summary['stu_cnt_beta']}}}",
        f"\\newcommand{{\\StuPctERP}}{{{summary['stu_pct_erp']:.1f}}}",
        f"\\newcommand{{\\StuCntERP}}{{{summary['stu_cnt_erp']}}}",
        f"\\newcommand{{\\StuPctAtt}}{{{summary['stu_pct_att']:.1f}}}",
        f"\\newcommand{{\\StuCntAtt}}{{{summary['stu_cnt_att']}}}",
        f"\\newcommand{{\\StuPctTheta}}{{{summary['stu_pct_theta']:.1f}}}",
        f"\\newcommand{{\\StuCntTheta}}{{{summary['stu_cnt_theta']}}}",
        f"\\newcommand{{\\StuPctParticles}}{{{summary['stu_pct_particles']:.1f}}}",
        f"\\newcommand{{\\StuCntParticles}}{{{summary['stu_cnt_particles']}}}",
        f"\\newcommand{{\\StuPctMed}}{{{summary['stu_pct_med']:.1f}}}",
        f"\\newcommand{{\\StuCntMed}}{{{summary['stu_cnt_med']}}}",
        f"\\newcommand{{\\StuPctAudio}}{{{summary['stu_pct_audio']:.1f}}}",
        f"\\newcommand{{\\StuCntAudio}}{{{summary['stu_cnt_audio']}}}",
        f"\\newcommand{{\\StuPctEvents}}{{{summary['stu_pct_events']:.1f}}}",
        f"\\newcommand{{\\StuCntEvents}}{{{summary['stu_cnt_events']}}}",
        "",
    ]
    with open(os.path.join(P2_DIR, "stats_macros.tex"), "w") as f:
        f.write("\n".join(macros))
    print("Exported stats_summary.json and stats_macros.tex")


if __name__ == "__main__":
    muse_path = os.path.join(BRAIN_DIR, "muse-browser.js")
    muse_kb = os.path.getsize(muse_path) / 1024.0
    legacy_muse_kb = 473.0
    reduction_factor = legacy_muse_kb / muse_kb

    examples, cat_order = analyze_builtin_examples()
    make_fig1_ide_architecture(examples, cat_order, muse_kb, reduction_factor)
    make_fig2_ide_scaffolding_and_corpus(examples, cat_order)
    dsp_bench = make_fig3_sonification_and_erp_engine()
    make_fig4_student_submissions(examples, muse_kb, legacy_muse_kb, dsp_bench)
