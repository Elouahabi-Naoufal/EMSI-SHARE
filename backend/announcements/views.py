from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import Announcement
from .serializers import AnnouncementSerializer


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        room_id = self.request.query_params.get('room')

        qs = Announcement.objects.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        )

        if user.role not in ['admin', 'administration', 'teacher']:
            qs = qs.filter(
                Q(target_type='all') |
                Q(target_type='role', target_role=user.role) |
                Q(target_type='room', target_room__in=user.joined_rooms.all())
            )

        if room_id:
            qs = qs.filter(Q(target_type='all') | Q(target_room_id=room_id))

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
