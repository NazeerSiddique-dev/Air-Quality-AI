import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import os

if not os.path.exists('results'):
    os.makedirs('results')

# 1. Load Cleaned Data
file_path = "cleaned_airquality.csv"
print(f"Loading cleaned dataset from: {file_path}")
df = pd.read_csv(file_path)

# Drop rows with missing values in our features or target
# We will predict C6H6(GT) using other sensors
df = df.dropna(subset=['C6H6(GT)', 'PT08.S2(NMHC)', 'NOx(GT)', 'NO2(GT)', 'T', 'RH', 'AH'])

# 2. Select Features and Target
features = ['PT08.S2(NMHC)', 'NOx(GT)', 'NO2(GT)', 'T', 'RH', 'AH']
target = 'C6H6(GT)'

X = df[features]
y = df[target]

# 3. Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Train Model
model = LinearRegression()
model.fit(X_train, y_train)

# 5. Make Predictions
y_pred = model.predict(X_test)

# 6. Evaluate Model
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("--- Regression Results (Predicting Benzene C6H6) ---")
print(f"Mean Squared Error: {mse:.2f}")
print(f"R2 Score: {r2:.2f}")
print("\nCoefficients:")
for feature, coef in zip(features, model.coef_):
    print(f"{feature}: {coef:.2f}")
print(f"Intercept: {model.intercept_:.2f}")

# 7. Visualization
plt.figure(figsize=(8, 6))
plt.scatter(y_test, y_pred, alpha=0.5)
plt.plot([y.min(), y.max()], [y.min(), y.max()], 'r--', lw=2)
plt.xlabel('Actual Benzene C6H6(GT)')
plt.ylabel('Predicted Benzene C6H6(GT)')
plt.title('Actual vs Predicted Benzene')
plt.savefig('results/regression_actual_vs_pred.png')
plt.close()
print("\nSaved regression plot to results/regression_actual_vs_pred.png")
