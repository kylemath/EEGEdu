#!/usr/bin/env python3
"""
Master End-to-End Automated Pipeline for Paper 1 (EEGEdu) and Paper 2 (BrainImation & BrainGames).

Executes in one reproducible iterative loop:
  Stage 1 & 2: Empirical data analysis, DSP/ML benchmarks, student corpus AST/regex analysis,
               CSV table export, JSON stats summary export, dynamic LaTeX macro generation
               (stats_macros.tex), and vector PDF + 300 DPI PNG figure generation.
  Stage 3:     Full LaTeX + BibTeX compilation (pdflatex -> bibtex -> pdflatex -> pdflatex)
               producing paper1_eegedu/paper1_eegedu.pdf and paper2_brainimation/paper2_brainimation.pdf.
  Stage 4:     Automated verification of LaTeX logs, BibTeX warnings, undefined references,
               and 150 DPI page-by-page PNG rendering via pdftoppm for visual QA.
"""
import os
import sys
import json
import shutil
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
P1_DIR = os.path.join(BASE_DIR, "paper1_eegedu")
P2_DIR = os.path.join(BASE_DIR, "paper2_brainimation")
PDFLATEX = shutil.which("pdflatex") or "/Library/TeX/texbin/pdflatex"
BIBTEX = shutil.which("bibtex") or "/Library/TeX/texbin/bibtex"
PDFTOPPM = shutil.which("pdftoppm")
GHOSTSCRIPT = shutil.which("gs") or "/opt/homebrew/bin/gs"


