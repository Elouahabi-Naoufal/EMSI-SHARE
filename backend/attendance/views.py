from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AttendanceSession, AttendanceRecord
from .serializers import AttendanceSessionSerializer, AttendanceRecordSerializer


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.request.query_params.get('room')
        qs = AttendanceSession.objects.all()
        if room_id:
            qs = qs.filter(room_id=room_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark')
    def mark(self, request, pk=None):
        session = self.get_object()
        records = request.data.get('records', [])
        for r in records:
            AttendanceRecord.objects.update_or_create(
                session=session,
                student_id=r['student_id'],
                defaults={'status': r.get('status', 'present'), 'note': r.get('note', ''), 'marked_by': request.user}
            )
        from audit_logs.utils import log_action
        log_action(request.user, 'attendance_marked', 'AttendanceSession', session.id, {'session': session.title, 'room': session.room.name, 'count': len(records)}, request)
        return Response({'detail': 'Attendance saved.'})

    @action(detail=False, methods=['get'], url_path='student-summary')
    def student_summary(self, request):
        room_id = request.query_params.get('room')
        student_id = request.query_params.get('student') or request.user.id
        if not room_id:
            return Response({'error': 'room required'}, status=400)
        sessions = AttendanceSession.objects.filter(room_id=room_id)
        total = sessions.count()
        records = AttendanceRecord.objects.filter(session__in=sessions, student_id=student_id)
        present = records.filter(status__in=['present', 'late']).count()
        absent = records.filter(status='absent').count()
        excused = records.filter(status='excused').count()
        rate = round((present / total) * 100, 1) if total > 0 else 0
        return Response({'total': total, 'present': present, 'absent': absent, 'excused': excused, 'rate': rate})


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.request.query_params.get('session')
        qs = AttendanceRecord.objects.all()
        if session_id:
            qs = qs.filter(session_id=session_id)
        if self.request.user.role == 'student':
            qs = qs.filter(student=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)
