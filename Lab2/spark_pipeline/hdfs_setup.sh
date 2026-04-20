#!/usr/bin/env bash
# =============================================================
#  hdfs_setup.sh  –  Start Hadoop, format if needed, upload CSV
# =============================================================
set -euo pipefail

HADOOP_HOME="${HADOOP_HOME:-/home/nazeer/hadoop}"
HDFS_BIN="$HADOOP_HOME/bin/hdfs"
SBIN="$HADOOP_HOME/sbin"
CSV_LOCAL="/home/nazeer/DDM/hadoop_work/AirQuality.csv"
HDFS_DIR="/airquality"

echo "═══════════════════════════════════════════════════"
echo "   Hadoop HDFS Bootstrap"
echo "═══════════════════════════════════════════════════"

# 1. Check if NameNode is already running
if jps | grep -q NameNode; then
    echo "✅ NameNode already running – skipping format/start."
else
    echo "▶  Starting HDFS (NameNode + DataNode) …"

    # Format only if there is no previous namenode data
    NAMENODE_DIR=$("$HDFS_BIN" getconf -confKey dfs.namenode.name.dir 2>/dev/null || echo "/tmp/hadoop-${USER}/dfs/name")
    if [ ! -d "$NAMENODE_DIR/current" ]; then
        echo "  Formatting NameNode (first-time setup) …"
        "$HDFS_BIN" namenode -format -force -nonInteractive 2>&1 | tail -5
    fi

    "$SBIN/start-dfs.sh"
    sleep 5

    if jps | grep -q NameNode; then
        echo "✅ HDFS started successfully."
    else
        echo "❌ HDFS failed to start. Check logs at $HADOOP_HOME/logs/"
        exit 1
    fi
fi

# 2. Create HDFS directory and upload CSV
echo ""
echo "▶  Uploading AirQuality.csv to HDFS …"
"$HDFS_BIN" dfs -mkdir -p "$HDFS_DIR"
"$HDFS_BIN" dfs -put -f "$CSV_LOCAL" "$HDFS_DIR/"
echo "✅ File uploaded:"
"$HDFS_BIN" dfs -ls "$HDFS_DIR/"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  HDFS is ready. Now run:"
echo "  bash run_pipeline.sh"
echo "═══════════════════════════════════════════════════"
