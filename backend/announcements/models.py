from django.db import models
from django.conf import settings
from rooms.models import Room


class Announcement(models.Model):
    TARGET_TYPES = [
        ('all', 'Everyone'),
        ('room', 'Specific Room'),
        ('role', 'Specific Role'),
    ]

    title = models.CharField(max_length=255)
    content = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='announcements')
    target_type = models.CharField(max_length=10, choices=TARGET_TYPES, default='all')
    target_room = models.ForeignKey(Room, on_delete=models.CASCADE, null=True, blank=True, related_name='announcements')
    target_role = models.CharField(max_length=20, blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title
