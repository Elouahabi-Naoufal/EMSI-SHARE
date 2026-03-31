from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_TYPES = [
        ('user_created', 'User Created'),
        ('user_deleted', 'User Deleted'),
        ('user_role_changed', 'User Role Changed'),
        ('user_updated', 'User Updated'),
        ('user_login', 'User Login'),
        ('user_logout', 'User Logout'),
        ('resource_uploaded', 'Resource Uploaded'),
        ('resource_approved', 'Resource Approved'),
        ('resource_rejected', 'Resource Rejected'),
        ('resource_deleted', 'Resource Deleted'),
        ('resource_downloaded', 'Resource Downloaded'),
        ('room_created', 'Room Created'),
        ('room_deleted', 'Room Deleted'),
        ('room_joined', 'Room Joined'),
        ('room_left', 'Room Left'),
        ('enrollment_approved', 'Enrollment Approved'),
        ('enrollment_rejected', 'Enrollment Rejected'),
        ('quiz_created', 'Quiz Created'),
        ('quiz_deleted', 'Quiz Deleted'),
        ('quiz_submitted', 'Quiz Submitted'),
        ('quiz_toggled', 'Quiz Active Toggled'),
        ('assignment_created', 'Assignment Created'),
        ('assignment_deleted', 'Assignment Deleted'),
        ('assignment_submitted', 'Assignment Submitted'),
        ('assignment_graded', 'Assignment Graded'),
        ('grade_added', 'Grade Added'),
        ('grade_modified', 'Grade Modified'),
        ('grade_deleted', 'Grade Deleted'),
        ('attendance_marked', 'Attendance Marked'),
        ('forum_topic_created', 'Forum Topic Created'),
        ('forum_topic_deleted', 'Forum Topic Deleted'),
        ('forum_post_created', 'Forum Post Created'),
        ('event_created', 'Event Created'),
        ('event_deleted', 'Event Deleted'),
        ('event_attended', 'Event Attended'),
        ('announcement_created', 'Announcement Created'),
        ('announcement_deleted', 'Announcement Deleted'),
        ('message_sent', 'Message Sent'),
        ('certificate_issued', 'Certificate Issued'),
        ('certificate_deleted', 'Certificate Deleted'),
        ('badge_awarded', 'Badge Awarded'),
        ('settings_changed', 'Settings Changed'),
        ('bulk_import', 'Bulk Import'),
        ('2fa_enabled', '2FA Enabled'),
        ('2fa_disabled', '2FA Disabled'),
        ('password_reset', 'Password Reset'),
        ('data_exported', 'Data Exported'),
    ]

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=30, choices=ACTION_TYPES)
    target_type = models.CharField(max_length=50, blank=True, null=True)
    target_id = models.CharField(max_length=50, blank=True, null=True)
    details = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor} — {self.action} at {self.created_at}"
