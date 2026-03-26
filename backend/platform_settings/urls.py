from django.urls import path
from .views import PlatformSettingsView, PlatformLogoView, DatabaseStatsView, DatabaseConfigView, DatabaseConfigTestView

urlpatterns = [
    path('settings/', PlatformSettingsView.as_view(), name='platform_settings'),
    path('logo/', PlatformLogoView.as_view(), name='platform_logo'),
    path('stats/', DatabaseStatsView.as_view(), name='database_stats'),
    path('db-config/', DatabaseConfigView.as_view(), name='db_config'),
    path('db-config/test/', DatabaseConfigTestView.as_view(), name='db_config_test'),
]