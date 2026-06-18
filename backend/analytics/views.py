from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Avg, Q
from machines.models import Machine
from sensors.models import SensorReading
from predictions.models import Prediction
from alerts.models import Alert

class DashboardView(APIView):
    def get(self, request):
        machines = Machine.objects.all()
        total = machines.count()
        healthy = machines.filter(health_status='healthy').count()
        warning = machines.filter(health_status='warning').count()
        critical = machines.filter(health_status='critical').count()
        active_alerts = Alert.objects.filter(status='active').count()
        critical_alerts = Alert.objects.filter(status='active', severity='critical').count()
        recent_predictions = Prediction.objects.filter(
            predicted_at__gte=timezone.now() - timedelta(days=1)
        ).count()
        high_risk = Prediction.objects.filter(
            predicted_at__gte=timezone.now() - timedelta(hours=6),
            failure_probability__gte=70
        ).select_related('machine').order_by('-failure_probability')[:5]

        avg_health = machines.aggregate(avg=Avg('health_score'))['avg'] or 0

        return Response({
            'machines': {'total': total, 'healthy': healthy, 'warning': warning, 'critical': critical},
            'alerts': {'active': active_alerts, 'critical': critical_alerts},
            'predictions_today': recent_predictions,
            'average_health_score': round(avg_health, 1),
            'high_risk_machines': [
                {
                    'machine_id': p.machine_id,
                    'machine_name': p.machine.name,
                    'failure_probability': p.failure_probability,
                    'will_fail_soon': p.will_fail_within_7days,
                }
                for p in high_risk
            ],
            'recent_alerts': [
                {
                    'id': a.id,
                    'title': a.title,
                    'severity': a.severity,
                    'machine_name': a.machine.name,
                    'created_at': a.created_at,
                }
                for a in Alert.objects.filter(status='active').select_related('machine').order_by('-created_at')[:8]
            ]
        })

class SensorTrendView(APIView):
    def get(self, request, machine_id):
        hours = int(request.query_params.get('hours', 24))
        since = timezone.now() - timedelta(hours=hours)
        readings = SensorReading.objects.filter(
            machine_id=machine_id, timestamp__gte=since
        ).order_by('timestamp').values(
            'timestamp', 'temperature', 'vibration', 'pressure', 'current', 'rpm', 'oil_level', 'noise_level', 'is_anomaly'
        )[:500]
        return Response({'readings': list(readings)})

class HealthDistributionView(APIView):
    def get(self, request):
        machines = Machine.objects.values('machine_type').annotate(
            count=Count('id'),
            avg_health=Avg('health_score'),
            healthy=Count('id', filter=Q(health_status='healthy')),
            warning=Count('id', filter=Q(health_status='warning')),
            critical=Count('id', filter=Q(health_status='critical')),
        )
        return Response({'by_type': list(machines)})

class PredictionTrendView(APIView):
    def get(self, request):
        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timedelta(days=days)
        preds = Prediction.objects.filter(predicted_at__gte=since).order_by('predicted_at')
        return Response({
            'predictions': list(preds.values(
                'predicted_at', 'failure_probability', 'will_fail_within_7days',
                'machine__name', 'machine_id'
            )[:500])
        })
