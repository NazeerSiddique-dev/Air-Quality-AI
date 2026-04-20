"""
=============================================================
 Step 4 – Model Report Generator
=============================================================
 Reads logs/metrics.json (written by 02_train.py) and prints
 a structured summary plus generates a matplotlib report PNG.

 Usage:
   python3 04_report.py
=============================================================
"""

import json
import os
import sys
import glob
from datetime import datetime

METRICS_JSON = "/home/nazeer/DDM/hadoop_work/spark_pipeline/logs/metrics.json"
LOG_DIR      = "/home/nazeer/DDM/hadoop_work/spark_pipeline/logs"
REPORT_OUT   = "/home/nazeer/DDM/hadoop_work/spark_pipeline/logs/report.txt"

# ─────────────────────────────────────────────────────────────
# Text Report
# ─────────────────────────────────────────────────────────────

def print_separator(char="═", width=62):
    print(char * width)

def load_metrics():
    if not os.path.exists(METRICS_JSON):
        print(f"❌  metrics.json not found at {METRICS_JSON}")
        print("    Run 02_train.py first to generate it.")
        sys.exit(1)
    with open(METRICS_JSON) as f:
        return json.load(f)


def print_report(data: dict):
    ts   = data.get("run_timestamp", "N/A")
    mode = data.get("mode", "local").upper()
    ds   = data.get("dataset", {})
    models = data.get("models", {})
    winner = data.get("winner", "N/A")
    pipe_time = data.get("total_pipeline_time_sec", "N/A")

    lines = []
    def p(line=""):
        print(line)
        lines.append(line)

    p()
    p("═" * 62)
    p("        AIR QUALITY SPARK ML PIPELINE – RUN REPORT")
    p("═" * 62)
    p(f"  Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    p(f"  Run at    : {ts}")
    p(f"  Mode      : {mode}")
    p()
    p("  DATASET SUMMARY")
    p("  " + "─" * 58)
    p(f"  {'Total rows':<22}: {ds.get('total_rows', 'N/A')}")
    p(f"  {'Training rows':<22}: {ds.get('train_rows', 'N/A')}")
    p(f"  {'Test rows':<22}: {ds.get('test_rows', 'N/A')}")
    p(f"  {'Target variable':<22}: {ds.get('target', 'N/A')}")
    p(f"  {'Cross-val folds':<22}: {ds.get('cv_folds', 'N/A')}")
    p(f"  {'Feature count':<22}: {len(ds.get('features', []))}")
    p(f"  {'Features':<22}: {', '.join(ds.get('features', []))}")
    p()
    p("  MODEL PERFORMANCE COMPARISON")
    p("  " + "─" * 58)
    p(f"  {'Metric':<10} {'Linear Regression':>20} {'Random Forest':>16}  Winner")
    p("  " + "─" * 55)
    for metric, higher_better in [("rmse", False), ("mae", False), ("r2", True)]:
        lv = models.get("LinearRegression", {}).get(metric, float("nan"))
        rv = models.get("RandomForestRegressor", {}).get(metric, float("nan"))
        if higher_better:
            badge = "RF ✓" if rv > lv else "LR ✓"
        else:
            badge = "RF ✓" if rv < lv else "LR ✓"
        p(f"  {metric.upper():<10} {lv:>20.4f} {rv:>16.4f}  {badge}")

    lr_t = models.get("LinearRegression",      {}).get("train_time_sec", "N/A")
    rf_t = models.get("RandomForestRegressor",  {}).get("train_time_sec", "N/A")
    p(f"  {'Train (s)':<10} {str(lr_t):>20} {str(rf_t):>16}")
    p()
    p(f"  🏆  WINNER: {winner}")
    if pipe_time != "N/A":
        p(f"  ⏱   Total pipeline time: {pipe_time}s")
    p()

    # Log files summary
    log_files = sorted(glob.glob(os.path.join(LOG_DIR, "*.log")))
    if log_files:
        p("  LOG FILES")
        p("  " + "─" * 58)
        for lf in log_files:
            size = os.path.getsize(lf)
            mtime = datetime.fromtimestamp(os.path.getmtime(lf)).strftime("%Y-%m-%d %H:%M")
            p(f"  {os.path.basename(lf):<40} {size:>8} B  {mtime}")
        p()

    p("═" * 62)

    # Write to file
    with open(REPORT_OUT, "w") as f:
        f.write("\n".join(lines))
    print(f"\n📄  Report also saved to: {REPORT_OUT}")


# ─────────────────────────────────────────────────────────────
# Visualization (matplotlib)
# ─────────────────────────────────────────────────────────────

def generate_charts(data: dict):
    try:
        import matplotlib
        matplotlib.use("Agg")      # non-interactive backend
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches
        import numpy as np
    except ImportError:
        print("⚠️  matplotlib not installed – skipping charts.")
        print("   Install with: pip install matplotlib")
        return

    models  = data["models"]
    lr_m    = models["LinearRegression"]
    rf_m    = models["RandomForestRegressor"]
    winner  = data["winner"]

    # ── Colour palette ──────────────────────────────────────
    CLR_LR  = "#6C91C2"   # steel blue
    CLR_RF  = "#4CB944"   # emerald
    CLR_BG  = "#1a1a2e"   # dark bg
    CLR_AX  = "#e0e0e0"

    fig = plt.figure(figsize=(16, 10), facecolor=CLR_BG)
    fig.suptitle(
        "Air Quality Spark ML Pipeline – Model Report",
        fontsize=18, color="white", fontweight="bold", y=0.97
    )

    # ── Grid: 2 rows × 3 cols ───────────────────────────────
    gs = fig.add_gridspec(2, 3, hspace=0.45, wspace=0.35,
                          left=0.07, right=0.96, top=0.90, bottom=0.08)

    def styled_ax(ax, title):
        ax.set_facecolor("#16213e")
        ax.tick_params(colors=CLR_AX, labelsize=9)
        for spine in ax.spines.values():
            spine.set_color("#334466")
        ax.set_title(title, color="white", fontsize=11, pad=8)
        return ax

    model_names = ["Linear Reg", "Random Forest"]
    colors      = [CLR_LR, CLR_RF]

    # 1. RMSE bar
    ax1 = styled_ax(fig.add_subplot(gs[0, 0]), "RMSE  (lower is better)")
    vals = [lr_m["rmse"], rf_m["rmse"]]
    bars = ax1.bar(model_names, vals, color=colors, width=0.5, edgecolor="#ffffff22")
    for bar, v in zip(bars, vals):
        ax1.text(bar.get_x() + bar.get_width()/2, v + 0.005,
                 f"{v:.4f}", ha="center", va="bottom", color="white", fontsize=10, fontweight="bold")
    ax1.set_ylim(0, max(vals) * 1.25)
    ax1.set_ylabel("RMSE", color=CLR_AX)

    # 2. MAE bar
    ax2 = styled_ax(fig.add_subplot(gs[0, 1]), "MAE  (lower is better)")
    vals = [lr_m["mae"], rf_m["mae"]]
    bars = ax2.bar(model_names, vals, color=colors, width=0.5, edgecolor="#ffffff22")
    for bar, v in zip(bars, vals):
        ax2.text(bar.get_x() + bar.get_width()/2, v + 0.002,
                 f"{v:.4f}", ha="center", va="bottom", color="white", fontsize=10, fontweight="bold")
    ax2.set_ylim(0, max(vals) * 1.25)
    ax2.set_ylabel("MAE", color=CLR_AX)

    # 3. R² bar
    ax3 = styled_ax(fig.add_subplot(gs[0, 2]), "R²  (higher is better)")
    vals = [lr_m["r2"], rf_m["r2"]]
    bars = ax3.bar(model_names, vals, color=colors, width=0.5, edgecolor="#ffffff22")
    for bar, v in zip(bars, vals):
        ax3.text(bar.get_x() + bar.get_width()/2, v + 0.003,
                 f"{v:.4f}", ha="center", va="bottom", color="white", fontsize=10, fontweight="bold")
    ax3.set_ylim(0, 1.1)
    ax3.set_ylabel("R²", color=CLR_AX)

    # 4. Training time bar
    ax4 = styled_ax(fig.add_subplot(gs[1, 0]), "Training Time (seconds)")
    lr_t = lr_m.get("train_time_sec", 0)
    rf_t = rf_m.get("train_time_sec", 0)
    vals = [lr_t, rf_t]
    bars = ax4.bar(model_names, vals, color=colors, width=0.5, edgecolor="#ffffff22")
    for bar, v in zip(bars, vals):
        ax4.text(bar.get_x() + bar.get_width()/2, v + 0.5,
                 f"{v:.1f}s", ha="center", va="bottom", color="white", fontsize=10, fontweight="bold")
    ax4.set_ylim(0, max(vals) * 1.3)
    ax4.set_ylabel("Seconds", color=CLR_AX)

    # 5. Radar / spider chart (all-in-one normalised view)
    ax5 = styled_ax(fig.add_subplot(gs[1, 1], polar=True), "Normalised Performance Radar")
    ax5.set_facecolor("#16213e")
    metrics_radar = ["R²", "1-RMSE\n(norm)", "1-MAE\n(norm)"]
    # normalise: use 1 - (val/max) for error metrics
    max_rmse = max(lr_m["rmse"], rf_m["rmse"])
    max_mae  = max(lr_m["mae"],  rf_m["mae"])
    lr_vals_r  = [lr_m["r2"], 1 - lr_m["rmse"]/max_rmse, 1 - lr_m["mae"]/max_mae]
    rf_vals_r  = [rf_m["r2"], 1 - rf_m["rmse"]/max_rmse, 1 - rf_m["mae"]/max_mae]
    N = len(metrics_radar)
    angles = [n / float(N) * 2 * 3.14159 for n in range(N)]
    angles += angles[:1]
    lr_vals_r += lr_vals_r[:1]
    rf_vals_r += rf_vals_r[:1]
    ax5.plot(angles, lr_vals_r, "o-", color=CLR_LR, linewidth=2, label="Linear Reg")
    ax5.fill(angles, lr_vals_r, color=CLR_LR, alpha=0.15)
    ax5.plot(angles, rf_vals_r, "o-", color=CLR_RF, linewidth=2, label="Random Forest")
    ax5.fill(angles, rf_vals_r, color=CLR_RF, alpha=0.15)
    ax5.set_xticks(angles[:-1])
    ax5.set_xticklabels(metrics_radar, color="white", fontsize=9)
    ax5.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax5.tick_params(colors=CLR_AX)
    ax5.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1),
               facecolor="#1a1a2e", labelcolor="white", fontsize=9)

    # 6. Dataset stats info box
    ax6 = styled_ax(fig.add_subplot(gs[1, 2]), "Run Summary")
    ax6.axis("off")
    ds = data.get("dataset", {})
    info = [
        ("Run date",       data.get("run_timestamp", "N/A")[:19].replace("T", " ")),
        ("Mode",           data.get("mode", "local").upper()),
        ("Total rows",     str(ds.get("total_rows", "N/A"))),
        ("Train / Test",   f"{ds.get('train_rows','?')} / {ds.get('test_rows','?')}"),
        ("Features",       str(len(ds.get("features", [])))),
        ("CV folds",       str(ds.get("cv_folds", "N/A"))),
        ("Target",         ds.get("target", "N/A")),
        ("🏆 Winner",      winner),
    ]
    for i, (k, v) in enumerate(info):
        y = 0.92 - i * 0.115
        ax6.text(0.02, y, f"{k}:", color="#aaaacc", fontsize=9, transform=ax6.transAxes)
        ax6.text(0.45, y, v, color="white", fontsize=9, fontweight="bold", transform=ax6.transAxes)

    # Legend patch
    patches = [
        mpatches.Patch(color=CLR_LR, label="Linear Regression"),
        mpatches.Patch(color=CLR_RF, label="Random Forest"),
    ]
    fig.legend(handles=patches, loc="lower center", ncol=2, facecolor=CLR_BG,
               labelcolor="white", fontsize=10, framealpha=0.5)

    out_path = os.path.join(LOG_DIR, "model_report.png")
    plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor=CLR_BG)
    print(f"📊  Chart saved to: {out_path}")
    plt.close()


def main():
    data = load_metrics()
    print_report(data)
    generate_charts(data)


if __name__ == "__main__":
    main()
