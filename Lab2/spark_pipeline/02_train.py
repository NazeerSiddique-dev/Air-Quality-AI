"""
=============================================================
 Step 2 – Spark ML Pipeline: Training & Cross-Validation
=============================================================
 Responsibilities:
   • Load cleaned Parquet data produced by 01_preprocess.py
   • Assemble feature vector (VectorAssembler)
   • Normalise features (StandardScaler)
   • Train two models: LinearRegression and RandomForestRegressor
   • Evaluate with CrossValidator (3-fold CV)
   • Save best model to disk / HDFS
   • Print rich comparison table
   • Write logs/metrics.json for report generator and dashboard

 Usage:
   Local:  spark-submit 02_train.py
   HDFS:   spark-submit 02_train.py --hdfs
=============================================================
"""

import sys
import json
import time
import logging
import os
from datetime import datetime
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.ml import Pipeline
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.ml.regression import LinearRegression, RandomForestRegressor
from pyspark.ml.evaluation import RegressionEvaluator
from pyspark.ml.tuning import CrossValidator, ParamGridBuilder

# ─────────────────────────────────────────────
# Configuration  (switch with --hdfs flag)
# ─────────────────────────────────────────────
USE_HDFS   = "--hdfs" in sys.argv
HDFS_ROOT  = "hdfs://localhost:9000"
LOCAL_BASE = "/home/nazeer/DDM/hadoop_work/spark_pipeline"

if USE_HDFS:
    INPUT_PATH = f"{HDFS_ROOT}/airquality/cleaned_data"
    MODEL_PATH = f"{HDFS_ROOT}/airquality/models"
else:
    INPUT_PATH = f"{LOCAL_BASE}/output/cleaned_data"
    MODEL_PATH = f"{LOCAL_BASE}/models"

# Metrics JSON always stored locally so report/dashboard scripts can read it
METRICS_JSON = f"{LOCAL_BASE}/logs/metrics.json"

TARGET_COL  = "CO_GT"
CV_FOLDS    = 3
TRAIN_RATIO = 0.80
SEED        = 42

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("AirQuality-Train")
log.info(f"Mode: {'HDFS' if USE_HDFS else 'LOCAL'}")


def create_spark_session() -> SparkSession:
    return (
        SparkSession.builder
        .appName("AirQuality-ML-Pipeline")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )


def load_data(spark: SparkSession, path: str):
    log.info(f"Loading cleaned Parquet data from: {path}")
    df = spark.read.parquet(path)
    log.info(f"Loaded {df.count()} rows.")
    df.printSchema()
    return df


def select_features(df):
    """
    Choose feature columns.
    Exclude Date, Time (raw strings) and the target.
    Include engineered Hour and IsRushHour.
    """
    exclude = {TARGET_COL, "Date", "Time"}
    feature_cols = [
        c for c in df.columns
        if c not in exclude
        and df.schema[c].dataType.typeName() in ("double", "integer", "long")
    ]
    log.info(f"Feature columns selected ({len(feature_cols)}): {feature_cols}")
    return feature_cols


def build_lr_pipeline(feature_cols: list) -> Pipeline:
    """VectorAssembler → StandardScaler → LinearRegression"""
    assembler = VectorAssembler(
        inputCols=feature_cols, outputCol="raw_features", handleInvalid="skip"
    )
    scaler = StandardScaler(
        inputCol="raw_features", outputCol="features", withMean=True, withStd=True
    )
    lr = LinearRegression(
        featuresCol="features", labelCol=TARGET_COL,
        predictionCol="prediction", maxIter=100
    )
    return Pipeline(stages=[assembler, scaler, lr])


def build_rf_pipeline(feature_cols: list) -> Pipeline:
    """VectorAssembler → StandardScaler → RandomForestRegressor"""
    assembler = VectorAssembler(
        inputCols=feature_cols, outputCol="raw_features", handleInvalid="skip"
    )
    scaler = StandardScaler(
        inputCol="raw_features", outputCol="features", withMean=True, withStd=True
    )
    rf = RandomForestRegressor(
        featuresCol="features", labelCol=TARGET_COL,
        predictionCol="prediction", seed=SEED
    )
    return Pipeline(stages=[assembler, scaler, rf])


def cross_validate(pipeline: Pipeline, param_grid, train_df, evaluator):
    cv = CrossValidator(
        estimator=pipeline,
        estimatorParamMaps=param_grid,
        evaluator=evaluator,
        numFolds=CV_FOLDS,
        seed=SEED,
        parallelism=2,
    )
    log.info(f"Starting {CV_FOLDS}-fold Cross-Validation …")
    cv_model = cv.fit(train_df)
    log.info(f"CV RMSE per combo: {[f'{m:.4f}' for m in cv_model.avgMetrics]}")
    return cv_model.bestModel


def evaluate_model(model, test_df, label=TARGET_COL):
    predictions = model.transform(test_df)
    results = {}
    for metric in ["rmse", "mae", "r2"]:
        val = RegressionEvaluator(
            labelCol=label, predictionCol="prediction", metricName=metric
        ).evaluate(predictions)
        results[metric] = val
        log.info(f"  {metric.upper():<5}: {val:.4f}")
    return predictions, results


