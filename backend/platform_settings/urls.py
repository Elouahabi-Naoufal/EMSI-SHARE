from django.urls import path
from .views import PlatformSettingsView, PlatformLogoView, DatabaseStatsView

urlpatterns = [
    path('settings/', PlatformSettingsView.as_view(), name='platform_settings'),
    path('logo/', PlatformLogoView.as_view(), name='platform_logo'),
    path('stats/', DatabaseStatsView.as_view(), name='database_stats'),
]