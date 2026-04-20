"""
=============================================================
 api_server.py  –  Python built-in HTTP prediction backend
=============================================================
 Start:  python3 api_server.py
 URL:    http://localhost:8000

 Endpoints:
   GET  /health   → model load status
   POST /predict  → air quality → 4 ML predictions
=============================================================
"""

import os
import json
import pickle
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

import numpy as np

# ─────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")


def load_pkl(name):
    path = os.path.join(MODEL_DIR, name)
    with open(path, "rb") as f:
        return pickle.load(f)


# ─────────────────────────────────────────────────────────────
# Load models at startup (fail fast if missing — run train_and_save.py first)
# ─────────────────────────────────────────────────────────────
print("Loading models …")
try:
    reg_model    = load_pkl("regression_model.pkl")
    reg_scaler   = load_pkl("regression_scaler.pkl")
    clf_model    = load_pkl("classifier_model.pkl")
    clf_scaler   = load_pkl("classifier_scaler.pkl")
    km_model     = load_pkl("kmeans_model.pkl")
    km_scaler    = load_pkl("kmeans_scaler.pkl")
    with open(os.path.join(MODEL_DIR, "meta.json")) as f:
        meta = json.load(f)
    MODELS_READY = True
    print("✅  All models loaded successfully.")
except FileNotFoundError as e:
    MODELS_READY = False
    print(f"❌  Model file missing: {e}")
    print("    Run  python3 train_and_save.py  first.")


# ─────────────────────────────────────────────────────────────
# Helper: unit conversion
# ─────────────────────────────────────────────────────────────
CLUSTER_EMOJIS = {"Clean": "🌿", "Moderate": "🔵", "High": "🟠", "Severe": "🔴"}

def _rush(hour: int) -> dict:
    is_rush = (8 <= hour <= 10) or (17 <= hour <= 19)
    return {
        "is_rush": is_rush,
        "label": "Rush Hour" if is_rush else "Off-Peak",
    }


# ─────────────────────────────────────────────────────────────
# HTTP Server Request Handler
# ─────────────────────────────────────────────────────────────
class AirQualityPredictHandler(BaseHTTPRequestHandler):

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self._cors_headers()
            self.end_headers()
            response = {
                "status":       "ok" if MODELS_READY else "models_missing",
                "models_ready": MODELS_READY,
                "model_dir":    MODEL_DIR,
                "timestamp":    datetime.now().isoformat(),
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self._cors_headers()
            self.end_headers()
            response = {"message": "Air Quality ML API — POST to /predict"}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_POST(self):
        if self.path == '/predict':
            if not MODELS_READY:
                self.send_response(503)
                self.send_header('Content-type', 'application/json')
                self._cors_headers()
                self.end_headers()
                self.wfile.write(b'{"detail":"Models not loaded"}')
                return

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                req = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self._cors_headers()
                self.end_headers()
                self.wfile.write(b'{"detail":"Invalid JSON"}')
                return

            # Extract inputs with defaults
            co_ugm3 = float(req.get("co_ugm3", 0.0))
            no2 = float(req.get("no2_ugm3", 0.0))
            temp = float(req.get("temperature", 20.0))
            rh = float(req.get("humidity", 50.0))
            hour = int(req.get("hour", 12))
            aqi = float(req.get("aqi", 0.0))
            # ── Health Risk Score ────────────────────────────────

            # Extract additional pollutants
            pm25 = float(req.get("pm2_5", 0.0))
            pm10 = float(req.get("pm10", 0.0))
            o3   = float(req.get("o3", 0.0))

            # Normalize (based on safe thresholds)
            pm25_n = pm25 / 75
            pm10_n = pm10 / 150
            no2_n  = no2 / 200
            o3_n   = o3 / 240
            co_n   = co_ugm3 / 4000

            # Clamp values to max 1
            pm25_n = min(pm25_n, 1)
            pm10_n = min(pm10_n, 1)
            no2_n  = min(no2_n, 1)
            o3_n   = min(o3_n, 1)
            co_n   = min(co_n, 1)

            # Weighted score (0–100)
            score = (
                0.4 * pm25_n +
                0.2 * pm10_n +
                0.2 * no2_n +
                0.1 * o3_n +
                0.1 * co_n
            ) * 100

            # Label mapping
            if score < 20:
                label = "Good"
            elif score < 40:
                label = "Moderate"
            elif score < 60:
                label = "Unhealthy"
            elif score < 80:
                label = "Very Unhealthy"
            else:
                label = "Hazardous"
            # Unit conversion: Open-Meteo CO is ug/m3, UCI is mg/m3
            co_mg = co_ugm3 / 1000.0

            # ── 1. CO Classification ────────────────────────────────
            clf_features = np.array([[co_ugm3, no2, temp, rh]])
            clf_features_s = clf_scaler.transform(clf_features)
            clf_pred = int(clf_model.predict(clf_features_s)[0])
            co_result = {
                "label": "HIGH CO Risk" if clf_pred == 1 else "LOW CO Risk",
                "high": clf_pred == 1,
            }

            # ── 2. Benzene Regression ───────────────────────────────
            nox_est = no2 * 1.3
            ah_est = (6.112 * np.exp(17.67 * temp / (temp + 243.5)) * rh * 2.1674) / (273.15 + temp)
            reg_features = np.array([[co_ugm3 * 0.5, nox_est, no2, temp, rh, ah_est]])
            reg_features_s = reg_scaler.transform(reg_features)
            benzene = float(max(0, reg_model.predict(reg_features_s)[0]))

            # ── 3. Pollution Cluster ────────────────────────────────
            km_features = np.array([[co_mg, co_ugm3, benzene, nox_est, no2, temp, rh]])
            km_features_s = km_scaler.transform(km_features)
            raw_cluster = int(km_model.predict(km_features_s)[0])

            label_map = meta["clustering"]["internal_label_map"]
            cluster_labels = meta["clustering"]["cluster_labels"]
            rank = label_map.get(str(raw_cluster), raw_cluster)

            # ── HYBRID RULE SYSTEM OVERRIDE ──────────────────────────
            # The UCI model entirely ignores PM2.5 and PM10. 
            # If real-world particles cause high AQI, we must override
            # the gas-only cluster to reflect the true pollution state.
            if aqi >= 150:
                rank = 3  # Severe
            elif aqi >= 100:
                rank = 2  # High
            elif aqi >= 60 and rank < 1:
                rank = 1  # Moderate

            cluster_name = cluster_labels.get(str(rank), f"Cluster {rank}")
            cluster_result = {
                "id": rank,
                "label": cluster_name,
                "emoji": CLUSTER_EMOJIS.get(cluster_name, "🔘"),
            }

            # ── 4. Rush Hour ────────────────────────────────────────
            rush_result = _rush(hour)

            response = {
                "co_class": co_result,
                "benzene": round(benzene, 2),
                "cluster": cluster_result,
                "rush_hour": rush_result,
                "health_risk": {
                    "score": round(score, 1),
                    "label": label
                },
                "timestamp": datetime.now().isoformat()
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b'{"detail":"Not Found"}')

    def log_message(self, format, *args):
        # Override to suppress noisy logging, or customize
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {self.address_string()} - {format%args}")


def run_server():
    server_address = ('0.0.0.0', 8000)
    httpd = HTTPServer(server_address, AirQualityPredictHandler)
    print("\n" + "═"*55)
    print("  Air Quality ML API (Native HTTP)")
    print("  http://localhost:8000")
    print("═"*55 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    run_server()
