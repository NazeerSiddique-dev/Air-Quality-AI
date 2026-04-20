import pandas as pd

df = pd.read_csv("data/AirQuality.csv")

print("CSV DATA:")
print(df)

print("\nMissing Values:")
print(df.isnull().sum())
