from django.db import models
from django.conf import settings
from rooms.models import Room


class Badge(models.Model):
    CRITERIA_TYPES = [
        ('first_login', 'First Login'),
        ('first_quiz', 'First Quiz Completed'),
        ('perfect_score', 'Perfect Quiz Score'),
        ('resources_uploaded', 'Resources Uploaded'),
        ('forum_posts', 'Forum Posts'),
        ('course_completed', 'Course Completed'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='award')
    color = models.CharField(max_length=7, default='#F59E0B')
    criteria_type = models.CharField(max_length=30, choices=CRITERIA_TYPES)
    criteria_value = models.IntegerField(default=1, help_text='Threshold to earn this badge')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='user_badges')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']

    def __str__(self):
        return f"{self.user.email} — {self.badge.name}"


class Certificate(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='certificates')
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='issued_certificates')
    issued_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ['student', 'room']

    def __str__(self):
        return f"Certificate: {self.student.email} — {self.room.name}"
