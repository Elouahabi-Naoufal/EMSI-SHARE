from django.db import models
from django.conf import settings


class AcademicCalendarEntry(models.Model):
    ENTRY_TYPES = [
        ('semester_start', 'Semester Start'),
        ('semester_end', 'Semester End'),
        ('exam_period', 'Exam Period'),
        ('holiday', 'Holiday'),
        ('registration', 'Registration Deadline'),
        ('break', 'Break'),
        ('other', 'Other'),
    ]

    COLORS = {
        'semester_start': '#10B981',
        'semester_end': '#EF4444',
        'exam_period': '#F59E0B',
        'holiday': '#6366F1',
        'registration': '#3B82F6',
        'break': '#8B5CF6',
        'other': '#6B7280',
    }

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default='other')
    start_date = models.DateField()
    end_date = models.DateField()
    color = models.CharField(max_length=7, blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calendar_entries')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_date']

    def save(self, *args, **kwargs):
        if not self.color:
            self.color = self.COLORS.get(self.entry_type, '#6B7280')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.start_date} – {self.end_date})"
