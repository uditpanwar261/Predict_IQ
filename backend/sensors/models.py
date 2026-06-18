from django.db import models
from machines.models import Machine

class SensorReading(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='sensor_readings')
    timestamp = models.DateTimeField(auto_now_add=True)
    temperature = models.FloatField()      # Celsius
    vibration = models.FloatField()        # mm/s RMS
    pressure = models.FloatField()         # Bar
    current = models.FloatField()          # Amperes
    rpm = models.FloatField()              # Rotations per minute
    oil_level = models.FloatField()        # Percentage
    noise_level = models.FloatField()      # dB
    is_anomaly = models.BooleanField(default=False)
    anomaly_score = models.FloatField(default=0.0)
    source = models.CharField(max_length=20, default='simulator')  # simulator, mqtt, api

    class Meta:
        ordering = ['-timestamp']
        indexes = [models.Index(fields=['machine', 'timestamp'])]

    def __str__(self):
        return f"{self.machine.name} @ {self.timestamp}"

class SensorThreshold(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='thresholds')
    sensor_type = models.CharField(max_length=50)
    warning_min = models.FloatField(null=True, blank=True)
    warning_max = models.FloatField(null=True, blank=True)
    critical_min = models.FloatField(null=True, blank=True)
    critical_max = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ['machine', 'sensor_type']
