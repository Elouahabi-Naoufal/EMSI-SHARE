from rest_framework import serializers
from .models import TimetableSlot


class TimetableSlotSerializer(serializers.ModelSerializer):
    room_name = serializers.SerializerMethodField()
    day_name = serializers.SerializerMethodField()

    class Meta:
        model = TimetableSlot
        fields = ['id', 'room', 'room_name', 'day_of_week', 'day_name',
                  'start_time', 'end_time', 'location', 'color', 'recurrence',
                  'effective_from', 'effective_until', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def get_room_name(self, obj):
        return obj.room.name

    def get_day_name(self, obj):
        return obj.get_day_of_week_display()
