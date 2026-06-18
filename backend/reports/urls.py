from django.urls import path
from . import views

urlpatterns = [
    path('sensor-csv/<int:machine_id>/', views.ExportSensorCSVView.as_view()),
    path('predictions-csv/', views.ExportPredictionsCSVView.as_view()),
    path('alerts-csv/', views.ExportAlertsCSVView.as_view()),
    path('pdf/<int:machine_id>/', views.ExportPDFReportView.as_view()),
]
