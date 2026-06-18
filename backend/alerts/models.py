from django.db import models
from machines.models import Machine
from django.contrib.auth import get_user_model

User = get_user_model()

class Alert(models.Model):
    TYPES = [
        ('threshold_breach', 'Threshold Breach'),
        ('anomaly_detected', 'Anomaly Detected'),
        ('failure_imminent', 'Failure Imminent'),
        ('maintenance_due', 'Maintenance Due'),
        ('health_degraded', 'Health Degraded'),
    ]
    SEVERITY = [('info', 'Info'), ('warning', 'Warning'), ('critical', 'Critical')]
    STATUS = [('active', 'Active'), ('acknowledged', 'Acknowledged'), ('resolved', 'Resolved')]

    machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=30, choices=TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY)
    status = models.CharField(max_length=20, choices=STATUS, default='active')
    title = models.CharField(max_length=200)
    message = models.TextField()
    sensor_type = models.CharField(max_length=50, blank=True)
    sensor_value = models.FloatField(null=True, blank=True)
    threshold_value = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