def run_step(cmd, cwd=BASE_DIR, desc=""):
    print(f"  -> {desc}: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
    if res.returncode != 0:
        print(f"[ERROR] Command failed (exit {res.returncode}):\n{res.stdout[-2000:]}")
        sys.exit(res.returncode)
    return res.stdout


def compile_latex(paper_dir, tex_stem):
    """Run full pdflatex -> bibtex -> pdflatex -> pdflatex cycle and check logs."""
    run_step([PDFLATEX, "-interaction=nonstopmode", "-halt-on-error", f"{tex_stem}.tex"],
             cwd=paper_dir, desc=f"pdflatex pass 1 ({tex_stem})")
    run_step([BIBTEX, tex_stem],
             cwd=paper_dir, desc=f"bibtex ({tex_stem})")
    run_step([PDFLATEX, "-interaction=nonstopmode", "-halt-on-error", f"{tex_stem}.tex"],
             cwd=paper_dir, desc=f"pdflatex pass 2 ({tex_stem})")
    out = run_step([PDFLATEX, "-interaction=nonstopmode", "-halt-on-error", f"{tex_stem}.tex"],
                   cwd=paper_dir, desc=f"pdflatex pass 3 ({tex_stem})")

    # Verify log for undefined references or citations
    log_path = os.path.join(paper_dir, f"{tex_stem}.log")
    log_txt = open(log_path, "r", errors="ignore").read()
    undef_refs = [ln for ln in log_txt.splitlines() if "Undefined" in ln or "undefined" in ln]
    if undef_refs:
        print(f"  [WARN] Undefined references/citations in {tex_stem}.log:\n    " + "\n    ".join(undef_refs))
    else:
        print(f"  [OK] Zero undefined references or citations in {tex_stem}.pdf")

    # Render PDF pages to PNG for visual inspection
    pages_dir = os.path.join(paper_dir, "pdf_pages")
    os.makedirs(pages_dir, exist_ok=True)
    for old_png in os.listdir(pages_dir):
        if old_png.endswith(".png"):
            os.remove(os.path.join(pages_dir, old_png))
    if PDFTOPPM and os.path.exists(PDFTOPPM):
        run_step([PDFTOPPM, "-png", "-r", "150", f"{tex_stem}.pdf", os.path.join(pages_dir, "page")],
                 cwd=paper_dir, desc=f"Render {tex_stem}.pdf pages to PNG")
    else:
        run_step([GHOSTSCRIPT, "-dNOPAUSE", "-dBATCH", "-sDEVICE=png16m", "-r150",
                  f"-sOutputFile={os.path.join(pages_dir, 'page-%02d.png')}", f"{tex_stem}.pdf"],
                 cwd=paper_dir, desc=f"Render {tex_stem}.pdf pages to PNG (gs)")
    rendered = sorted([f for f in os.listdir(pages_dir) if f.endswith(".png")])
    print(f"  [OK] Rendered {len(rendered)} pages for {tex_stem}.pdf -> {pages_dir}/")
    return len(rendered)


def ensure_repos():
    repos_dir = os.path.join(BASE_DIR, "repos")
    os.makedirs(repos_dir, exist_ok=True)
    for name in ["EEGEdu", "Brainimation"]:
        target = os.path.join(repos_dir, name)
        if not os.path.exists(target):
            run_step(["git", "clone", "--depth", "1", f"https://github.com/kylemath/{name}.git", target],
                     cwd=BASE_DIR, desc=f"Clone kylemath/{name}")


def main():
    t0 = time.time()
    print("=" * 78)
    print("STARTING END-TO-END AUTOMATED EXPERIMENT, FIGURE, STATS & LATEX PDF PIPELINE")
    print("=" * 78)

    ensure_repos()

    print("\n[Stage 1 & 2] Running Paper 1 & Paper 2 Experiments, Stats, Macros, and Figures...")
    run_step([sys.executable, os.path.join(P1_DIR, "generate_figures.py")],
             cwd=P1_DIR, desc="Paper 1 (EEGEdu) Analysis + Figures 1-5 + Macros")
    run_step([sys.executable, os.path.join(P2_DIR, "generate_figures.py")],
             cwd=P2_DIR, desc="Paper 2 (BrainImation) Analysis + Figures 1-4 + Macros")

    print("\n[Stage 3 & 4] Compiling LaTeX Manuscripts and Rendering PDF Pages...")
    p1_pages = compile_latex(P1_DIR, "paper1_eegedu")
    p2_pages = compile_latex(P2_DIR, "paper2_brainimation")

    p1_stats = json.load(open(os.path.join(P1_DIR, "stats_summary.json")))
    p2_stats = json.load(open(os.path.join(P2_DIR, "stats_summary.json")))

    elapsed = time.time() - t0
    print("\n" + "=" * 78)
    print(f"PIPELINE COMPLETED SUCCESSFULLY IN {elapsed:.1f} SECONDS")
    print(f"  • Paper 1 PDF: {os.path.join(P1_DIR, 'paper1_eegedu.pdf')} ({p1_pages} pages)")
    print(f"    - N = {p1_stats['n_alpha_complete']} complete 4-condition Berger alpha students, "
          f"Temporal t = {p1_stats['temp_alpha_t']} (p = {p1_stats['temp_alpha_p']})")
    print(f"    - KNN BCI Classifier 5-Fold CV AUC = {p1_stats['bci_knn_alpha_auc']} (Acc = {p1_stats['bci_knn_alpha_acc']}%)")
    print(f"  • Paper 2 PDF: {os.path.join(P2_DIR, 'paper2_brainimation.pdf')} ({p2_pages} pages)")
    print(f"    - N = {p2_stats['n_builtin_examples']} built-in scaffold sketches across {p2_stats['n_builtin_categories']} categories "
          f"(median = {p2_stats['ex_loc_median']} LOC) + {p2_stats['n_ref_apis']} reference APIs")
    print(f"    - N = {p2_stats['n_student_sketches']} PSYCH 403 student submissions "
          f"(median = {p2_stats['stu_loc_median']} LOC: {p2_stats['n_stu_nf']} neurofeedback/games, {p2_stats['n_stu_erp']} online ERPs)")
    print("=" * 78)


if __name__ == "__main__":
    main()
