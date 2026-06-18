from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Alert
from .serializers import AlertSerializer

class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer

    def get_queryset(self):
        qs = Alert.objects.select_related('machine')
        sev = self.request.query_params.get('severity')
        stat = self.request.query_params.get('status')
        machine_id = self.request.query_params.get('machine')
        if sev: qs = qs.filter(severity=sev)
        if stat: qs = qs.filter(status=stat)
        if machine_id: qs = qs.filter(machine_id=machine_id)
        return qs[:200]

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        return Response(AlertSerializer(alert).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save()
        return Response(AlertSerializer(alert).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = Alert.objects.all()
        return Response({
            'total': qs.count(),
            'active': qs.filter(status='active').count(),
            'critical': qs.filter(severity='critical', status='active').count(),
            'warning': qs.filter(severity='warning', status='active').count(),
        })
