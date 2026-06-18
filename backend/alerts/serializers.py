from rest_framework import serializers
from .models import Alert

class AlertSerializer(serializers.ModelSerializer):
    machine_name = serializers.CharField(source='machine.name', read_only=True)
    class Meta:
        model = Alert
        fields = '__all__'
