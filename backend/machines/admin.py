from django.contrib import admin
from .models import Machine, MaintenanceLog

@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ['name', 'machine_type', 'location', 'status', 'health_status', 'health_score']
    list_filter = ['status', 'health_status', 'machine_type']
    search_fields = ['name', 'location', 'serial_number']

@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ['machine', 'maintenance_type', 'performed_at', 'performed_by']
    list_filter = ['maintenance_type']
