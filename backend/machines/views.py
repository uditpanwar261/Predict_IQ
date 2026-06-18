from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Machine, MaintenanceLog
from .serializers import MachineSerializer, MaintenanceLogSerializer

class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.all().order_by('-created_at')
    serializer_class = MachineSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        machine_type = self.request.query_params.get('type')
        if status_filter: qs = qs.filter(status=status_filter)
        if machine_type: qs = qs.filter(machine_type=machine_type)
        return qs

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        machine = self.get_object()
        from sensors.models import SensorReading
        from predictions.models import Prediction
        from alerts.models import Alert
        recent = SensorReading.objects.filter(machine=machine).first()
        latest_pred = Prediction.objects.filter(machine=machine).first()
        active_alerts = Alert.objects.filter(machine=machine, status='active').count()
        return Response({
            'machine': MachineSerializer(machine).data,
            'latest_reading': {
                'temperature': recent.temperature if recent else None,
                'vibration': recent.vibration if recent else None,
                'pressure': recent.pressure if recent else None,
                'current': recent.current if recent else None,
                'rpm': recent.rpm if recent else None,
                'oil_level': recent.oil_level if recent else None,
                'noise_level': recent.noise_level if recent else None,
                'timestamp': recent.timestamp if recent else None,
            } if recent else None,
            'latest_prediction': {
                'failure_probability': latest_pred.failure_probability if latest_pred else None,
                'will_fail_within_7days': latest_pred.will_fail_within_7days if latest_pred else None,
                'recommendations': latest_pred.recommendations if latest_pred else [],
                'predicted_at': latest_pred.predicted_at if latest_pred else None,
            } if latest_pred else None,
            'active_alerts': active_alerts,
        })

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceLogSerializer
    def get_queryset(self):
        machine_id = self.request.query_params.get('machine')
        qs = MaintenanceLog.objects.all().order_by('-performed_at')
        if machine_id: qs = qs.filter(machine_id=machine_id)
        return qs
    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)
