from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import Badge, UserBadge, Certificate
from .serializers import BadgeSerializer, UserBadgeSerializer, CertificateSerializer
from audit_logs.utils import log_action

User = get_user_model()


class BadgeViewSet(viewsets.ModelViewSet):
    queryset = Badge.objects.filter(is_active=True)
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()


class UserBadgeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.query_params.get('user')
        qs = UserBadge.objects.all()
        if user_id:
            qs = qs.filter(user_id=user_id)
        elif self.request.user.role == 'student':
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=False, methods=['post'], url_path='award')
    def award(self, request):
        if request.user.role not in ['admin', 'administration', 'teacher']:
            return Response({'error': 'Permission denied'}, status=403)
        badge_id = request.data.get('badge_id')
        user_id = request.data.get('user_id')
        try:
            badge = Badge.objects.get(id=badge_id)
            user = User.objects.get(id=user_id)
            ub, created = UserBadge.objects.get_or_create(user=user, badge=badge)
            return Response(UserBadgeSerializer(ub).data, status=201 if created else 200)
        except (Badge.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Badge or user not found'}, status=404)


class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Certificate.objects.filter(student=user)
        room_id = self.request.query_params.get('room')
        qs = Certificate.objects.all()
        if room_id:
            qs = qs.filter(room_id=room_id)
        return qs

    def perform_create(self, serializer):
        cert = serializer.save(issued_by=self.request.user)
        log_action(self.request.user, 'certificate_issued', 'Certificate', cert.id,
                   {'student': cert.student.email, 'room': cert.room.name},
                   self.request)
