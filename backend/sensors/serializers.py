from rest_framework import serializers
from .models import SensorReading, SensorThreshold

class SensorReadingSerializer(serializers.ModelSerializer):
    machine_name = serializers.CharField(source='machine.name', read_only=True)
    class Meta:
        model = SensorReading
        fields = '__all__'

class SensorThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorThreshold
        fields = '__all__'
