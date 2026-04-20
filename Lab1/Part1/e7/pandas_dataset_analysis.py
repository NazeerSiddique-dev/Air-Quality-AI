# Exercise: Pandas Data Analysis on Air Quality Dataset

import pandas as pd

# Load dataset (semicolon separated)
df = pd.read_csv("AirQuality.csv", sep=";")

# Remove empty columns
df = df.drop(columns=["Unnamed: 15", "Unnamed: 16"], errors="ignore")

print("First 5 Rows of Dataset:")
print(df.head())

# Dataset info
print("\nDataset Info:")
print(df.info())

# Check missing values
print("\nMissing Values in Each Column:")
print(df.isnull().sum())

# Replace comma with dot for numeric conversion
df = df.replace(",", ".", regex=True)

# Convert columns to numeric where possible
for col in df.columns[2:]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Fill missing numeric values with mean
df_filled = df.fillna(df.mean(numeric_only=True))

print("\nDataset After Handling Missing Values:")
print(df_filled.head())

# Boolean filtering: Temperature greater than 30
high_temp = df_filled[df_filled["T"] > 30]

print("\nRows where Temperature > 30:")
print(high_temp[["Date", "Time", "T"]].head())

# Aggregation operations
print("\nAverage Temperature:", df_filled["T"].mean())
print("Maximum Temperature:", df_filled["T"].max())
print("Minimum Temperature:", df_filled["T"].min())

# Save processed dataset
df_filled.to_csv("processed_airquality_dataset.csv", index=False)

print("\nProcessed dataset saved as processed_airquality_dataset.csv")
