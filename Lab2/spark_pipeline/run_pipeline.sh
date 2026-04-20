#!/usr/bin/env bash
# =============================================================
#  run_pipeline.sh  –  AirQuality Spark ML Pipeline Orchestrator
# =============================================================
#  Usage:
#    bash run_pipeline.sh [step] [--hdfs]
#
#  Steps:   setup | preprocess | train | predict | report | all
#  Flags:   --hdfs   → use HDFS paths (start Hadoop first via hdfs_setup.sh)
#
#  Examples:
#    bash run_pipeline.sh all             # full local run
#    bash run_pipeline.sh all --hdfs      # full HDFS run
#    bash run_pipeline.sh train --hdfs    # only train on HDFS
#    bash run_pipeline.sh report          # regenerate report from latest metrics
# =============================================================

set -euo pipefail

PIPELINE_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PIPELINE_DIR/logs"
mkdir -p "$LOG_DIR"

# ── Parse args ───────────────────────────────────────────────
STEP="${1:-all}"
HDFS_FLAG=""
if [[ "${2:-}" == "--hdfs" || "${1:-}" == "--hdfs" ]]; then
    HDFS_FLAG="--hdfs"
    [[ "$STEP" == "--hdfs" ]] && STEP="all"
fi

# ── Spark settings ───────────────────────────────────────────
SPARK_SUBMIT="spark-submit"
SPARK_MASTER="local[*]"
DRIVER_MEM="2g"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

MODE_LABEL="LOCAL"
[[ -n "$HDFS_FLAG" ]] && MODE_LABEL="HDFS"

# ─────────────────────────────────────────────────────────────
run_spark() {
    local name="$1"; local script="$2"; shift 2
    local logfile="$LOG_DIR/${name}_${TIMESTAMP}.log"
    echo ""
    echo "┌─────────────────────────────────────────────────────┐"
    printf "│  %-51s│\n" "Step   : $name"
    printf "│  %-51s│\n" "Mode   : $MODE_LABEL"
    printf "│  %-51s│\n" "Log    : $(basename $logfile)"
    echo "└─────────────────────────────────────────────────────┘"
    $SPARK_SUBMIT \
        --master "$SPARK_MASTER" \
        --driver-memory "$DRIVER_MEM" \
        "$script" $HDFS_FLAG "$@" \
        2>&1 | tee "$logfile"
    echo "✅  $name complete."
}

run_python() {
    local name="$1"; local script="$2"
    local logfile="$LOG_DIR/${name}_${TIMESTAMP}.log"
    echo ""
    echo "▶  Running: $name"
    python3 "$script" 2>&1 | tee "$logfile"
    echo "✅  $name complete."
}

# ─────────────────────────────────────────────────────────────
banner() {
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "   AirQuality Spark ML Pipeline  [$MODE_LABEL mode]"
    echo "═══════════════════════════════════════════════════════"
}

case "$STEP" in
    setup)
        banner
        bash "$PIPELINE_DIR/hdfs_setup.sh"
        ;;
    preprocess)
        banner
        run_spark "01_preprocess" "$PIPELINE_DIR/01_preprocess.py"
        ;;
    train)
        banner
        run_spark "02_train" "$PIPELINE_DIR/02_train.py"
        ;;
    predict)
        banner
        run_spark "03_predict" "$PIPELINE_DIR/03_predict.py"
        ;;
    report)
        banner
        run_python "04_report" "$PIPELINE_DIR/04_report.py"
        ;;
    all)
        banner
        if [[ -n "$HDFS_FLAG" ]]; then
            echo "  Starting HDFS first …"
            bash "$PIPELINE_DIR/hdfs_setup.sh"
        fi
        run_spark  "01_preprocess" "$PIPELINE_DIR/01_preprocess.py"
        run_spark  "02_train"      "$PIPELINE_DIR/02_train.py"
        run_spark  "03_predict"    "$PIPELINE_DIR/03_predict.py"
        run_python "04_report"     "$PIPELINE_DIR/04_report.py"
        echo ""
        echo "🎉  Full pipeline complete! Check logs/ for report.txt and model_report.png"
        ;;
    *)
        echo "Usage: $0 [setup|preprocess|train|predict|report|all] [--hdfs]"
        exit 1
        ;;
esac
