from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_TYPES = [
        ('user_created', 'User Created'),
        ('user_deleted', 'User Deleted'),
        ('user_role_changed', 'User Role Changed'),
        ('resource_approved', 'Resource Approved'),
        ('resource_rejected', 'Resource Rejected'),
        ('grade_added', 'Grade Added'),
        ('grade_modified', 'Grade Modified'),
        ('assignment_graded', 'Assignment Graded'),
        ('settings_changed', 'Settings Changed'),
        ('bulk_import', 'Bulk Import'),
        ('certificate_issued', 'Certificate Issued'),
        ('login', 'User Login'),
        ('logout', 'User Logout'),
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
