from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.DashboardView.as_view()),
    path('sensor-trends/<int:machine_id>/', views.SensorTrendView.as_view()),
    path('health-distribution/', views.HealthDistributionView.as_view()),
    path('prediction-trends/', views.PredictionTrendView.as_view()),
]
