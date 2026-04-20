"""
=============================================================
 train_and_save.py  –  Train all 3 sklearn models and save .pkl
=============================================================
 Run once (or after data changes) to produce:
   models/
     regression_model.pkl    Linear Regression  → Benzene (C6H6)
     regression_scaler.pkl   StandardScaler for regression
     classifier_model.pkl    RandomForest       → High/Low CO class
     classifier_scaler.pkl   StandardScaler for classifier
     kmeans_model.pkl        KMeans (k=4)       → pollution cluster
     kmeans_scaler.pkl       StandardScaler for KMeans
     meta.json               thresholds + cluster labels + metrics
=============================================================
"""

import os
import json
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score

# ─────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "cleaned_airquality.csv")
MODEL_DIR  = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def save_pkl(obj, name):
    path = os.path.join(MODEL_DIR, name)
    with open(path, "wb") as f:
        pickle.dump(obj, f)
    print(f"  💾  Saved  →  {name}")


def sep(title):
    print(f"\n{'═'*55}")
    print(f"  {title}")
    print('═'*55)


# ─────────────────────────────────────────────────────────────
# 1. Load cleaned data
# ─────────────────────────────────────────────────────────────
sep("Loading cleaned_airquality.csv")
df = pd.read_csv(DATA_PATH)
print(f"  Rows: {len(df)}  |  Columns: {len(df.columns)}")
meta = {}


# ─────────────────────────────────────────────────────────────
# 2. REGRESSION  –  predict Benzene (C6H6) from sensor readings
# ─────────────────────────────────────────────────────────────
sep("MODEL 1 — Linear Regression (Benzene prediction)")

REG_FEATURES = ["PT08.S2(NMHC)", "NOx(GT)", "NO2(GT)", "T", "RH", "AH"]
REG_TARGET   = "C6H6(GT)"

df_reg = df.dropna(subset=REG_FEATURES + [REG_TARGET])
X_reg  = df_reg[REG_FEATURES].values
y_reg  = df_reg[REG_TARGET].values

X_tr, X_te, y_tr, y_te = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)

scaler_reg = StandardScaler()
X_tr_s     = scaler_reg.fit_transform(X_tr)
X_te_s     = scaler_reg.transform(X_te)

reg_model  = LinearRegression()
reg_model.fit(X_tr_s, y_tr)
y_pred_reg = reg_model.predict(X_te_s)

reg_mse = mean_squared_error(y_te, y_pred_reg)
reg_r2  = r2_score(y_te, y_pred_reg)
print(f"  MSE : {reg_mse:.4f}")
print(f"  R²  : {reg_r2:.4f}")
print(f"  Coefficients: {dict(zip(REG_FEATURES, reg_model.coef_.round(4)))}")

save_pkl(reg_model,  "regression_model.pkl")
save_pkl(scaler_reg, "regression_scaler.pkl")

meta["regression"] = {
    "features": REG_FEATURES,
    "target":   REG_TARGET,
    "mse":      round(reg_mse, 4),
    "r2":       round(reg_r2, 4),
    "coef":     dict(zip(REG_FEATURES, reg_model.coef_.round(4).tolist())),
    "intercept": round(float(reg_model.intercept_), 4),
}


# ─────────────────────────────────────────────────────────────
# 3. CLASSIFICATION  –  High / Low CO (Random Forest)
# ─────────────────────────────────────────────────────────────
sep("MODEL 2 — Random Forest Classifier (High CO)")

CLF_FEATURES = ["PT08.S1(CO)", "NO2(GT)", "T", "RH"]
CLF_TARGET   = "CO(GT)"

df_clf    = df.dropna(subset=CLF_FEATURES + [CLF_TARGET])
median_co = float(df_clf[CLF_TARGET].median())
df_clf    = df_clf.copy()
df_clf["High_CO"] = (df_clf[CLF_TARGET] > median_co).astype(int)

