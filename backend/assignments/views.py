from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.http import HttpResponse
from .models import Assignment, AssignmentSubmission
from .serializers import AssignmentSerializer, AssignmentSubmissionSerializer


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        room_id = self.request.query_params.get('room')
        qs = Assignment.objects.all()
        if room_id:
            qs = qs.filter(room_id=room_id)
        if user.role == 'student':
            qs = qs.filter(is_published=True)
        return qs

    def perform_create(self, serializer):
        attachment_data = None
        attachment_name = None
        attachment_type = None
        if 'attachment' in self.request.FILES:
            f = self.request.FILES['attachment']
            attachment_data = f.read()
            attachment_name = f.name
            attachment_type = f.content_type
        serializer.save(
            created_by=self.request.user,
            attachment_data=attachment_data,
            attachment_name=attachment_name,
            attachment_type=attachment_type,
        )

    @action(detail=True, methods=['get'], url_path='attachment')
    def download_attachment(self, request, pk=None):
        assignment = self.get_object()
        if not assignment.attachment_data:
            return Response({'error': 'No attachment'}, status=404)
        response = HttpResponse(assignment.attachment_data, content_type=assignment.attachment_type or 'application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{assignment.attachment_name}"'
        return response

    @action(detail=True, methods=['get'], url_path='submissions')
    def list_submissions(self, request, pk=None):
        assignment = self.get_object()
        if request.user.role == 'student':
            subs = assignment.submissions.filter(student=request.user)
        else:
            subs = assignment.submissions.all()
        serializer = AssignmentSubmissionSerializer(subs, many=True)
        return Response(serializer.data)


class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        assignment_id = self.request.query_params.get('assignment')
        qs = AssignmentSubmission.objects.all()
        if assignment_id:
            qs = qs.filter(assignment_id=assignment_id)
        if user.role == 'student':
            qs = qs.filter(student=user)
        return qs

    def perform_create(self, serializer):
        assignment = serializer.validated_data['assignment']
        file_data = file_name = file_type = None
        if 'file' in self.request.FILES:
            f = self.request.FILES['file']
            file_data = f.read()
            file_name = f.name
            file_type = f.content_type

        now = timezone.now()
        status_val = 'late' if now > assignment.deadline else 'submitted'

        serializer.save(
            student=self.request.user,
            file_data=file_data,
            file_name=file_name,
            file_type=file_type,
            status=status_val,
        )

    @action(detail=True, methods=['post'], url_path='grade')
    def grade(self, request, pk=None):
        submission = self.get_object()
        if request.user.role not in ['teacher', 'admin', 'administration']:
            return Response({'error': 'Permission denied'}, status=403)
        score = request.data.get('score')
        feedback = request.data.get('feedback', '')
        if score is None:
            return Response({'error': 'score is required'}, status=400)
        submission.score = float(score)
        submission.feedback = feedback
        submission.status = 'graded'
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.save()
        return Response(AssignmentSubmissionSerializer(submission).data)

    @action(detail=True, methods=['get'], url_path='download')
    def download_file(self, request, pk=None):
        submission = self.get_object()
        if not submission.file_data:
            return Response({'error': 'No file'}, status=404)
        response = HttpResponse(submission.file_data, content_type=submission.file_type or 'application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{submission.file_name}"'
        return response
