"""
=============================================================
 Step 3 – Batch Inference using Saved Model
=============================================================
 Loads the best trained model from disk / HDFS and runs
 batch predictions on cleaned data.  Demonstrates how to
 operationalise the pipeline for real-world scoring.
=============================================================
"""

import logging
from pyspark.sql import SparkSession
from pyspark.ml import PipelineModel

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
INPUT_PATH  = "/home/nazeer/DDM/hadoop_work/spark_pipeline/output/cleaned_data"
MODEL_PATH  = "/home/nazeer/DDM/hadoop_work/spark_pipeline/models/random_forest"
OUTPUT_PATH = "/home/nazeer/DDM/hadoop_work/spark_pipeline/output/predictions"

TARGET_COL  = "CO_GT"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("AirQuality-Predict")


def main():
    spark = (
        SparkSession.builder
        .appName("AirQuality-Batch-Predict")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    # 1. Load input data
    log.info(f"Loading cleaned data from: {INPUT_PATH}")
    df = spark.read.parquet(INPUT_PATH)
    log.info(f"Rows to score: {df.count()}")

    # 2. Load saved model
    log.info(f"Loading model from: {MODEL_PATH}")
    model = PipelineModel.load(MODEL_PATH)

    # 3. Run predictions
    predictions = model.transform(df)

    # 4. Show actual vs predicted
    log.info("=== Actual vs Predicted (sample) ===")
    predictions.select("Date", "Time", "Hour", TARGET_COL, "prediction").show(20, truncate=False)

    # 5. Save predictions as CSV for further analysis
    log.info(f"Saving predictions to: {OUTPUT_PATH}")
    (
        predictions
        .select("Date", "Time", "Hour", "IsRushHour", TARGET_COL, "prediction")
        .coalesce(1)
        .write
        .mode("overwrite")
        .option("header", "true")
        .csv(OUTPUT_PATH)
    )

    log.info("✅ Batch prediction complete.")
    spark.stop()


if __name__ == "__main__":
    main()
