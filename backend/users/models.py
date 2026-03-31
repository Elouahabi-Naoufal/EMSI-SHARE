from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
import secrets
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        # Staff roles
        ('librarian', 'Librarian'),
        ('counselor', 'Counselor'),
        ('coordinator', 'Coordinator'),
        ('staff', 'Staff'),
        # Management roles
        ('admin', 'Admin'),
        ('administration', 'Administration'),
        # Guardian role
        ('parent', 'Parent/Guardian'),
    ]

    STAFF_ROLES = ['teacher', 'librarian', 'counselor', 'coordinator', 'staff']
    ADMIN_ROLES = ['admin', 'administration']
    PRIVILEGED_ROLES = STAFF_ROLES + ADMIN_ROLES

    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    staff_title = models.CharField(max_length=100, blank=True, null=True)  # e.g. "Head of Mathematics"
    department = models.CharField(max_length=100, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    last_activity = models.DateTimeField(auto_now=True)
    profile_picture = models.BinaryField(null=True, blank=True)
    totp_secret = models.CharField(max_length=32, blank=True, null=True)
    totp_enabled = models.BooleanField(default=False)

    @property
    def is_staff_member(self):
        return self.role in self.STAFF_ROLES

    @property
    def is_admin_member(self):
        return self.role in self.ADMIN_ROLES
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']
    
    def __str__(self):
        return self.email

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    institution = models.CharField(max_length=255, blank=True, null=True)
    graduation_year = models.IntegerField(null=True, blank=True)
    skills = models.TextField(blank=True, null=True)
    interests = models.TextField(blank=True, null=True)
    social_links = models.TextField(blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    language_preference = models.CharField(max_length=10, default='en')
    
    def __str__(self):
        return f"{self.user.username}'s Profile"

class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    quiz_reminders = models.BooleanField(default=True)
    forum_notifications = models.BooleanField(default=True)
    event_notifications = models.BooleanField(default=True)
    theme_preference = models.CharField(max_length=10, choices=[('light', 'Light'), ('dark', 'Dark'), ('auto', 'Auto')], default='auto')
    privacy_level = models.CharField(max_length=10, choices=[('public', 'Public'), ('friends', 'Friends'), ('private', 'Private')], default='public')
    
    def __str__(self):
        return f"{self.user.username}'s Settings"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(hours=1)

    def __str__(self):
        return f"Reset token for {self.user.email}"


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(hours=24)

    def __str__(self):
        return f"Verification token for {self.user.email}"


class ParentStudentLink(models.Model):
    RELATIONSHIP_CHOICES = [
        ('parent', 'Parent'),
        ('guardian', 'Guardian'),
        ('other', 'Other'),
    ]
    parent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='children_links')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='parent_links')
    relationship = models.CharField(max_length=10, choices=RELATIONSHIP_CHOICES, default='parent')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['parent', 'student']

    def __str__(self):
        return f"{self.parent.email} -> {self.student.email}"
