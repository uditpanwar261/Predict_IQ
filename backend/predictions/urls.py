from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('history', views.PredictionViewSet, basename='prediction')
router.register('models', views.MLModelViewSet, basename='ml-model')

urlpatterns = [
    path('', include(router.urls)),
    path('predict/', views.ManualPredictView.as_view()),
    path('train/', views.TrainModelView.as_view()),
]
