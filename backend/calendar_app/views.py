from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import AcademicCalendarEntry
from .serializers import AcademicCalendarEntrySerializer


class AcademicCalendarEntryViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicCalendarEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AcademicCalendarEntry.objects.all()
        entry_type = self.request.query_params.get('type')
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
