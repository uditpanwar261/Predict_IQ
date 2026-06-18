from django.contrib import admin
from .models import SensorReading, SensorThreshold

@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['machine', 'timestamp', 'temperature', 'vibration', 'pressure', 'is_anomaly', 'source']
    list_filter = ['is_anomaly', 'source', 'machine']
    readonly_fields = ['timestamp']

@admin.register(SensorThreshold)
class SensorThresholdAdmin(admin.ModelAdmin):
    list_display = ['machine', 'sensor_type', 'warning_min', 'warning_max', 'critical_min', 'critical_max']
