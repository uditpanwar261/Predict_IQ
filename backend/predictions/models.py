from django.db import models
from machines.models import Machine

class MLModel(models.Model):
    MODEL_TYPES = [
        ('classifier', 'Failure Classifier (XGBoost)'),
        ('regressor', 'Probability Regressor (Random Forest)'),
        ('anomaly', 'Anomaly Detector (Isolation Forest)'),
    ]
    model_type = models.CharField(max_length=30, choices=MODEL_TYPES)
    version = models.CharField(max_length=20)
    accuracy = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    auc_score = models.FloatField(null=True, blank=True)
    training_samples = models.IntegerField(default=0)
    model_path = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    trained_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-trained_at']

class Prediction(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='predictions')
    ml_model = models.ForeignKey(MLModel, on_delete=models.SET_NULL, null=True)
    predicted_at = models.DateTimeField(auto_now_add=True)
    failure_probability = models.FloatField()       # 0-100
    will_fail_within_7days = models.BooleanField()
    estimated_days_to_failure = models.IntegerField(null=True, blank=True)
    confidence_score = models.FloatField()          # 0-100
    contributing_factors = models.JSONField(default=dict)
    recommendations = models.JSONField(default=list)
    actual_failed = models.BooleanField(null=True, blank=True)

    class Meta:
        ordering = ['-predicted_at']

class TrainingJob(models.Model):
    STATUS = [('pending', 'Pending'), ('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed')]
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    dataset_path = models.CharField(max_length=500, blank=True)
    dataset_rows = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    result_summary = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
