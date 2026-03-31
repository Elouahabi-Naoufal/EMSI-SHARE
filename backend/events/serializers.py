from rest_framework import serializers
from .models import Event, EventAttendee, EventCollaborator, ChunkUploadSession
from django.contrib.auth import get_user_model
from rooms.serializers import RoomSerializer
import base64
import secrets

User = get_user_model()


def _generate_jitsi_link(event_id: int, title: str) -> str:
    slug = title.lower().replace(' ', '-')[:30]
    token = secrets.token_hex(4)
    return f"https://meet.jit.si/{slug}-{event_id}-{token}"

class UserSerializer(serializers.ModelSerializer):
    profile_picture_data = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar', 'role', 'profile_picture_data']
        
    def get_profile_picture_data(self, obj):
        if hasattr(obj, 'profile_picture') and obj.profile_picture:
            mime = 'image/png'  # Default, could be improved by storing mime type
            b64 = base64.b64encode(obj.profile_picture).decode('utf-8')
            return f'data:{mime};base64,{b64}'
        return None

class EventAttendeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = EventAttendee
        fields = ['id', 'event', 'user', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class EventCollaboratorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = EventCollaborator
        fields = ['id', 'event', 'user', 'is_admin', 'added_at']
        read_only_fields = ['added_at']

class ChunkUploadSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChunkUploadSession
        fields = ['id', 'event', 'filename', 'filesize', 'filetype', 'total_chunks', 
                 'uploaded_chunks', 'is_complete', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class EventSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    room_details = RoomSerializer(source='room', read_only=True)
    attendees_count = serializers.SerializerMethodField()
    user_attendance = serializers.SerializerMethodField()
    attendees = EventAttendeeSerializer(many=True, read_only=True)
    collaborators = UserSerializer(many=True, read_only=True)
    event_collaborators = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    image_base64 = serializers.SerializerMethodField()
    video_base64 = serializers.SerializerMethodField()
    image_upload = serializers.CharField(write_only=True, required=False)
    video_upload = serializers.CharField(write_only=True, required=False)
    trailer_upload = serializers.CharField(write_only=True, required=False)
    trailer_type = serializers.CharField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'location', 'start_time', 'end_time', 
                 'event_type', 'is_online', 'meeting_link', 'room', 'room_details', 
                 'created_by', 'created_at', 'updated_at', 'attendees_count', 
                 'user_attendance', 'attendees', 'collaborators', 'event_collaborators',
                 'can_edit', 'image_base64', 'video_base64',
                 'image_upload', 'video_upload', 'trailer_upload', 'trailer_type',
                 'image_name', 'image_type', 'video_name', 'video_type']
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_event_collaborators(self, obj):
        collaborators = EventCollaborator.objects.filter(event=obj)
        return EventCollaboratorSerializer(collaborators, many=True).data
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_edit(request.user)
        return False
    
    def get_attendees_count(self, obj):
        try:
            return obj.attendees.filter(status='attending').count()
        except:
            return 0
    
    def get_user_attendance(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                attendance = obj.attendees.get(user=request.user)
                return {
                    'status': attendance.status,
                    'id': attendance.id
                }
            except EventAttendee.DoesNotExist:
                return None
        return None
    
    def get_image_base64(self, obj):
        return obj.image_base64
    
    def get_video_base64(self, obj):
        return obj.video_base64
    
    def create(self, validated_data):
        image_upload = validated_data.pop('image_upload', None)
        video_upload = validated_data.pop('video_upload', None)
        trailer_upload = validated_data.pop('trailer_upload', None)
        trailer_type = validated_data.pop('trailer_type', None)
        
        validated_data['created_by'] = self.context['request'].user
        # Auto-generate Jitsi link for online events without a meeting link
        if validated_data.get('is_online') and not validated_data.get('meeting_link'):
            validated_data['meeting_link'] = _generate_jitsi_link(0, validated_data.get('title', 'event'))
        event = super().create(validated_data)
        if event.is_online and 'meet.jit.si' in (event.meeting_link or '') and '-0-' in (event.meeting_link or ''):
            event.meeting_link = _generate_jitsi_link(event.id, event.title)
            event.save(update_fields=['meeting_link'])
        
        # Handle image upload (always save to image fields)
        if image_upload:
            if ';base64,' in image_upload:
                header, encoded = image_upload.split(';base64,')
                image_type = header.split('/')[1]
                image_data = base64.b64decode(encoded)
                
                event.image_data = image_data
                event.image_type = f"image/{image_type}"
                event.image_name = f"event_{event.id}_image.{image_type}"
        
        # Handle video upload (always save to video fields)
        if video_upload:
            if ';base64,' in video_upload:
                header, encoded = video_upload.split(';base64,')
                video_type = header.split('/')[1]
                video_data = base64.b64decode(encoded)
                
                event.video_data = video_data
                event.video_type = f"video/{video_type}"
                event.video_name = f"event_{event.id}_video.{video_type}"
        
        # Handle trailer upload (additional media, doesn't override main image/video)
        if trailer_upload:
            if ';base64,' in trailer_upload:
                header, encoded = trailer_upload.split(';base64,')
                media_type = header.split('/')[0].split(':')[1]
                file_type = header.split('/')[1]
                trailer_data = base64.b64decode(encoded)
                
                # Store trailer separately - you may want to add trailer fields to the model
                # For now, we'll store it based on type if main fields are empty
                if trailer_type == 'video' and not event.video_data:
                    event.video_data = trailer_data
                    event.video_type = f"{media_type}/{file_type}"
                    event.video_name = f"event_{event.id}_trailer.{file_type}"
                elif trailer_type == 'image' and not event.image_data:
                    event.image_data = trailer_data
                    event.image_type = f"{media_type}/{file_type}"
                    event.image_name = f"event_{event.id}_trailer.{file_type}"
        
        # Save all changes at once
        if image_upload or video_upload or trailer_upload:
            event.save()
        
        return event
    
    def update(self, instance, validated_data):
        image_upload = validated_data.pop('image_upload', None)
        video_upload = validated_data.pop('video_upload', None)
        trailer_upload = validated_data.pop('trailer_upload', None)
        trailer_type = validated_data.pop('trailer_type', None)
        
        event = super().update(instance, validated_data)
        
        # Handle image upload
        if image_upload:
            if ';base64,' in image_upload:
                header, encoded = image_upload.split(';base64,')
                image_type = header.split('/')[1]
                image_data = base64.b64decode(encoded)
                
                event.image_data = image_data
                event.image_type = f"image/{image_type}"
                event.image_name = f"event_{event.id}_image.{image_type}"
        
        # Handle video upload
        if video_upload:
            if ';base64,' in video_upload:
                header, encoded = video_upload.split(';base64,')
                video_type = header.split('/')[1]
                video_data = base64.b64decode(encoded)
                
                event.video_data = video_data
                event.video_type = f"video/{video_type}"
                event.video_name = f"event_{event.id}_video.{video_type}"
        
        # Handle trailer upload
        if trailer_upload:
            if ';base64,' in trailer_upload:
                header, encoded = trailer_upload.split(';base64,')
                media_type = header.split('/')[0].split(':')[1]
                file_type = header.split('/')[1]
                trailer_data = base64.b64decode(encoded)
                
                if trailer_type == 'video' or media_type == 'video':
                    event.video_data = trailer_data
                    event.video_type = f"{media_type}/{file_type}"
                    event.video_name = f"event_{event.id}_trailer.{file_type}"
                else:
                    event.image_data = trailer_data
                    event.image_type = f"{media_type}/{file_type}"
                    event.image_name = f"event_{event.id}_trailer.{file_type}"
        
        # Save all changes at once
        if image_upload or video_upload or trailer_upload:
            event.save()
        
        return event