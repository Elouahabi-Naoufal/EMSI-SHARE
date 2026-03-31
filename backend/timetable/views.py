from rest_framework import viewsets, permissions
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer


class TimetableSlotViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        room_id = self.request.query_params.get('room')
        day = self.request.query_params.get('day')
        qs = TimetableSlot.objects.all()
        if room_id:
            qs = qs.filter(room_id=room_id)
        if day is not None:
            qs = qs.filter(day_of_week=day)
        if user.role == 'student':
            joined_rooms = user.joined_rooms.all()
            qs = qs.filter(room__in=joined_rooms)
        elif user.role == 'teacher':
            owned_rooms = user.owned_rooms.all()
            qs = qs.filter(room__in=owned_rooms)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
