from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Machine(models.Model):
    TYPES = [
        ('motor', 'Electric Motor'), ('pump', 'Pump'), ('compressor', 'Compressor'),
        ('conveyor', 'Conveyor Belt'), ('turbine', 'Turbine'), ('generator', 'Generator'),
        ('hvac', 'HVAC System'), ('robot', 'Industrial Robot'),
    ]
    STATUS = [('active', 'Active'), ('maintenance', 'Under Maintenance'), ('inactive', 'Inactive'), ('decommissioned', 'Decommissioned')]

    name = models.CharField(max_length=200)
    machine_type = models.CharField(max_length=50, choices=TYPES)
    model_number = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, blank=True, unique=True, null=True)
    location = models.CharField(max_length=200)
    manufacturer = models.CharField(max_length=200, blank=True)
    install_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS, default='active')
    health_score = models.FloatField(default=100.0)
    health_status = models.CharField(max_length=20, default='healthy')
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.location})"

    def update_health_status(self):
        if self.health_score >= 75:
            self.health_status = 'healthy'
        elif self.health_score >= 45:
            self.health_status = 'warning'
        else:
            self.health_status = 'critical'
        self.save(update_fields=['health_status', 'health_score'])

class MaintenanceLog(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='maintenance_logs')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    maintenance_type = models.CharField(max_length=100)
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    performed_at = models.DateTimeField()
    next_scheduled = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
