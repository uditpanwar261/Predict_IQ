from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('readings', views.SensorReadingViewSet, basename='sensor-reading')

urlpatterns = [
    path('', include(router.urls)),
    path('simulate/<int:machine_id>/', views.SimulateReadingView.as_view()),
    path('simulate-all/', views.BulkSimulateView.as_view()),
]
