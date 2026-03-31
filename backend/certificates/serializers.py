from rest_framework import serializers
from .models import Badge, UserBadge, Certificate


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon', 'color', 'criteria_type', 'criteria_value', 'is_active', 'created_at']


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = UserBadge
        fields = ['id', 'user', 'user_name', 'badge', 'earned_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class CertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = ['id', 'student', 'student_name', 'room', 'room_name', 'issued_by', 'issued_by_name', 'issued_at', 'notes']
        read_only_fields = ['issued_by', 'issued_at']

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.email

    def get_room_name(self, obj):
        return obj.room.name

    def get_issued_by_name(self, obj):
        if obj.issued_by:
            return f"{obj.issued_by.first_name} {obj.issued_by.last_name}".strip() or obj.issued_by.email
        return None
