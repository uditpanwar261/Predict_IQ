from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import SensorReading, SensorThreshold
from .serializers import SensorReadingSerializer, SensorThresholdSerializer
from machines.models import Machine
from ml_engine.simulator import generate_reading, compute_health_score
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

class SensorReadingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SensorReadingSerializer

    def get_queryset(self):
        qs = SensorReading.objects.select_related('machine')
        machine_id = self.request.query_params.get('machine')
        limit = int(self.request.query_params.get('limit', 100))
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if machine_id: qs = qs.filter(machine_id=machine_id)
        if date_from: qs = qs.filter(timestamp__gte=date_from)
        if date_to: qs = qs.filter(timestamp__lte=date_to)
        return qs[:limit]

class SimulateReadingView(APIView):
    """Generate a virtual sensor reading for a machine."""
    def post(self, request, machine_id):
        try:
            machine = Machine.objects.get(pk=machine_id)
        except Machine.DoesNotExist:
            return Response({'error': 'Machine not found'}, status=404)

        data = generate_reading(machine.machine_type, machine.health_score)
        reading = SensorReading.objects.create(machine=machine, source='simulator', **data)

        # Update machine health
        recent = list(SensorReading.objects.filter(machine=machine).values(
            'temperature', 'vibration', 'pressure', 'current', 'rpm', 'oil_level', 'noise_level'
        )[:10])
        new_score = compute_health_score(recent)
        machine.health_score = new_score
        machine.update_health_status()

        # Check thresholds and create alerts
        from alerts.models import Alert
        checks = [
            ('temperature', data['temperature'], 90, 110, '°C'),
            ('vibration', data['vibration'], 5, 8, 'mm/s'),
            ('oil_level', data['oil_level'], 40, 20, '%', True),
        ]
        for check in checks:
            sensor, val, warn_t, crit_t, unit = check[:5]
            is_low = len(check) > 5
            is_warn = (val < warn_t) if is_low else (val > warn_t)
            is_crit = (val < crit_t) if is_low else (val > crit_t)
            if is_crit:
                Alert.objects.get_or_create(
                    machine=machine, alert_type='threshold_breach',
                    status='active', sensor_type=sensor,
                    defaults={
                        'severity': 'critical',
                        'title': f'Critical {sensor.replace("_"," ").title()} on {machine.name}',
                        'message': f'{sensor.replace("_"," ").title()} is {val}{unit} — exceeds critical threshold of {crit_t}{unit}',
                        'sensor_value': val, 'threshold_value': crit_t,
                    }
                )
            elif is_warn:
                Alert.objects.get_or_create(
                    machine=machine, alert_type='threshold_breach',
                    status='active', sensor_type=sensor,
                    defaults={
                        'severity': 'warning',
                        'title': f'Warning: {sensor.replace("_"," ").title()} on {machine.name}',
                        'message': f'{sensor.replace("_"," ").title()} is {val}{unit} — above warning threshold of {warn_t}{unit}',
                        'sensor_value': val, 'threshold_value': warn_t,
                    }
                )

        return Response(SensorReadingSerializer(reading).data, status=201)

class BulkSimulateView(APIView):
    """Simulate readings for all active machines."""
    def post(self, request):
        machines = Machine.objects.filter(status='active')
        results = []
        for machine in machines:
            data = generate_reading(machine.machine_type, machine.health_score)
            r = SensorReading.objects.create(machine=machine, source='simulator', **data)
            results.append({'machine_id': machine.id, 'reading_id': r.id})
        return Response({'simulated': len(results), 'results': results})
