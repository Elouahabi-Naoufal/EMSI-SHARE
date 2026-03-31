from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from .models import Event, EventAttendee, EventCollaborator
from .serializers import EventSerializer, EventAttendeeSerializer, EventCollaboratorSerializer, UserSerializer
from rooms.permissions import IsOwnerOrReadOnly
from datetime import datetime, timedelta

User = get_user_model()

class IsAdminOrAdministrationOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admin and administration users to create events.
    Teachers and students can only read events and attend them.
    """
    def has_permission(self, request, view):
        # Allow read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are only allowed to admin and administration users
        return request.user.role in ['admin', 'administration']
        
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are allowed to:
        # 1. Admin and administration users who created the event
        # 2. Event collaborators with admin privileges
        if request.user.role in ['admin', 'administration'] and obj.created_by == request.user:
            return True
            
        # Check if user is a collaborator with admin privileges
        return obj.can_edit(request.user)
        
class EventPermission(permissions.BasePermission):
    """
    Custom permission to allow event creators and collaborators with admin privileges to edit events
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return obj.can_edit(request.user)

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrAdministrationOrReadOnly]
    
    @action(detail=True, methods=['get'])
    def image(self, request, pk=None):
        event = self.get_object()
        
        if not event.image_data:
            return Response({"error": "No image found"}, status=status.HTTP_404_NOT_FOUND)
        
        response = HttpResponse(
            event.image_data,
            content_type=event.image_type
        )
        
        # Set filename for download
        filename = event.image_name or 'event_image'
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        
        return response
    
    @action(detail=True, methods=['get'])
    def video(self, request, pk=None):
        event = self.get_object()
        
        if not event.video_data:
            return Response({"error": "No video found"}, status=status.HTTP_404_NOT_FOUND)
        
        response = HttpResponse(
            event.video_data,
            content_type=event.video_type
        )
        
        # Set filename for download
        filename = event.video_name or 'event_video'
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        
        return response
    
    def get_queryset(self):
        queryset = Event.objects.all()
        
        # Filter by room
        room_id = self.request.query_params.get('room', None)
        if room_id:
            queryset = queryset.filter(room=room_id)
        
        # Filter by event type
        event_type = self.request.query_params.get('type', None)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(start_time__date__gte=start_date)
            except ValueError:
                pass
                
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(start_time__date__lte=end_date)
            except ValueError:
                pass
        
        # Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )
        
        # Filter by time period
        period = self.request.query_params.get('period', None)
        today = datetime.now().date()
        
        if period == 'today':
            queryset = queryset.filter(start_time__date=today)
        elif period == 'tomorrow':
            tomorrow = today + timedelta(days=1)
            queryset = queryset.filter(start_time__date=tomorrow)
        elif period == 'week':
            week_end = today + timedelta(days=7)
            queryset = queryset.filter(start_time__date__gte=today, start_time__date__lte=week_end)
        elif period == 'month':
            month_end = today + timedelta(days=30)
            queryset = queryset.filter(start_time__date__gte=today, start_time__date__lte=month_end)
        elif period == 'past':
            queryset = queryset.filter(end_time__date__lt=today)
        
        # Filter by attendance
        attendance = self.request.query_params.get('attendance', None)
        if attendance and self.request.user.is_authenticated:
            if attendance == 'attending':
                queryset = queryset.filter(attendees__user=self.request.user, attendees__status='attending')
            elif attendance == 'maybe':
                queryset = queryset.filter(attendees__user=self.request.user, attendees__status='maybe')
            elif attendance == 'declined':
                queryset = queryset.filter(attendees__user=self.request.user, attendees__status='declined')
            elif attendance == 'all':
                queryset = queryset.filter(attendees__user=self.request.user)
        
        return queryset.distinct()
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAuthenticated, EventPermission]
        return super().get_permissions()

    def perform_create(self, serializer):
        event = serializer.save()
        from audit_logs.utils import log_action
        log_action(self.request.user, 'event_created', 'Event', event.id, {'title': event.title}, self.request)

    def perform_destroy(self, instance):
        from audit_logs.utils import log_action
        log_action(self.request.user, 'event_deleted', 'Event', instance.id, {'title': instance.title}, self.request)
        instance.delete()
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def attend(self, request, pk=None):
        event = self.get_object()
        status_value = request.data.get('status', 'attending')
        
        if status_value not in ['attending', 'maybe', 'declined']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        attendance, created = EventAttendee.objects.update_or_create(
            event=event,
            user=request.user,
            defaults={'status': status_value}
        )
        
        # Create notification for the user
        from notifications.models import Notification, NotificationType
        
        notification_type, _ = NotificationType.objects.get_or_create(
            name='event_registration',
            defaults={
                'description': 'Event registration notifications',
                'icon': 'calendar',
                'color': '#4CAF50'
            }
        )
        
        Notification.objects.create(
            recipient=request.user,
            notification_type=notification_type,
            title=f"Event Registration",
            message=f"You have successfully registered for {event.title}",
            event=event,
            action_url=f"/events/{event.id}",
            action_text="View Event"
        )
        
        serializer = EventAttendeeSerializer(attendance)
        from audit_logs.utils import log_action
        log_action(request.user, 'event_attended', 'Event', event.id, {'title': event.title, 'status': status_value}, request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel_attendance(self, request, pk=None):
        event = self.get_object()
        
        try:
            attendance = EventAttendee.objects.get(event=event, user=request.user)
            attendance.delete()
            return Response({'status': 'attendance cancelled'})
        except EventAttendee.DoesNotExist:
            return Response({'error': 'Not attending this event'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def attendees(self, request, pk=None):
        event = self.get_object()
        try:
            attendees = event.attendees.all()
            
            status_filter = request.query_params.get('status', None)
            if status_filter:
                attendees = attendees.filter(status=status_filter)
            
            serializer = EventAttendeeSerializer(attendees, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error fetching attendees: {str(e)}")
            return Response([], status=status.HTTP_200_OK)
        
    @action(detail=True, methods=['post'])
    def auto_register_collaborators(self, request, pk=None):
        """Auto-register event creator and collaborators as attendees"""
        event = self.get_object()
        registered_count = 0
        
        # Register the event creator if not already registered
        creator_attendance, created = EventAttendee.objects.get_or_create(
            event=event,
            user=event.created_by,
            defaults={'status': 'attending'}
        )
        if created:
            registered_count += 1
            
        # Register all collaborators if not already registered
        for collaborator in EventCollaborator.objects.filter(event=event):
            attendee, created = EventAttendee.objects.get_or_create(
                event=event,
                user=collaborator.user,
                defaults={'status': 'attending'}
            )
            if created:
                registered_count += 1
                
        return Response({
            "success": True,
            "registered_count": registered_count
        })
        
    @action(detail=True, methods=['get'])
    def collaborators(self, request, pk=None):
        event = self.get_object()
        collaborators = EventCollaborator.objects.filter(event=event)
        serializer = EventCollaboratorSerializer(collaborators, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_collaborator(self, request, pk=None):
        event = self.get_object()
        
        # Check if user has permission to add collaborators
        if not event.can_edit(request.user):
            return Response(
                {"detail": "You don't have permission to add collaborators to this event."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        is_admin = request.data.get('is_admin', False)
        
        if not user_id:
            return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check if user is a teacher or student
            if user.role not in ['teacher', 'student']:
                return Response(
                    {"detail": "Only teachers and students can be added as collaborators."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # If user is a student, force is_admin to False
            if user.role == 'student':
                is_admin = False
            
            # Check if user is already a collaborator
            if EventCollaborator.objects.filter(event=event, user=user).exists():
                return Response(
                    {"detail": "This user is already a collaborator for this event."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            collaborator = EventCollaborator.objects.create(
                event=event,
                user=user,
                is_admin=is_admin
            )
            
            serializer = EventCollaboratorSerializer(collaborator)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_collaborator(self, request, pk=None):
        event = self.get_object()
        
        # Check if user has permission to remove collaborators
        if not event.can_edit(request.user):
            return Response(
                {"detail": "You don't have permission to remove collaborators from this event."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        collaborator_id = request.data.get('collaborator_id')
        
        if not collaborator_id:
            return Response({"detail": "Collaborator ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            collaborator = EventCollaborator.objects.get(id=collaborator_id, event=event)
            collaborator.delete()
            return Response({"detail": "Collaborator removed successfully."}, status=status.HTTP_204_NO_CONTENT)
        except EventCollaborator.DoesNotExist:
            return Response({"detail": "Collaborator not found."}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def update_collaborator(self, request, pk=None):
        event = self.get_object()
        
        # Check if user has permission to update collaborators
        if not event.can_edit(request.user):
            return Response(
                {"detail": "You don't have permission to update collaborators for this event."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        collaborator_id = request.data.get('collaborator_id')
        is_admin = request.data.get('is_admin')
        
        if not collaborator_id or is_admin is None:
            return Response(
                {"detail": "Collaborator ID and is_admin status are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            collaborator = EventCollaborator.objects.get(id=collaborator_id, event=event)
            collaborator.is_admin = is_admin
            collaborator.save()
            
            serializer = EventCollaboratorSerializer(collaborator)
            return Response(serializer.data)
        except EventCollaborator.DoesNotExist:
            return Response({"detail": "Collaborator not found."}, status=status.HTTP_404_NOT_FOUND)
            
    @action(detail=False, methods=['get'])
    def search_teachers(self, request):
        """Search for teachers to add as collaborators"""
        query = request.query_params.get('q', '')
        
        # If query is empty, return all teachers
        if not query:
            teachers = User.objects.filter(role='teacher')[:20]  # Limit to 20 results
        else:
            teachers = User.objects.filter(
                role='teacher'
            ).filter(
                Q(first_name__icontains=query) | 
                Q(last_name__icontains=query) |
                Q(username__icontains=query) |
                Q(email__icontains=query)
            )[:20]  # Limit to 20 results
        
        serializer = UserSerializer(teachers, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def search_students(self, request):
        """Search for students to add as collaborators"""
        query = request.query_params.get('q', '')
        
        # If query is empty, return all students
        if not query:
            students = User.objects.filter(role='student')[:20]  # Limit to 20 results
        else:
            students = User.objects.filter(
                role='student'
            ).filter(
                Q(first_name__icontains=query) | 
                Q(last_name__icontains=query) |
                Q(username__icontains=query) |
                Q(email__icontains=query)
            )[:20]  # Limit to 20 results
        
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)