print(f"  Median CO(GT): {median_co:.4f}  (threshold for High/Low classification)")
print(f"  Class distribution:\n{df_clf['High_CO'].value_counts().to_string()}")

X_clf = df_clf[CLF_FEATURES].values
y_clf = df_clf["High_CO"].values

X_tr2, X_te2, y_tr2, y_te2 = train_test_split(X_clf, y_clf, test_size=0.2, random_state=42)

scaler_clf = StandardScaler()
X_tr2_s   = scaler_clf.fit_transform(X_tr2)
X_te2_s   = scaler_clf.transform(X_te2)

clf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
clf_model.fit(X_tr2_s, y_tr2)
y_pred_clf = clf_model.predict(X_te2_s)

clf_acc = accuracy_score(y_te2, y_pred_clf)
print(f"  Accuracy : {clf_acc:.4f}")

save_pkl(clf_model,  "classifier_model.pkl")
save_pkl(scaler_clf, "classifier_scaler.pkl")

meta["classification"] = {
    "features":  CLF_FEATURES,
    "target":    "High_CO (binary)",
    "median_co": round(median_co, 4),
    "accuracy":  round(clf_acc, 4),
    "classes":   {0: "Low CO", 1: "High CO"},
}


# ─────────────────────────────────────────────────────────────
# 4. CLUSTERING  –  K-Means k=4 (pollution states)
# ─────────────────────────────────────────────────────────────
sep("MODEL 3 — K-Means Clustering (k=4)")

KM_FEATURES = ["CO(GT)", "PT08.S1(CO)", "C6H6(GT)", "NOx(GT)", "NO2(GT)", "T", "RH"]

df_km  = df.dropna(subset=KM_FEATURES)
X_km   = df_km[KM_FEATURES].values

scaler_km = StandardScaler()
X_km_s    = scaler_km.fit_transform(X_km)

km_model = KMeans(n_clusters=4, random_state=42, n_init=10)
labels   = km_model.fit_predict(X_km_s)
df_km    = df_km.copy()
df_km["Cluster"] = labels

# Name clusters by CO level
cluster_means = df_km.groupby("Cluster")["CO(GT)"].mean().sort_values()
rank_map = {old: new for new, old in enumerate(cluster_means.index)}
cluster_labels = {
    str(rank_map[ci]): name
    for ci, name in {
        cluster_means.index[0]: "Clean",
        cluster_means.index[1]: "Moderate",
        cluster_means.index[2]: "High",
        cluster_means.index[3]: "Severe",
    }.items()
}
print(f"  Cluster CO means:\n{cluster_means.round(3).to_string()}")
print(f"  Assigned labels: {cluster_labels}")

save_pkl(km_model,  "kmeans_model.pkl")
save_pkl(scaler_km, "kmeans_scaler.pkl")

# Save raw label → rank map so API can translate kmeans.predict() output to names
internal_label_map = {str(k): int(v) for k, v in rank_map.items()}

meta["clustering"] = {
    "features":        KM_FEATURES,
    "k":               4,
    "internal_label_map": internal_label_map,
    "cluster_labels":  cluster_labels,
    "inertia":         round(float(km_model.inertia_), 2),
}


# ─────────────────────────────────────────────────────────────
# 5. Save meta.json
# ─────────────────────────────────────────────────────────────
sep("Writing meta.json")
meta_path = os.path.join(MODEL_DIR, "meta.json")
with open(meta_path, "w") as f:
    json.dump(meta, f, indent=2)
print(f"  💾  Saved  →  meta.json")

sep("✅  All models saved")
print(f"  Directory: {MODEL_DIR}")
for fname in sorted(os.listdir(MODEL_DIR)):
    size = os.path.getsize(os.path.join(MODEL_DIR, fname))
    print(f"    {fname:<35} {size:>8,} B")

print("\n  Next step → run:  python3 api_server.py\n")
