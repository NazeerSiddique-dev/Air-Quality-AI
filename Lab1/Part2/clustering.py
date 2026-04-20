import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import seaborn as sns
import os

if not os.path.exists('results'):
    os.makedirs('results')

# 1. Load Data
file_path = "cleaned_airquality.csv"
df = pd.read_csv(file_path)

# Drop rows with NaNs in our selected features
features = ['CO(GT)', 'PT08.S1(CO)', 'C6H6(GT)', 'NOx(GT)', 'NO2(GT)', 'T', 'RH']
df = df.dropna(subset=features)

X = df[features]

# 2. Standardization (Important for Clustering)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 3. K-Means Clustering
# Find optimal K using Elbow Method
inertia = []
K_range = range(1, 11)
for k in K_range:
    kmeans = KMeans(n_clusters=k, random_state=42)
    kmeans.fit(X_scaled)
    inertia.append(kmeans.inertia_)

plt.figure(figsize=(8, 5))
plt.plot(K_range, inertia, marker='o')
plt.xlabel('Number of Clusters (K)')
plt.ylabel('Inertia')
plt.title('Elbow Method for Optimal K (Air Quality)')
plt.savefig('results/clustering_elbow.png')
plt.close()
print("Saved Elbow plot to results/clustering_elbow.png")

# Choose K=4 based on typical pollution states (e.g., Clean, Moderate, High, Severe)
k_optimal = 4
kmeans = KMeans(n_clusters=k_optimal, random_state=42)
clusters = kmeans.fit_predict(X_scaled)
df['Cluster'] = clusters

# 4. Visualization with PCA
pca = PCA(n_components=2)
X_pca = pca.fit_transform(X_scaled)

plt.figure(figsize=(10, 8))
sns.scatterplot(x=X_pca[:, 0], y=X_pca[:, 1], hue=df['Cluster'], palette='viridis', alpha=0.7)
plt.title(f'K-Means Clustering (K={k_optimal}) Visualization using PCA')
plt.xlabel('Principal Component 1')
plt.ylabel('Principal Component 2')
plt.legend(title='Cluster')
plt.savefig('results/clustering_pca.png')
plt.close()
print("Saved PCA cluster plot to results/clustering_pca.png")

# 5. Cluster Analysis
numeric_cols_for_mean = features + ['Cluster']
print("\n--- Cluster Centers (Mean Values) ---")
print(df[numeric_cols_for_mean].groupby('Cluster').mean())
