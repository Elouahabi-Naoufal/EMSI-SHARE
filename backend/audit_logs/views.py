from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import AuditLog
from .serializers import AuditLogSerializer
import csv
from django.http import HttpResponse


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role not in ['admin', 'administration']:
            return AuditLog.objects.none()
        qs = AuditLog.objects.all()
        action = self.request.query_params.get('action')
        actor = self.request.query_params.get('actor')
        if action:
            qs = qs.filter(action=action)
        if actor:
            qs = qs.filter(actor_id=actor)
        return qs

    def list(self, request, *args, **kwargs):
        if request.query_params.get('export') == 'csv':
            return self._export_csv(request)
        return super().list(request, *args, **kwargs)

    def _export_csv(self, request):
        qs = self.get_queryset()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Actor', 'Action', 'Target Type', 'Target ID', 'IP', 'Date'])
        for log in qs:
            writer.writerow([log.id, log.actor.email if log.actor else 'System',
                             log.get_action_display(), log.target_type, log.target_id,
                             log.ip_address, log.created_at.strftime('%Y-%m-%d %H:%M')])
        return response
