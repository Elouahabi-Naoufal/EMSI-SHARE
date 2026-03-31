from django.db import models
from django.conf import settings
from rooms.models import Room

DAYS = [
    (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
    (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday'),
]


class TimetableSlot(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='timetable_slots')
    day_of_week = models.IntegerField(choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=255, blank=True, null=True)
    color = models.CharField(max_length=7, default='#3B82F6')
    recurrence = models.CharField(max_length=10, choices=[('weekly', 'Weekly'), ('biweekly', 'Bi-weekly'), ('once', 'Once')], default='weekly')
    effective_from = models.DateField(null=True, blank=True)
    effective_until = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='timetable_slots')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f"{self.room.name} — {self.get_day_of_week_display()} {self.start_time}–{self.end_time}"
