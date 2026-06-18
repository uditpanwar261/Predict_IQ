"""
========================================================
  PredictIQ — External ML Model Trainer
  Run this script ONCE to train and save your models.
  
  Usage:
    python train_model.py                        # Use built-in synthetic dataset
    python train_model.py --dataset mydata.csv   # Use your own CSV dataset
  
  Required CSV columns (if using your own data):
    temperature, vibration, pressure, current, rpm, oil_level, noise_level, failure_label
    
  After running, copy the generated ml_models/ folder into backend/
========================================================
"""

import argparse
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, classification_report
from sklearn.preprocessing import StandardScaler
import joblib
import os
from pathlib import Path
from datetime import datetime

MODELS_DIR = Path("ml_models")
MODELS_DIR.mkdir(exist_ok=True)

FEATURES = [
    'temperature', 'vibration', 'pressure', 'current',
    'rpm', 'oil_level', 'noise_level',
    'temp_rolling_mean', 'vib_rolling_mean',
    'temp_rolling_std', 'vib_rolling_std'
]


def generate_synthetic_dataset(n_samples=6000):
    """Generate a realistic industrial sensor dataset with 4 machine states."""
    print(f"  Generating {n_samples} synthetic samples...")
    np.random.seed(42)
    rows = []

    states = ['healthy', 'warning', 'critical', 'failure']
    weights = [0.55, 0.25, 0.15, 0.05]

    params = {
        'healthy':  dict(temp=(65,5),  vib=(2.5,0.4), pres=(6.0,0.3), cur=(15,1),  rpm=(1450,30),  oil=(85,5),  noise=(72,3),  label=0, prob_range=(1,20)),
        'warning':  dict(temp=(82,8),  vib=(4.5,0.8), pres=(5.5,0.5), cur=(18,2),  rpm=(1380,50),  oil=(65,8),  noise=(78,4),  label=0, prob_range=(25,55)),
        'critical': dict(temp=(100,10),vib=(7.0,1.2), pres=(4.5,0.8), cur=(24,3),  rpm=(1280,80),  oil=(35,10), noise=(88,5),  label=1, prob_range=(60,85)),
        'failure':  dict(temp=(125,15),vib=(10.0,2.0),pres=(3.0,1.0), cur=(32,5),  rpm=(1100,120), oil=(15,8),  noise=(98,6),  label=1, prob_range=(85,99)),
    }

    for _ in range(n_samples):
        state = np.random.choice(states, p=weights)
        p = params[state]

        temp  = np.random.normal(*p['temp'])
        vib   = np.random.normal(*p['vib'])
        pres  = np.random.normal(*p['pres'])
        cur   = np.random.normal(*p['cur'])
        rpm   = np.random.normal(*p['rpm'])
        oil   = np.random.normal(*p['oil'])
        noise = np.random.normal(*p['noise'])
        prob  = np.random.uniform(*p['prob_range'])

        t_mean = temp + np.random.normal(0, 2)
        v_mean = vib  + np.random.normal(0, 0.2)
        t_std  = abs(np.random.normal(2 if state == 'healthy' else 6, 1))
        v_std  = abs(np.random.normal(0.3 if state == 'healthy' else 1.0, 0.1))

        rows.append([
            max(20, temp), max(0.1, vib), max(0.5, pres), max(0.5, cur),
            max(100, rpm), min(100, max(5, oil)), max(40, noise),
            t_mean, v_mean, t_std, v_std,
            p['label'], min(99, max(1, prob))
        ])

    df = pd.DataFrame(rows, columns=FEATURES + ['failure_label', 'failure_probability'])
    return df


