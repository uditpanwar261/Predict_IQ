from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('', views.MachineViewSet, basename='machine')
router.register('maintenance-logs', views.MaintenanceLogViewSet, basename='maintenance-log')

urlpatterns = [path('', include(router.urls))]
