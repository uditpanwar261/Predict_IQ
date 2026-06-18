from django.contrib import admin
from .models import Prediction, MLModel, TrainingJob

@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['machine', 'failure_probability', 'will_fail_within_7days', 'confidence_score', 'predicted_at']
    list_filter = ['will_fail_within_7days']

@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = ['model_type', 'version', 'accuracy', 'f1_score', 'is_active', 'trained_at']

@admin.register(TrainingJob)
class TrainingJobAdmin(admin.ModelAdmin):
    list_display = ['status', 'dataset_rows', 'started_at', 'completed_at']
