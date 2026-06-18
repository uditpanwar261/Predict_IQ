"""ML model training pipeline using synthetic + uploaded datasets."""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.preprocessing import StandardScaler
import joblib
import os
from pathlib import Path
from datetime import datetime

MODELS_DIR = Path(__file__).resolve().parent.parent / 'ml_models'
MODELS_DIR.mkdir(exist_ok=True)

FEATURES = ['temperature', 'vibration', 'pressure', 'current', 'rpm', 'oil_level', 'noise_level',
            'temp_rolling_mean', 'vib_rolling_mean', 'temp_rolling_std', 'vib_rolling_std']

def generate_synthetic_dataset(n_samples=5000):
    """Generate realistic synthetic maintenance dataset."""
    np.random.seed(42)
    data = []
    for i in range(n_samples):
        # Simulate degradation states
        state = np.random.choice(['healthy', 'warning', 'critical', 'failure'], p=[0.55, 0.25, 0.15, 0.05])
        if state == 'healthy':
            temp = np.random.normal(65, 5)
            vib = np.random.normal(2.5, 0.4)
            pres = np.random.normal(6.0, 0.3)
            cur = np.random.normal(15, 1)
            rpm = np.random.normal(1450, 30)
            oil = np.random.normal(85, 5)
            noise = np.random.normal(72, 3)
            label = 0
            prob = np.random.uniform(0, 20)
        elif state == 'warning':
            temp = np.random.normal(82, 8)
            vib = np.random.normal(4.5, 0.8)
            pres = np.random.normal(5.5, 0.5)
            cur = np.random.normal(18, 2)
            rpm = np.random.normal(1380, 50)
            oil = np.random.normal(65, 8)
            noise = np.random.normal(78, 4)
            label = 0
            prob = np.random.uniform(25, 55)
        elif state == 'critical':
            temp = np.random.normal(100, 10)
            vib = np.random.normal(7.0, 1.2)
            pres = np.random.normal(4.5, 0.8)
            cur = np.random.normal(24, 3)
            rpm = np.random.normal(1280, 80)
            oil = np.random.normal(35, 10)
            noise = np.random.normal(88, 5)
            label = 1
            prob = np.random.uniform(60, 85)
        else:  # failure
            temp = np.random.normal(125, 15)
            vib = np.random.normal(10.0, 2.0)
            pres = np.random.normal(3.0, 1.0)
            cur = np.random.normal(32, 5)
            rpm = np.random.normal(1100, 120)
            oil = np.random.normal(15, 8)
            noise = np.random.normal(98, 6)
            label = 1
            prob = np.random.uniform(85, 99)

        # Rolling stats simulation
        t_mean = temp + np.random.normal(0, 2)
        v_mean = vib + np.random.normal(0, 0.2)
        t_std = abs(np.random.normal(2 if state == 'healthy' else 6, 1))
        v_std = abs(np.random.normal(0.3 if state == 'healthy' else 1.0, 0.1))

        data.append([max(20, temp), max(0.1, vib), max(0.5, pres), max(0.5, cur),
                     max(100, rpm), min(100, max(5, oil)), max(40, noise),
                     t_mean, v_mean, t_std, v_std, label, min(99, max(1, prob))])

    df = pd.DataFrame(data, columns=FEATURES + ['failure_label', 'failure_probability'])
    return df

