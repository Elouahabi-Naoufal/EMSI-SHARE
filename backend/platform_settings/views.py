from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PlatformSettings, DatabaseStats
from .serializers import PlatformSettingsSerializer, DatabaseStatsSerializer
import psycopg2
import json
from pathlib import Path

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
        config_path = Path(__file__).resolve().parent.parent / 'db_config.json'
        config = {}
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
        return Response({
            'db_host': config.get('db_host', ''),
            'db_port': config.get('db_port', ''),
            'db_name': config.get('db_name', ''),
            'db_user': config.get('db_user', ''),
            'db_password': config.get('db_password', ''),
        })

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        config = {k: request.data.get(k, '') for k in ['db_host', 'db_port', 'db_name', 'db_user', 'db_password']}
        config_path = Path(__file__).resolve().parent.parent / 'db_config.json'
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

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