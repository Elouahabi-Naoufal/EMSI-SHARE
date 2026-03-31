from rest_framework import serializers
from .models import Assignment, AssignmentSubmission
from django.contrib.auth import get_user_model
import base64

User = get_user_model()


class AssignmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    submission_count = serializers.SerializerMethodField()
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ['id', 'title', 'description', 'room', 'created_by', 'created_by_name',
                  'deadline', 'max_score', 'submission_type', 'allow_late', 'late_penalty',
                  'attachment_name', 'attachment_type', 'is_published',
                  'submission_count', 'my_submission', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email

    def get_submission_count(self, obj):
        return obj.submissions.count()

    def get_my_submission(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            sub = obj.submissions.filter(student=request.user).first()
            if sub:
                return {'id': sub.id, 'status': sub.status, 'score': sub.score, 'submitted_at': sub.submitted_at}
        return None


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    assignment_title = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'assignment', 'student', 'student_name', 'student_email',
                  'assignment_title', 'file_name', 'file_type', 'text_answer',
                  'link_answer', 'status', 'score', 'feedback', 'graded_by',
                  'graded_at', 'submitted_at']
        read_only_fields = ['student', 'submitted_at', 'graded_by', 'graded_at']

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.email

    def get_student_email(self, obj):
        return obj.student.email

    def get_assignment_title(self, obj):
        return obj.assignment.title
