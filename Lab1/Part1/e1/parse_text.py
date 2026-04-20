import pandas as pd

df = pd.read_csv("data/sample.txt")

print("TEXT FILE DATA:")
print(df)

print("\nMissing Values:")
print(df.isnull().sum())