def load_and_prepare(dataset_path=None):
    """Load dataset — user CSV merged with synthetic data for robustness."""
    if dataset_path:
        print(f"  Loading your dataset: {dataset_path}")
        df_user = pd.read_csv(dataset_path)
        print(f"  Found {len(df_user)} rows, columns: {list(df_user.columns)}")

        # Auto-fill rolling feature columns if missing
        for col in ['temp_rolling_mean', 'vib_rolling_mean', 'temp_rolling_std', 'vib_rolling_std']:
            if col not in df_user.columns:
                if 'mean' in col:
                    src = 'temperature' if 'temp' in col else 'vibration'
                    df_user[col] = df_user.get(src, 0)
                else:
                    df_user[col] = 2.0 if 'temp' in col else 0.3

        if 'failure_label' not in df_user.columns:
            if 'failure_probability' in df_user.columns:
                df_user['failure_label'] = (df_user['failure_probability'] > 60).astype(int)
            else:
                raise ValueError("CSV must have 'failure_label' column (0=ok, 1=failure)")

        if 'failure_probability' not in df_user.columns:
            df_user['failure_probability'] = df_user['failure_label'] * 75.0 + np.random.uniform(0, 25, len(df_user))

        # Merge with synthetic for better generalization
        df_synth = generate_synthetic_dataset(2000)
        df = pd.concat([df_user, df_synth], ignore_index=True)
        print(f"  Combined dataset: {len(df)} rows")
    else:
        df = generate_synthetic_dataset(6000)

    df = df.dropna(subset=FEATURES)
    return df


def train(dataset_path=None):
    print("\n" + "="*55)
    print("  PredictIQ ML Model Trainer")
    print("="*55)

    print("\n[1/4] Preparing dataset...")
    df = load_and_prepare(dataset_path)

    X  = df[FEATURES].values
    yc = df['failure_label'].astype(int).values
    yr = df['failure_probability'].values

    print(f"  Samples: {len(df)} | Features: {len(FEATURES)}")
    print(f"  Failure rate: {yc.mean()*100:.1f}%")

    X_train, X_test, yc_tr, yc_te, yr_tr, yr_te = train_test_split(
        X, yc, yr, test_size=0.2, random_state=42, stratify=yc
    )

    print("\n[2/4] Fitting scaler...")
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    print("\n[3/4] Training 3 models...")

    # --- Model 1: Failure Classifier ---
    print("  Training Failure Classifier (Random Forest)...")
    clf = RandomForestClassifier(n_estimators=200, max_depth=15, min_samples_leaf=2,
                                  random_state=42, n_jobs=-1, class_weight='balanced')
    clf.fit(X_train_s, yc_tr)
    yc_pred = clf.predict(X_test_s)
    yc_prob = clf.predict_proba(X_test_s)[:, 1]
    acc  = accuracy_score(yc_te, yc_pred) * 100
    f1   = f1_score(yc_te, yc_pred) * 100
    auc  = roc_auc_score(yc_te, yc_prob) * 100

    # --- Model 2: Probability Regressor ---
    print("  Training Probability Regressor (Random Forest)...")
    reg = RandomForestRegressor(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
    reg.fit(X_train_s, yr_tr)

    # --- Model 3: Anomaly Detector ---
    print("  Training Anomaly Detector (Isolation Forest)...")
    iso = IsolationForest(n_estimators=150, contamination=0.08, random_state=42)
    iso.fit(X_train_s)

    # --- Save everything ---
    print("\n[4/4] Saving model files...")
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

    print("\n" + "="*55)
    print("  TRAINING COMPLETE")
    print("="*55)
    print(f"  Accuracy  : {acc:.2f}%")
    print(f"  F1 Score  : {f1:.2f}%")
    print(f"  AUC Score : {auc:.2f}%")
    print(f"\n  Model version: {ts}")
    print(f"  Files saved to: {MODELS_DIR.resolve()}/")
    print("\n" + "="*55)
    print("\n  Classification Report:")
    print(classification_report(yc_te, yc_pred, target_names=['No Failure', 'Failure']))
    print(f"\n  Top 5 most important features:")
    importances = sorted(zip(FEATURES, clf.feature_importances_), key=lambda x: -x[1])
    for feat, imp in importances[:5]:
        bar = '█' * int(imp * 50)
        print(f"    {feat:<25} {bar} {imp*100:.1f}%")

    print(f"""
  ✅ NEXT STEP:
     Copy the ml_models/ folder into your backend directory:
     
       backend/ml_models/
     
     The web app will auto-detect and use these model files.
""")
    return ts, {'accuracy': acc, 'f1': f1, 'auc': auc}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='PredictIQ External ML Trainer')
    parser.add_argument('--dataset', type=str, help='Path to your CSV dataset file', default=None)
    args = parser.parse_args()
    train(args.dataset)
