from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse, Http404
from django.utils.encoding import smart_str
from django.utils import timezone
from django.db.models import Q
from .models import Resource, ResourceCategory
from .serializers import ResourceSerializer, ResourceCategorySerializer
from rooms.permissions import IsOwnerOrReadOnly
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend # Add this line
from rest_framework import filters
import logging

logger = logging.getLogger(__name__)

class ResourceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ResourceCategory.objects.all()
    serializer_class = ResourceCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ResourceViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Resource.objects.all()
        room_id = self.request.query_params.get('room', None)

        if room_id is None:
            # If no room_id is provided, exclude resources that are associated with any room
            queryset = queryset.filter(room__isnull=True)
        
        return queryset
    serializer_class = ResourceSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category__name', 'uploaded_by__id', 'room']
    search_fields = ['title', 'description', 'uploaded_by__first_name', 'uploaded_by__last_name']
    ordering_fields = ['created_at', 'title']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        elif self.action == 'destroy':
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()
    
    def destroy(self, request, *args, **kwargs):
        """Delete a resource - only owner or administration can delete"""
        resource = self.get_object()
        user = request.user
        
        # Check if user can delete this resource
        if user.role == 'administration' or resource.uploaded_by == user:
            return super().destroy(request, *args, **kwargs)
        else:
            return Response(
                {"detail": "You do not have permission to delete this resource."},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Request data: {request.data}")
        logger.info(f"Request files: {request.FILES}")
        
        # Check if file_data is in FILES
        if 'file_data' not in request.FILES:
            return Response(
                {'error': 'No file provided. Please include file_data field.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        resource = serializer.save()
        from audit_logs.utils import log_action
        log_action(self.request.user, 'resource_uploaded', 'Resource', resource.id,
                   {'title': resource.title, 'type': resource.type}, self.request)

    def perform_destroy(self, instance):
        from audit_logs.utils import log_action
        log_action(self.request.user, 'resource_deleted', 'Resource', instance.id,
                   {'title': instance.title}, self.request)
        instance.delete()
    def download(self, request, pk=None):
        try:
            resource = Resource.objects.get(pk=pk)
            if resource.file_data:
                # Create response with binary data
                response = HttpResponse(
                    resource.file_data,
                    content_type=resource.file_type or 'application/octet-stream'
                )
                
                # Set proper filename in Content-Disposition header
                filename = resource.file_name or f"resource_{resource.id}"
                response['Content-Disposition'] = f'attachment; filename="{smart_str(filename)}"'
                response['Content-Length'] = len(resource.file_data)
                from audit_logs.utils import log_action
                log_action(request.user, 'resource_downloaded', 'Resource', resource.id, {'title': resource.title}, request)
                return response
            else:
                return Response(
                    {'error': 'No file data available for this resource'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Resource.DoesNotExist:
            raise Http404("Resource not found")
            
    @action(detail=True, methods=['post'], url_path='bookmark')
    def bookmark(self, request, pk=None):
        try:
            resource = Resource.objects.get(pk=pk)
            # Increment bookmark count
            resource.bookmark_count += 1
            resource.save(update_fields=['bookmark_count'])
            
            return Response({
                'status': 'success',
                'bookmark_count': resource.bookmark_count
            })
        except Resource.DoesNotExist:
            raise Http404("Resource not found")
    
    @action(detail=True, methods=['post'], url_path='approve', permission_classes=[permissions.IsAuthenticated])
    def approve_resource(self, request, pk=None):
        """Approve a pending resource"""
        user = request.user
        if user.role not in ['admin', 'administration']:
            return Response(
                {"detail": "You do not have permission to approve resources."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            resource = Resource.objects.get(pk=pk)
            
            if resource.status != 'pending':
                return Response(
                    {"detail": "Only pending resources can be approved."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            resource.status = 'approved'
            resource.reviewed_by = user
            resource.reviewed_at = timezone.now()
            resource.save()
            
            from audit_logs.utils import log_action
            log_action(user, 'resource_approved', 'Resource', resource.id, {'title': resource.title}, request)
            
            # Create notification for the student
            from notifications.models import Notification, NotificationType
            notification_type, _ = NotificationType.objects.get_or_create(
                name='resource_approved',
                defaults={
                    'description': 'Resource approval notifications',
                    'icon': 'check-circle',
                    'color': '#4CAF50'
                }
            )
            
            Notification.objects.create(
                recipient=resource.uploaded_by,
                sender=user,
                notification_type=notification_type,
                title="Resource Approved",
                message=f"Your resource '{resource.title}' has been approved and is now available.",
                action_url=f"/resources/{resource.id}",
                action_text="View Resource"
            )
            
            return Response({"detail": "Resource approved successfully."})
            
        except Resource.DoesNotExist:
            raise Http404("Resource not found")
    
    @action(detail=True, methods=['post'], url_path='reject', permission_classes=[permissions.IsAuthenticated])
    def reject_resource(self, request, pk=None):
        """Reject a pending resource"""
        user = request.user
        if user.role not in ['admin', 'administration']:
            return Response(
                {"detail": "You do not have permission to reject resources."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            resource = Resource.objects.get(pk=pk)
            
            if resource.status != 'pending':
                return Response(
                    {"detail": "Only pending resources can be rejected."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            reason = request.data.get('reason', '')
            if not reason:
                return Response(
                    {"detail": "Rejection reason is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            resource.status = 'rejected'
            resource.rejection_reason = reason
            resource.reviewed_by = user
            resource.reviewed_at = timezone.now()
            resource.save()
            
            from audit_logs.utils import log_action
            log_action(user, 'resource_rejected', 'Resource', resource.id, {'title': resource.title, 'reason': reason}, request)
            
            # Create notification for the student
            from notifications.models import Notification, NotificationType
            notification_type, _ = NotificationType.objects.get_or_create(
                name='resource_rejected',
                defaults={
                    'description': 'Resource rejection notifications',
                    'icon': 'x-circle',
                    'color': '#F44336'
                }
            )
            
            Notification.objects.create(
                recipient=resource.uploaded_by,
                sender=user,
                notification_type=notification_type,
                title="Resource Rejected",
                message=f"Your resource '{resource.title}' was not approved. Reason: {reason}",
                action_url=f"/resources/my-rejected",
                action_text="View Rejected Resources"
            )
            
            return Response({"detail": "Resource rejected successfully."})
            
        except Resource.DoesNotExist:
            raise Http404("Resource not found")
            