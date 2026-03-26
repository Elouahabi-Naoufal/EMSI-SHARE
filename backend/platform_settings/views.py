from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PlatformSettings, DatabaseStats
from .serializers import PlatformSettingsSerializer, DatabaseStatsSerializer
import psycopg2
import json
import io
import paramiko
from pathlib import Path

CONFIG_PATH = Path(__file__).resolve().parent.parent / 'db_config.json'

WHITELISTED_COMMANDS = {
    'run_migrations':   'cd ~/app && source env/bin/activate && python manage.py migrate --no-input',
    'restart_server':   'sudo systemctl restart gunicorn',
    'collect_static':   'cd ~/app && source env/bin/activate && python manage.py collectstatic --no-input',
    'disk_usage':       'df -h',
    'memory_usage':     'free -h',
    'cpu_load':         'uptime',
    'logs_django':      'sudo journalctl -u gunicorn -n 50 --no-pager',
    'logs_nginx':       'sudo tail -n 50 /var/log/nginx/error.log',
    'list_processes':   'ps aux --sort=-%mem | head -20',
    'check_ports':      'ss -tlnp',
}


def _load_config():
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            return json.load(f)
    return {}


def _save_config(data):
    config = _load_config()
    config.update(data)
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)


def _ssh_connect(config):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kwargs = dict(
        hostname=config.get('ssh_host', 'localhost'),
        port=int(config.get('ssh_port', 22)),
        username=config.get('ssh_user', ''),
        timeout=10,
    )
    if config.get('ssh_auth_type') == 'key' and config.get('ssh_private_key'):
        key_str = config['ssh_private_key']
        for key_class in (paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey, paramiko.DSSKey):
            try:
                kwargs['pkey'] = key_class.from_private_key(io.StringIO(key_str))
                break
            except Exception:
                continue
    else:
        kwargs['password'] = config.get('ssh_password', '')
    client.connect(**kwargs)
    return client

class PlatformSettingsView(APIView):
    """
    API endpoint for platform settings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get platform settings"""
        # Allow unauthenticated access to check registration status
        if not request.user.is_authenticated:
            settings = PlatformSettings.get_settings()
            return Response({
                'generalSettings': {
                    'enableRegistration': settings.enable_registration
                }
            })
        
        if request.user.role not in ['admin', 'administration']:
            return Response(
                {"detail": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings = PlatformSettings.get_settings()
        serializer = PlatformSettingsSerializer(settings)
        return Response(serializer.data)
    
    def post(self, request):
        """Update platform settings"""
        if request.user.role not in ['admin', 'administration']:
            return Response(
                {"detail": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings = PlatformSettings.get_settings()
        data = request.data
        
        # Update platform name
        if 'platformName' in data:
            settings.platform_name = data['platformName']
        
        # Update page sizes
        if 'pageSizes' in data:
            page_sizes = data['pageSizes']
            if 'resources' in page_sizes:
                settings.resources_per_page = page_sizes['resources']
            if 'forumPosts' in page_sizes:
                settings.forum_posts_per_page = page_sizes['forumPosts']
            if 'events' in page_sizes:
                settings.events_per_page = page_sizes['events']
            if 'users' in page_sizes:
                settings.users_per_page = page_sizes['users']
        
        # Update general settings
        if 'generalSettings' in data:
            general = data['generalSettings']
            if 'enableRegistration' in general:
                settings.enable_registration = general['enableRegistration']
            if 'maintenanceMode' in general:
                settings.maintenance_mode = general['maintenanceMode']
            if 'publicProfiles' in general:
                settings.public_profiles = general['publicProfiles']
        
        # Update security settings
        if 'securitySettings' in data:
            security = data['securitySettings']
            if 'passwordPolicy' in security:
                settings.password_policy = security['passwordPolicy']
            if 'sessionTimeout' in security:
                settings.session_timeout = security['sessionTimeout']
        
        settings.save()
        
        serializer = PlatformSettingsSerializer(settings)
        return Response(serializer.data)

class PlatformLogoView(APIView):
    """
    API endpoint for platform logo
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update platform logo"""
        if request.user.role not in ['admin', 'administration']:
            return Response(
                {"detail": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings = PlatformSettings.get_settings()
        
        if 'logo' in request.data:
            settings.logo = request.data['logo']
            settings.save()
            
            return Response({
                "message": "Logo updated successfully",
                "logo": settings.logo
            })
        
        return Response(
            {"detail": "No logo provided"},
            status=status.HTTP_400_BAD_REQUEST
        )

class DatabaseConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        config = _load_config()
        return Response({
            'db_host':     config.get('db_host', ''),
            'db_port':     config.get('db_port', ''),
            'db_name':     config.get('db_name', ''),
            'db_user':     config.get('db_user', ''),
            'db_password': config.get('db_password', ''),
        })

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        _save_config({k: request.data.get(k, '') for k in ['db_host', 'db_port', 'db_name', 'db_user', 'db_password']})
        return Response({"message": "Database configuration saved. Restart the server to apply."})


class DatabaseConfigTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            conn = psycopg2.connect(
                host=request.data.get('db_host', 'localhost'),
                port=request.data.get('db_port', '5432'),
                dbname=request.data.get('db_name'),
                user=request.data.get('db_user'),
                password=request.data.get('db_password'),
                connect_timeout=5,
            )
            conn.close()
            return Response({"success": True, "message": "Connection successful!"})
        except Exception as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SSHConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        config = _load_config()
        return Response({
            'ssh_host':         config.get('ssh_host', ''),
            'ssh_port':         config.get('ssh_port', '22'),
            'ssh_user':         config.get('ssh_user', ''),
            'ssh_auth_type':    config.get('ssh_auth_type', 'password'),  # 'password' | 'key'
            'ssh_password':     config.get('ssh_password', ''),
            'ssh_private_key':  config.get('ssh_private_key', ''),
        })

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        fields = ['ssh_host', 'ssh_port', 'ssh_user', 'ssh_auth_type', 'ssh_password', 'ssh_private_key']
        _save_config({k: request.data.get(k, '') for k in fields})
        return Response({"message": "SSH configuration saved."})


class SSHTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            client = _ssh_connect(request.data)
            client.close()
            return Response({"success": True, "message": "SSH connection successful!"})
        except Exception as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SSHExecuteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        command_key = request.data.get('command_key')
        if command_key not in WHITELISTED_COMMANDS:
            return Response({"detail": "Invalid command."}, status=status.HTTP_400_BAD_REQUEST)

        config = _load_config()
        if not config.get('ssh_host'):
            return Response({"detail": "SSH not configured."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = _ssh_connect(config)
            _, stdout, stderr = client.exec_command(WHITELISTED_COMMANDS[command_key], timeout=30)
            out = stdout.read().decode(errors='replace')
            err = stderr.read().decode(errors='replace')
            exit_code = stdout.channel.recv_exit_status()
            client.close()
            return Response({
                'success': exit_code == 0,
                'output': out,
                'error': err,
                'exit_code': exit_code,
            })
        except Exception as e:
            return Response({"success": False, "output": "", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SSHCommandsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        return Response([{'key': k, 'command': v} for k, v in WHITELISTED_COMMANDS.items()])


class DatabaseStatsView(APIView):
    """
    API endpoint for database statistics
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get real-time database statistics"""
        if request.user.role not in ['admin', 'administration']:
            return Response(
                {"detail": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            stats = DatabaseStats.get_stats()
            return Response(stats)
        except Exception as e:
            return Response(
                {"detail": f"Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )