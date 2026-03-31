from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AcademicCalendarEntryViewSet

router = DefaultRouter()
router.register(r'calendar', AcademicCalendarEntryViewSet, basename='calendar')

urlpatterns = [path('', include(router.urls))]
