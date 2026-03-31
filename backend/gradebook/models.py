from django.db import models
from django.conf import settings
from rooms.models import Room


class GradeCategory(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='grade_categories')
    name = models.CharField(max_length=100)  # e.g. Quizzes, Assignments, Participation
    weight = models.FloatField(default=100, help_text='Percentage weight in final grade')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['room', 'name']
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.weight}%) — {self.room.name}"


class GradeEntry(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='grade_entries')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='grade_entries')
    category = models.ForeignKey(GradeCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='entries')
    title = models.CharField(max_length=255)  # e.g. "Quiz 1", "Midterm Exam"
    score = models.FloatField()
    max_score = models.FloatField(default=100)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_grade_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.email} — {self.title}: {self.score}/{self.max_score}"

    @property
    def percentage(self):
        if self.max_score > 0:
            return round((self.score / self.max_score) * 100, 2)
        return 0
