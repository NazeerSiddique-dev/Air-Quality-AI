"""
=============================================================
 Step 1 – Air Quality Data Preprocessing
=============================================================
 Responsibilities:
   • Read raw CSV (semicolon-delimited, comma-decimal)
   • Fix decimal format: replace ',' with '.' and cast to Double
   • Handle missing values encoded as -200 (replace with null, then impute)
   • Feature engineering: extract Hour from Time column
   • Write cleaned data as Parquet to HDFS (or local)

 Usage:
   Local:  spark-submit 01_preprocess.py
   HDFS:   spark-submit 01_preprocess.py --hdfs
=============================================================
"""

import sys
import logging
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType
from pyspark.ml.feature import Imputer

# ─────────────────────────────────────────────
# Configuration  (switch with --hdfs flag)
# ─────────────────────────────────────────────
USE_HDFS = "--hdfs" in sys.argv
HDFS_ROOT = "hdfs://localhost:9000"
LOCAL_BASE = "/home/nazeer/DDM/hadoop_work"

if USE_HDFS:
    INPUT_PATH  = f"{HDFS_ROOT}/airquality/AirQuality.csv"
    OUTPUT_PATH = f"{HDFS_ROOT}/airquality/cleaned_data"
else:
    INPUT_PATH  = f"{LOCAL_BASE}/AirQuality.csv"
    OUTPUT_PATH = f"{LOCAL_BASE}/spark_pipeline/output/cleaned_data"

MISSING_VALUE = -200.0          # sentinel used in the dataset for missing data
MISSING_THRESHOLD = 0.40        # drop column if > 40 % of values are missing

# All numeric sensor / measurement columns in the raw file
RAW_NUMERIC_COLS = [
    "CO_GT", "PT08_S1_CO", "NMHC_GT", "C6H6_GT",
    "PT08_S2_NMHC", "NOx_GT", "PT08_S3_NOx",
    "NO2_GT", "PT08_S4_NO2", "PT08_S5_O3",
    "T", "RH", "AH"
]

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("AirQuality-Preprocess")
log.info(f"Mode: {'HDFS' if USE_HDFS else 'LOCAL'}")


def create_spark_session() -> SparkSession:
    return (
        SparkSession.builder
        .appName("AirQuality-Preprocessing")
        .config("spark.sql.shuffle.partitions", "4")   # sensible for laptop
        .getOrCreate()
    )


def read_raw(spark: SparkSession, path: str):
    """
    Read the raw CSV.
    The file uses semicolons as field separators and commas as
    decimal separators (European locale), so every numeric column
    arrives as a string such as '13,6'.
    """
    log.info(f"Reading raw CSV from: {path}")
    df = (
        spark.read
        .option("header", "true")
        .option("sep", ";")
        .option("inferSchema", "false")   # read everything as string first
        .csv(path)
    )
    log.info(f"Raw schema: {df.dtypes}")
    log.info(f"Row count (raw): {df.count()}")
    return df


def sanitise_column_names(df):
    """
    Rename columns to safe names (no dots, brackets, spaces).
    Original example: 'PT08.S1(CO)' → 'PT08_S1_CO'
    """
    rename_map = {
        "CO(GT)":          "CO_GT",
        "PT08.S1(CO)":     "PT08_S1_CO",
        "NMHC(GT)":        "NMHC_GT",
        "C6H6(GT)":        "C6H6_GT",
        "PT08.S2(NMHC)":   "PT08_S2_NMHC",
        "NOx(GT)":         "NOx_GT",
        "PT08.S3(NOx)":    "PT08_S3_NOx",
        "NO2(GT)":         "NO2_GT",
        "PT08.S4(NO2)":    "PT08_S4_NO2",
        "PT08.S5(O3)":     "PT08_S5_O3",
        "T":               "T",
        "RH":              "RH",
        "AH":              "AH",
    }
    for old, new in rename_map.items():
        if old in df.columns:
            df = df.withColumnRenamed(old, new)

    # Drop any unnamed trailing columns produced by trailing semicolons
    df = df.select([c for c in df.columns if c.strip()])
    return df


def fix_decimal_format(df, cols):
    """
    Replace ',' with '.' in all numeric string columns, then cast to Double.
    """
    log.info("Fixing decimal format (comma → dot) and casting to Double …")
    for col in cols:
        if col in df.columns:
            df = df.withColumn(
                col,
                F.regexp_replace(F.col(col), ",", ".").cast(DoubleType())
            )
    return df


