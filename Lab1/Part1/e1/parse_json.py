import pandas as pd
import json

with open("data/sample.json") as f:
    data = json.load(f)

df = pd.DataFrame(data)

print("JSON DATA:")
print(df)

print("\nMissing Values:")
print(df.isnull().sum())
