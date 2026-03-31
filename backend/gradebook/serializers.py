from rest_framework import serializers
from .models import GradeCategory, GradeEntry


class GradeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeCategory
        fields = ['id', 'room', 'name', 'weight', 'created_at']
        read_only_fields = ['created_at']


class GradeEntrySerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    percentage = serializers.ReadOnlyField()

    class Meta:
        model = GradeEntry
        fields = ['id', 'student', 'student_name', 'student_email', 'room',
                  'category', 'category_name', 'title', 'score', 'max_score',
                  'percentage', 'notes', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.email

    def get_student_email(self, obj):
        return obj.student.email

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
