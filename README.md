# PredictIQ — Predictive Maintenance Platform

Full-stack web application for IoT-based predictive maintenance with ML failure prediction.

## Features
- User Authentication (JWT, roles: admin/engineer/viewer)
- Machine Management (Add/Edit/Delete, 8 machine types)
- Virtual IoT Sensor Simulation (temperature, vibration, pressure, current, RPM, oil, noise)
- Real-Time Sensor Monitoring with live charts
- Machine Health Score (0–100) & Status (Healthy/Warning/Critical)
- ML Failure Prediction (Random Forest classifier + regressor + Isolation Forest)
- Failure Probability Display with confidence score
- AI Maintenance Recommendations
- Smart Alert System (threshold breach, anomaly, failure imminent)
- Prediction & Alert History
- Analytics Dashboard (health distribution, trend charts)
- Sensor Trend Charts (temperature, vibration, pressure, oil level)
- Historical Data Filtering
- Dataset Upload for custom model training
- Model Training with accuracy/F1/AUC metrics
- Report Export (PDF + CSV)
- Responsive dark UI
- Django Admin Panel
- REST API with JWT auth
- MQTT stub for future real IoT integration

## Tech Stack
**Backend:** Django 4.2, Django REST Framework, SQLite (PostgreSQL-ready)
**ML:** scikit-learn (Random Forest, Isolation Forest), XGBoost, pandas, numpy
**Frontend:** React 18, Recharts, Axios, React Router
**Reports:** ReportLab (PDF), Python csv module

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Or use the start script:
```bash
./start.sh
```

## Demo Credentials
- Admin: admin@predictive.ai / admin123
- Engineer: engineer@predictive.ai / engineer123

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login/ | Login → JWT tokens |
| POST | /api/auth/register/ | Register user |
| GET/POST/PUT/DELETE | /api/machines/ | Machine CRUD |
| GET | /api/machines/{id}/summary/ | Machine summary with latest data |
| GET | /api/sensors/readings/ | Sensor history |
| POST | /api/sensors/simulate/{id}/ | Simulate IoT reading |
| POST | /api/sensors/simulate-all/ | Simulate all machines |
| POST | /api/predictions/run/{id}/ | Run ML prediction |
| POST | /api/predictions/train/ | Train ML models |
| GET | /api/predictions/history/ | Prediction log |
| GET | /api/alerts/ | Alert list |
| POST | /api/alerts/{id}/acknowledge/ | Acknowledge alert |
| GET | /api/analytics/dashboard/ | Dashboard summary |
| GET | /api/analytics/sensor-trends/{id}/ | Sensor time-series |
| GET | /api/reports/pdf/{id}/ | PDF report download |
| GET | /api/reports/sensor-csv/{id}/ | CSV export |

## Future IoT Integration
The MQTT subscriber stub is in `ml_engine/simulator.py`. To connect real devices:
1. Install: `pip install paho-mqtt`
2. Replace the simulator Celery task with an MQTT subscriber on your broker
3. POST readings directly to `/api/sensors/ingest/` using device API tokens
4. Zero changes needed to ML pipeline or database schema

## ML Model Details
- **Classifier**: Random Forest, 150 trees, predicts will-fail-in-7-days (binary)
- **Regressor**: Random Forest, 150 trees, predicts failure probability (0–100%)
- **Anomaly**: Isolation Forest, 100 trees, 8% contamination rate
- **Training data**: 5000-sample synthetic dataset with 4 degradation states
- **Features**: temperature, vibration, pressure, current, rpm, oil_level, noise_level + rolling stats