def main():
    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")
    pipeline_start = time.time()

    # ── 1. Load data ───────────────────────────────────────────
    df = load_data(spark, INPUT_PATH)
    feature_cols = select_features(df)
    total_rows   = df.count()

    # ── 2. Train / Test split ──────────────────────────────────
    train_df, test_df = df.randomSplit([TRAIN_RATIO, 1 - TRAIN_RATIO], seed=SEED)
    train_count = train_df.count()
    test_count  = test_df.count()
    log.info(f"Train: {train_count} rows  |  Test: {test_count} rows")

    evaluator = RegressionEvaluator(
        labelCol=TARGET_COL, predictionCol="prediction", metricName="rmse"
    )

    # ══════════════════════════════════════════════════════════
    # MODEL A – Linear Regression
    # ══════════════════════════════════════════════════════════
    log.info("═" * 55)
    log.info("  Training MODEL A: Linear Regression")
    log.info("═" * 55)
    t0 = time.time()
    lr_pipeline   = build_lr_pipeline(feature_cols)
    lr_param_grid = (
        ParamGridBuilder()
        .addGrid(lr_pipeline.getStages()[-1].regParam,        [0.01, 0.1])
        .addGrid(lr_pipeline.getStages()[-1].elasticNetParam, [0.0, 0.5])
        .build()
    )
    best_lr       = cross_validate(lr_pipeline, lr_param_grid, train_df, evaluator)
    lr_time       = round(time.time() - t0, 1)

    log.info("  Evaluating Linear Regression on Test Set …")
    _, lr_metrics = evaluate_model(best_lr, test_df)
    lr_metrics["train_time_sec"] = lr_time

    lr_path = f"{MODEL_PATH}/linear_regression"
    best_lr.write().overwrite().save(lr_path)
    log.info(f"✅  LR model saved → {lr_path}")

    # ══════════════════════════════════════════════════════════
    # MODEL B – Random Forest Regressor
    # ══════════════════════════════════════════════════════════
    log.info("═" * 55)
    log.info("  Training MODEL B: Random Forest Regressor")
    log.info("═" * 55)
    t0 = time.time()
    rf_pipeline   = build_rf_pipeline(feature_cols)
    rf_param_grid = (
        ParamGridBuilder()
        .addGrid(rf_pipeline.getStages()[-1].numTrees, [50, 100])
        .addGrid(rf_pipeline.getStages()[-1].maxDepth, [5, 10])
        .build()
    )
    best_rf   = cross_validate(rf_pipeline, rf_param_grid, train_df, evaluator)
    rf_time   = round(time.time() - t0, 1)

    log.info("  Evaluating Random Forest on Test Set …")
    _, rf_metrics = evaluate_model(best_rf, test_df)
    rf_metrics["train_time_sec"] = rf_time

    rf_path = f"{MODEL_PATH}/random_forest"
    best_rf.write().overwrite().save(rf_path)
    log.info(f"✅  RF model saved  → {rf_path}")

    winner = "Random Forest" if rf_metrics["rmse"] < lr_metrics["rmse"] else "Linear Regression"
    total_time = round(time.time() - pipeline_start, 1)

    # ══════════════════════════════════════════════════════════
    # Rich Console Comparison Table
    # ══════════════════════════════════════════════════════════
    log.info("\n" + "═" * 60)
    log.info("            MODEL COMPARISON SUMMARY")
    log.info("═" * 60)
    log.info(f"  {'Metric':<12} {'Linear Reg':>13} {'Random Forest':>15}  Winner")
    log.info("  " + "─" * 52)
    for metric, higher_better in [("rmse", False), ("mae", False), ("r2", True)]:
        lv, rv = lr_metrics[metric], rf_metrics[metric]
        if higher_better:
            badge = "RF ✓" if rv > lv else "LR ✓"
        else:
            badge = "RF ✓" if rv < lv else "LR ✓"
        log.info(f"  {metric.upper():<12} {lv:>13.4f} {rv:>15.4f}  {badge}")
    log.info(f"  {'Train (s)':<12} {lr_time:>13.1f} {rf_time:>15.1f}")
    log.info("═" * 60)
    log.info(f"  🏆  Best model by RMSE: {winner}")
    log.info(f"  ⏱   Total pipeline time: {total_time}s")
    log.info("═" * 60)

    # ══════════════════════════════════════════════════════════
    # Save metrics.json
    # ══════════════════════════════════════════════════════════
    os.makedirs(os.path.dirname(METRICS_JSON), exist_ok=True)
    payload = {
        "run_timestamp": datetime.now().isoformat(),
        "mode": "hdfs" if USE_HDFS else "local",
        "dataset": {
            "total_rows":  total_rows,
            "train_rows":  train_count,
            "test_rows":   test_count,
            "features":    feature_cols,
            "target":      TARGET_COL,
            "cv_folds":    CV_FOLDS,
        },
        "models": {
            "LinearRegression":      lr_metrics,
            "RandomForestRegressor": rf_metrics,
        },
        "winner": winner,
        "total_pipeline_time_sec": total_time,
    }
    with open(METRICS_JSON, "w") as f:
        json.dump(payload, f, indent=2)
    log.info(f"📄  Metrics saved → {METRICS_JSON}")

    spark.stop()


if __name__ == "__main__":
    main()
