from django.db import models
from django.conf import settings
from rooms.models import Room


class Assignment(models.Model):
    SUBMISSION_TYPES = [
        ('file', 'File Upload'),
        ('text', 'Text Answer'),
        ('link', 'External Link'),
        ('any', 'Any'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='assignments')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_assignments')
    deadline = models.DateTimeField()
    max_score = models.FloatField(default=100)
    submission_type = models.CharField(max_length=10, choices=SUBMISSION_TYPES, default='any')
    allow_late = models.BooleanField(default=True)
    late_penalty = models.FloatField(default=0, help_text='Percentage deducted for late submission')
    attachment_data = models.BinaryField(null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)
    attachment_type = models.CharField(max_length=100, null=True, blank=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['deadline']

    def __str__(self):
        return f"{self.title} — {self.room.name}"


class AssignmentSubmission(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('late', 'Late'),
        ('graded', 'Graded'),
        ('missing', 'Missing'),
        ('returned', 'Returned'),
    ]

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignment_submissions')
    file_data = models.BinaryField(null=True, blank=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    file_type = models.CharField(max_length=100, null=True, blank=True)
    text_answer = models.TextField(null=True, blank=True)
    link_answer = models.URLField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='submitted')
    score = models.FloatField(null=True, blank=True)
    feedback = models.TextField(null=True, blank=True)
    graded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_submissions')
    graded_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['assignment', 'student']
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.student.email} — {self.assignment.title}"
