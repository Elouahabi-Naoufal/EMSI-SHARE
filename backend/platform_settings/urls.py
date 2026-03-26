from django.urls import path
from .views import (
    PlatformPublicView, PlatformSettingsView, PlatformLogoView, DatabaseStatsView,
    DatabaseConfigView, DatabaseConfigTestView,
    SSHConfigView, SSHTestView, SSHExecuteView, SSHCommandsListView,
)

urlpatterns = [
    path('public/',             PlatformPublicView.as_view(),    name='platform_public'),
    path('settings/',           PlatformSettingsView.as_view(),  name='platform_settings'),
    path('logo/',               PlatformLogoView.as_view(),       name='platform_logo'),
    path('stats/',              DatabaseStatsView.as_view(),      name='database_stats'),
    path('db-config/',          DatabaseConfigView.as_view(),     name='db_config'),
    path('db-config/test/',     DatabaseConfigTestView.as_view(), name='db_config_test'),
    path('ssh/',                SSHConfigView.as_view(),          name='ssh_config'),
    path('ssh/test/',           SSHTestView.as_view(),            name='ssh_test'),
    path('ssh/execute/',        SSHExecuteView.as_view(),         name='ssh_execute'),
    path('ssh/commands/',       SSHCommandsListView.as_view(),    name='ssh_commands'),
]