import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import os

# Create results directory
if not os.path.exists('results'):
    os.makedirs('results')

# 1. Load Data
file_path = "../AirQuality.csv"
print(f"Loading dataset from: {file_path}")
# Data is separated by semicolons, and commas are used for decimals
df = pd.read_csv(file_path, sep=';', decimal=',')

# Drop empty trailing columns
df = df.dropna(how='all', axis=1)

# Drop entirely empty rows
df = df.dropna(how='all', axis=0)

print("\n--- Dataset Info ---")
print(df.info())

print("\n--- First 5 Rows ---")
print(df.head())

# 2. Handling Missing Data (-200 is used as a placeholder)
df.replace(-200, np.nan, inplace=True)

print("\n--- Missing Values ---")
missing_values = df.isnull().sum()
print(missing_values[missing_values > 0])

# Impute numeric missing values with mean
numeric_cols = df.select_dtypes(include=[np.number]).columns
df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

# 3. Handling Categorical Data (Time Engineering)
# Create a "rush_hour" feature (08:00-10:00 and 17:00-19:00)
def is_rush_hour(time_str):
    try:
        hour = int(str(time_str).split('.')[0])
        if (8 <= hour <= 10) or (17 <= hour <= 19):
            return 1
    except:
        pass
    return 0

df['is_rush_hour'] = df['Time'].apply(is_rush_hour)
print("\nCreated 'is_rush_hour' dummy variable based on Time.")
print(df['is_rush_hour'].value_counts())

# Save cleaned dataset for other scripts
df.to_csv('cleaned_airquality.csv', index=False)
print("Saved cleaned dataset to cleaned_airquality.csv")

# 4. Data Visualization
# Histogram of Temperature (T)
plt.figure(figsize=(10, 6))
sns.histplot(df['T'].dropna(), kde=True, bins=30)
plt.title('Distribution of Temperature (C)')
plt.xlabel('Temperature (C)')
plt.savefig('results/temp_dist.png')
plt.close()
print("\nSaved histogram to results/temp_dist.png")

# Correlation Heatmap
plt.figure(figsize=(12, 10))
corr = df[numeric_cols].corr()
sns.heatmap(corr, annot=False, cmap='coolwarm')
plt.title('Correlation Matrix of Sensors')
plt.savefig('results/correlation_heatmap.png')
plt.close()
print("Saved heatmap to results/correlation_heatmap.png")

# Scatter Plot: CO(GT) vs NOx(GT)
plt.figure(figsize=(10, 6))
sns.scatterplot(x='NOx(GT)', y='CO(GT)', data=df, alpha=0.5)
plt.title('CO vs NOx')
plt.savefig('results/co_vs_nox.png')
plt.close()
print("Saved scatter plot to results/co_vs_nox.png")

print("\nPreprocessing completed.")
