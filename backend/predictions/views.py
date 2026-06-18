from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets
from django.conf import settings
from pathlib import Path
import numpy as np
from .models import Prediction, MLModel, TrainingJob
from .serializers import PredictionSerializer, MLModelSerializer, TrainingJobSerializer

MODELS_DIR = Path(settings.BASE_DIR) / 'ml_models'
FEATURES = [
    'temperature', 'vibration', 'pressure', 'current',
    'rpm', 'oil_level', 'noise_level',
    'temp_rolling_mean', 'vib_rolling_mean',
    'temp_rolling_std', 'vib_rolling_std'
]

def get_model_paths():
    paths = {}
    for mtype in ['classifier', 'regressor', 'anomaly', 'scaler']:
        files = sorted(MODELS_DIR.glob(f'{mtype}_*.joblib'), reverse=True)
        if files:
            paths[mtype] = str(files[0])
    return paths


class ManualPredictView(APIView):
    """
    Accepts manually entered sensor values from the form and returns prediction.
    POST /api/predictions/predict/
    Body: { temperature, vibration, pressure, current, rpm, oil_level, noise_level }
    """
    def post(self, request):
        import joblib

        data = request.data
        required = ['temperature', 'vibration', 'pressure', 'current', 'rpm', 'oil_level', 'noise_level']
        errors = {}
        values = {}

        for field in required:
            try:
                val = float(data.get(field, ''))
                values[field] = val
            except (TypeError, ValueError):
                errors[field] = f'{field} is required and must be a number.'

        if errors:
            return Response({'errors': errors}, status=400)

        # Validate ranges
        ranges = {
            'temperature': (0, 300),
            'vibration':   (0, 50),
            'pressure':    (0, 100),
            'current':     (0, 200),
            'rpm':         (0, 10000),
            'oil_level':   (0, 100),
            'noise_level': (0, 150),
        }
        for field, (lo, hi) in ranges.items():
            if not (lo <= values[field] <= hi):
                errors[field] = f'Value {values[field]} is out of expected range ({lo}–{hi}).'
        if errors:
            return Response({'errors': errors}, status=400)

        # Build full feature vector (rolling stats estimated from single reading)
        feature_vector = [
            values['temperature'],
            values['vibration'],
            values['pressure'],
            values['current'],
            values['rpm'],
            values['oil_level'],
            values['noise_level'],
            values['temperature'],   # temp_rolling_mean ≈ current value
            values['vibration'],     # vib_rolling_mean ≈ current value
            2.0,                     # temp_rolling_std (baseline)
            0.3,                     # vib_rolling_std (baseline)
        ]

        paths = get_model_paths()
        if len(paths) < 4:
            return Response({'error': 'ML models not found. Please run train_model.py first.'}, status=503)

        try:
            clf    = joblib.load(paths['classifier'])
            reg    = joblib.load(paths['regressor'])
            iso    = joblib.load(paths['anomaly'])
            scaler = joblib.load(paths['scaler'])
        except Exception as e:
            return Response({'error': f'Failed to load models: {str(e)}'}, status=500)

        X = scaler.transform([feature_vector])
        failure_prob    = float(np.clip(reg.predict(X)[0], 0, 100))
        will_fail       = bool(clf.predict(X)[0])
        fail_proba      = float(clf.predict_proba(X)[0][1] * 100)
        is_anomaly      = iso.predict(X)[0] == -1
        anomaly_score   = float(-iso.score_samples(X)[0])
        confidence      = float(np.clip(100 - abs(failure_prob - 50), 50, 99))

        # Health status
        if failure_prob < 30:
            health_status = 'Healthy'
            health_color  = 'green'
        elif failure_prob < 60:
            health_status = 'Warning'
            health_color  = 'yellow'
        else:
            health_status = 'Critical'
            health_color  = 'red'

        # Estimated days to failure
        if failure_prob > 85:   days = '1–3 days'
        elif failure_prob > 70: days = '3–7 days'
        elif failure_prob > 55: days = '7–14 days'
        elif failure_prob > 40: days = '14–30 days'
        else:                   days = None

        # Recommendations
        recs = []
        t, v, o, p = values['temperature'], values['vibration'], values['oil_level'], values['pressure']
        if t > 100:  recs.append({'icon': '🌡️', 'text': 'Critical temperature — check cooling system and heat exchangers immediately', 'severity': 'critical'})
        elif t > 80: recs.append({'icon': '🌡️', 'text': 'Elevated temperature — inspect ventilation and cooling fans', 'severity': 'warning'})
        if v > 7:    recs.append({'icon': '📳', 'text': 'Severe vibration — stop machine and inspect bearings and shaft alignment', 'severity': 'critical'})
        elif v > 4:  recs.append({'icon': '📳', 'text': 'Increased vibration — schedule bearing inspection within 48 hours', 'severity': 'warning'})
        if o < 20:   recs.append({'icon': '🔧', 'text': 'Critical oil level — immediate oil change required before next operation', 'severity': 'critical'})
        elif o < 45: recs.append({'icon': '🔧', 'text': 'Low oil level — schedule oil service within 48 hours', 'severity': 'warning'})
        if p < 2:    recs.append({'icon': '💨', 'text': 'Very low pressure — check for leaks and pump functionality', 'severity': 'warning'})
        if failure_prob > 70: recs.append({'icon': '⚠️', 'text': 'High failure risk — schedule preventive maintenance immediately', 'severity': 'critical'})
        elif failure_prob > 45: recs.append({'icon': '⚠️', 'text': 'Moderate failure risk — increase monitoring frequency', 'severity': 'warning'})
        if is_anomaly: recs.append({'icon': '🔍', 'text': 'Anomalous sensor pattern detected — compare readings against baseline', 'severity': 'warning'})
        if not recs:   recs.append({'icon': '✅', 'text': 'All parameters within normal range — continue scheduled maintenance', 'severity': 'ok'})

        # Feature contributions
        importances = dict(zip(FEATURES[:7], clf.feature_importances_[:7]))
        top_factors = sorted(importances.items(), key=lambda x: -x[1])[:4]

        return Response({
            'input_values': values,
            'failure_probability': round(failure_prob, 1),
            'classifier_probability': round(fail_proba, 1),
            'will_fail_within_7days': will_fail,
            'confidence_score': round(confidence, 1),
            'health_status': health_status,
            'health_color': health_color,
            'estimated_days_to_failure': days,
            'is_anomaly': is_anomaly,
            'anomaly_score': round(anomaly_score, 3),
            'recommendations': recs,
            'contributing_factors': {k: round(v * 100, 1) for k, v in top_factors},
        })


class PredictionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PredictionSerializer
    def get_queryset(self):
        qs = Prediction.objects.select_related('machine')
        machine_id = self.request.query_params.get('machine')
        if machine_id:
            qs = qs.filter(machine_id=machine_id)
        return qs[:200]

class MLModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer

class TrainModelView(APIView):
    """Trigger retraining from an uploaded CSV dataset."""
    def post(self, request):
        from ml_engine.trainer import train_all_models
        from django.utils import timezone
        import os

        job = TrainingJob.objects.create(status='running')
        dataset_path = None

        if 'dataset' in request.FILES:
            f = request.FILES['dataset']
            upload_dir = Path(settings.MEDIA_ROOT) / 'uploads'
            upload_dir.mkdir(parents=True, exist_ok=True)
            fpath = upload_dir / f.name
            with open(fpath, 'wb') as fp:
                for chunk in f.chunks():
                    fp.write(chunk)
            dataset_path = str(fpath)

        try:
            result = train_all_models(dataset_path)
            MLModel.objects.filter(is_active=True).update(is_active=False)
            ts = result['version']
            for mtype in ['classifier', 'regressor', 'anomaly']:
                MLModel.objects.create(
                    model_type=mtype, version=ts,
                    model_path=result['paths'][mtype],
                    accuracy=result['metrics'].get('accuracy'),
                    f1_score=result['metrics'].get('f1'),
                    auc_score=result['metrics'].get('auc'),
                    training_samples=result['training_samples'],
                    is_active=True,
                )
            job.status = 'completed'
            job.completed_at = timezone.now()
            job.dataset_rows = result['training_samples']
            job.result_summary = result['metrics']
            job.save()
            return Response({'status': 'completed', 'metrics': result['metrics']})
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
            return Response({'error': str(e)}, status=500)