def replace_missing(df, cols, sentinel=MISSING_VALUE):
    """
    Replace the sentinel value (-200) with null so Spark's Imputer
    can handle it properly.
    """
    log.info(f"Replacing sentinel {sentinel} with null …")
    for col in cols:
        if col in df.columns:
            df = df.withColumn(
                col,
                F.when(F.col(col) == sentinel, None).otherwise(F.col(col))
            )
    return df


def drop_high_missing_cols(df, cols, threshold=MISSING_THRESHOLD):
    """
    Drop any column where more than `threshold` fraction of rows are null.
    NMHC(GT) is typically ~90 % missing in this dataset, so it will be removed.
    """
    total = df.count()
    cols_to_keep = []
    dropped = []
    for col in cols:
        if col not in df.columns:
            continue
        null_frac = df.filter(F.col(col).isNull()).count() / total
        if null_frac > threshold:
            dropped.append((col, f"{null_frac:.1%}"))
        else:
            cols_to_keep.append(col)
    if dropped:
        log.warning(f"Dropping columns with > {threshold:.0%} missing: {dropped}")
        df = df.drop(*[c for c, _ in dropped])
    return df, cols_to_keep


def impute_missing(df, cols):
    """
    Use Spark ML Imputer (mean strategy) to fill remaining nulls.
    Imputer requires DoubleType columns and outputs new '_imputed' columns;
    we then overwrite the originals for a clean schema.
    """
    log.info(f"Imputing missing values with mean strategy for: {cols}")
    output_cols = [c + "_imputed" for c in cols]

    imputer = Imputer(
        strategy="mean",
        inputCols=cols,
        outputCols=output_cols,
    )
    df = imputer.fit(df).transform(df)

    # Overwrite originals with imputed values, then drop helper columns
    for orig, imp in zip(cols, output_cols):
        df = df.withColumn(orig, F.col(imp)).drop(imp)

    return df


def engineer_features(df):
    """
    Extract Hour-of-day from the 'Time' column (format: HH.mm.ss).
    Air quality is strongly correlated with traffic cycles.
    Also parse Date and create a proper timestamp.
    """
    log.info("Engineering features: extracting Hour from Time …")

    # Time format in file: '18.00.00'  → take first 2 chars as hour
    df = df.withColumn(
        "Hour",
        F.substring(F.col("Time"), 1, 2).cast("integer")
    )

    # Optional: tag rush-hour periods (07-09 and 17-19)
    df = df.withColumn(
        "IsRushHour",
        F.when(
            F.col("Hour").isin(7, 8, 9, 17, 18, 19), 1
        ).otherwise(0)
    )

    return df


def drop_null_rows(df, target_col):
    """
    Drop rows where the prediction target itself is null
    (these rows are useless for training).
    """
    before = df.count()
    df = df.filter(F.col(target_col).isNotNull())
    after = df.count()
    log.info(f"Dropped {before - after} rows with null target '{target_col}'. Remaining: {after}")
    return df


def main():
    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    # 1. Read
    df = read_raw(spark, INPUT_PATH)

    # 2. Rename columns
    df = sanitise_column_names(df)

    # 3. Fix decimal separators and cast
    df = fix_decimal_format(df, RAW_NUMERIC_COLS)

    # 4. Replace -200 with null
    df = replace_missing(df, RAW_NUMERIC_COLS)

    # 5. Drop columns that are mostly missing (e.g. NMHC_GT)
    df, numeric_cols = drop_high_missing_cols(df, RAW_NUMERIC_COLS)

    # 6. Impute remaining nulls
    df = impute_missing(df, numeric_cols)

    # 7. Feature engineering
    df = engineer_features(df)

    # 8. Drop rows where target (CO_GT) is null
    df = drop_null_rows(df, "CO_GT")

    # 9. Show sample
    log.info("=== Sample of Cleaned Data ===")
    df.show(10, truncate=False)
    df.printSchema()

    # 10. Save as Parquet
    log.info(f"Writing cleaned data to: {OUTPUT_PATH}")
    (
        df.coalesce(1)           # single file → easier to inspect
        .write
        .mode("overwrite")
        .parquet(OUTPUT_PATH)
    )

    log.info("✅ Preprocessing complete.")
    spark.stop()


if __name__ == "__main__":
    main()
