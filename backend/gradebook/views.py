from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg
from .models import GradeCategory, GradeEntry
from .serializers import GradeCategorySerializer, GradeEntrySerializer


class GradeCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = GradeCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.request.query_params.get('room')
        qs = GradeCategory.objects.all()
        if room_id:
            qs = qs.filter(room_id=room_id)
        return qs


class GradeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = GradeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        room_id = self.request.query_params.get('room')
        student_id = self.request.query_params.get('student')
        qs = GradeEntry.objects.all()
        if room_id:
            qs = qs.filter(room_id=room_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if user.role == 'student':
            qs = qs.filter(student=user)
        return qs

    def perform_create(self, serializer):
        entry = serializer.save(created_by=self.request.user)
        from audit_logs.utils import log_action
        log_action(self.request.user, 'grade_added', 'GradeEntry', entry.id,
                   {'student': entry.student.email, 'title': entry.title, 'score': entry.score}, self.request)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Returns average grade per student per room."""
        room_id = request.query_params.get('room')
        if not room_id:
            return Response({'error': 'room parameter required'}, status=400)
        entries = GradeEntry.objects.filter(room_id=room_id)
        if request.user.role == 'student':
            entries = entries.filter(student=request.user)
        students = {}
        for e in entries:
            sid = str(e.student_id)
            if sid not in students:
                students[sid] = {
                    'student_id': sid,
                    'student_name': f"{e.student.first_name} {e.student.last_name}".strip() or e.student.email,
                    'entries': [],
                    'average': 0,
                }
            students[sid]['entries'].append({'title': e.title, 'score': e.score, 'max_score': e.max_score, 'percentage': e.percentage})
        for s in students.values():
            if s['entries']:
                s['average'] = round(sum(x['percentage'] for x in s['entries']) / len(s['entries']), 2)
        return Response(list(students.values()))

    def perform_destroy(self, instance):
        from audit_logs.utils import log_action
        log_action(self.request.user, 'grade_deleted', 'GradeEntry', instance.id, {'title': instance.title, 'student': instance.student.email}, self.request)
        instance.delete()
