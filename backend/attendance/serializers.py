from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'session', 'student', 'student_name', 'student_email', 'status', 'note', 'marked_by', 'created_at']
        read_only_fields = ['marked_by', 'created_at']

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.email

    def get_student_email(self, obj):
        return obj.student.email


class AttendanceSessionSerializer(serializers.ModelSerializer):
    records = AttendanceRecordSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ['id', 'room', 'title', 'date', 'notes', 'created_by', 'created_by_name', 'records', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
