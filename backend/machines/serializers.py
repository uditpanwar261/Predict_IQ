from rest_framework import serializers
from .models import Machine, MaintenanceLog

class MachineSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    class Meta:
        model = Machine
        fields = '__all__'
        read_only_fields = ['created_by', 'health_score', 'health_status', 'created_at', 'updated_at']

class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = '__all__'
        read_only_fields = ['created_at']