def train_all_models(dataset_path=None):
    """Train all 3 ML models. Returns metrics dict."""
    if dataset_path and os.path.exists(dataset_path):
        df = pd.read_csv(dataset_path)
        # Validate and add missing rolling features
        for col in FEATURES:
            if col not in df.columns:
                if col == 'temp_rolling_mean': df[col] = df.get('temperature', 65)
                elif col == 'vib_rolling_mean': df[col] = df.get('vibration', 2.5)
                elif col == 'temp_rolling_std': df[col] = 2.0
                elif col == 'vib_rolling_std': df[col] = 0.3
        if 'failure_label' not in df.columns:
            df['failure_label'] = (df.get('failure_probability', 50) > 60).astype(int)
        if 'failure_probability' not in df.columns:
            df['failure_probability'] = df['failure_label'] * 75 + np.random.uniform(0, 25, len(df))
        synth = generate_synthetic_dataset(2000)
        df = pd.concat([df, synth], ignore_index=True)
    else:
        df = generate_synthetic_dataset(5000)

    df = df.dropna(subset=FEATURES)
    X = df[FEATURES].values
    y_cls = df['failure_label'].astype(int).values
    y_reg = df['failure_probability'].values

    X_train, X_test, yc_train, yc_test, yr_train, yr_test = train_test_split(
        X, y_cls, y_reg, test_size=0.2, random_state=42, stratify=y_cls
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    # Model 1: Classifier
    clf = RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
    clf.fit(X_train_s, yc_train)
    yc_pred = clf.predict(X_test_s)
    yc_prob = clf.predict_proba(X_test_s)[:, 1]
    cls_metrics = {
        'accuracy': round(accuracy_score(yc_test, yc_pred) * 100, 2),
        'f1': round(f1_score(yc_test, yc_pred) * 100, 2),
        'auc': round(roc_auc_score(yc_test, yc_prob) * 100, 2),
    }

    # Model 2: Regressor
    reg = RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
    reg.fit(X_train_s, yr_train)

    # Model 3: Anomaly detector
    iso = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    iso.fit(X_train_s)

    # Save models
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    paths = {
        'classifier': str(MODELS_DIR / f'classifier_{ts}.joblib'),
        'regressor':  str(MODELS_DIR / f'regressor_{ts}.joblib'),
        'anomaly':    str(MODELS_DIR / f'anomaly_{ts}.joblib'),
        'scaler':     str(MODELS_DIR / f'scaler_{ts}.joblib'),
    }
    joblib.dump(clf, paths['classifier'])
    joblib.dump(reg, paths['regressor'])
    joblib.dump(iso, paths['anomaly'])
    joblib.dump(scaler, paths['scaler'])

    return {
        'paths': paths,
        'metrics': cls_metrics,
        'training_samples': len(df),
        'version': ts,
    }

def predict(reading_dict, classifier_path, regressor_path, anomaly_path, scaler_path):
    """Run all 3 models on a sensor reading dict."""
    clf = joblib.load(classifier_path)
    reg = joblib.load(regressor_path)
    iso = joblib.load(anomaly_path)
    scaler = joblib.load(scaler_path)

    features = [
        reading_dict.get('temperature', 65),
        reading_dict.get('vibration', 2.5),
        reading_dict.get('pressure', 6.0),
        reading_dict.get('current', 15.0),
        reading_dict.get('rpm', 1450),
        reading_dict.get('oil_level', 85),
        reading_dict.get('noise_level', 72),
        reading_dict.get('temp_rolling_mean', reading_dict.get('temperature', 65)),
        reading_dict.get('vib_rolling_mean', reading_dict.get('vibration', 2.5)),
        reading_dict.get('temp_rolling_std', 2.0),
        reading_dict.get('vib_rolling_std', 0.3),
    ]

    X = scaler.transform([features])
    fail_prob = float(reg.predict(X)[0])
    will_fail = bool(clf.predict(X)[0])
    anomaly_score = float(-iso.score_samples(X)[0])
    is_anomaly = iso.predict(X)[0] == -1

    feature_importance = dict(zip(FEATURES, clf.feature_importances_))
    top_factors = sorted(feature_importance.items(), key=lambda x: -x[1])[:4]

    recommendations = []
    t = reading_dict.get('temperature', 65)
    v = reading_dict.get('vibration', 2.5)
    o = reading_dict.get('oil_level', 85)

    if t > 95: recommendations.append("🌡️ High temperature detected — check cooling system and ventilation")
    elif t > 80: recommendations.append("🌡️ Temperature elevated — monitor cooling closely")
    if v > 6: recommendations.append("📳 Severe vibration — inspect bearings, alignment, and mounts immediately")
    elif v > 4: recommendations.append("📳 Increased vibration — schedule bearing inspection")
    if o < 25: recommendations.append("🔧 Critical oil level — immediate oil change required")
    elif o < 45: recommendations.append("🔧 Low oil level — schedule oil service within 48 hours")
    if fail_prob > 75: recommendations.append("⚠️ High failure risk — schedule preventive maintenance within 7 days")
    elif fail_prob > 50: recommendations.append("⚠️ Moderate failure risk — increase monitoring frequency")
    if not recommendations:
        recommendations.append("✅ Machine operating within normal parameters — continue routine maintenance")

    days_to_failure = None
    if fail_prob > 80: days_to_failure = random.randint(1, 5) if __import__('random').random() else 3
    elif fail_prob > 60: days_to_failure = random.randint(5, 14) if __import__('random').random() else 10
    elif fail_prob > 40: days_to_failure = random.randint(14, 30)

    return {
        'failure_probability': round(min(99, max(1, fail_prob)), 1),
        'will_fail_within_7days': will_fail,
        'estimated_days_to_failure': days_to_failure,
        'confidence_score': round(min(99, max(60, 100 - abs(fail_prob - 50))), 1),
        'is_anomaly': is_anomaly,
        'anomaly_score': round(anomaly_score, 3),
        'contributing_factors': {k: round(v * 100, 1) for k, v in top_factors},
        'recommendations': recommendations,
    }

import random
