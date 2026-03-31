from rest_framework import serializers
from .models import AcademicCalendarEntry


class AcademicCalendarEntrySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AcademicCalendarEntry
        fields = ['id', 'title', 'description', 'entry_type', 'start_date',
                  'end_date', 'color', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at', 'color']

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
