import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import os

if not os.path.exists('results'):
    os.makedirs('results')

# 1. Load Data
file_path = "cleaned_airquality.csv"
df = pd.read_csv(file_path)

# Drop rows where target or features are missing
df = df.dropna(subset=['CO(GT)', 'PT08.S1(CO)', 'NO2(GT)', 'T', 'RH'])

# 2. Create Classification Target
# Goal: Predict if air has "High CO" (Above Median)
median_co = df['CO(GT)'].median()
df['High_CO'] = (df['CO(GT)'] > median_co).astype(int)

print(f"Median CO(GT): {median_co}")
print(f"Class Distribution:\n{df['High_CO'].value_counts()}")

# Features: Use other sensors to predict high CO
features = ['PT08.S1(CO)', 'NO2(GT)', 'T', 'RH']
X = df[features]
y = df['High_CO']

# 3. Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Train Models
# Model A: Logistic Regression
lr_model = LogisticRegression(max_iter=1000)
lr_model.fit(X_train, y_train)
lr_pred = lr_model.predict(X_test)

# Model B: Random Forest
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)
rf_pred = rf_model.predict(X_test)

# 5. Evaluation
print("\n--- Logistic Regression Results ---")
print(f"Accuracy: {accuracy_score(y_test, lr_pred):.2f}")
print(classification_report(y_test, lr_pred))

print("\n--- Random Forest Results ---")
print(f"Accuracy: {accuracy_score(y_test, rf_pred):.2f}")
print(classification_report(y_test, rf_pred))

# 6. Visualization (Feature Importance for Random Forest)
importances = rf_model.feature_importances_
indices = np.argsort(importances)[::-1]

plt.figure(figsize=(10, 6))
plt.title("Feature Importance (Random Forest)")
plt.bar(range(X.shape[1]), importances[indices], align="center")
plt.xticks(range(X.shape[1]), [features[i] for i in indices], rotation=45)
plt.tight_layout()
plt.savefig('results/classification_feature_importance.png')
plt.close()
print("\nSaved feature importance plot to results/classification_feature_importance.png")

# Confusion Matrix for RF
plt.figure(figsize=(6, 5))
cm = confusion_matrix(y_test, rf_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix (Random Forest)')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.savefig('results/classification_confusion_matrix.png')
plt.close()
print("Saved confusion matrix to results/classification_confusion_matrix.png")
