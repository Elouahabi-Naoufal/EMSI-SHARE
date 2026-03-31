
from django.db import models
from django.conf import settings
import string
import random

def generate_room_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

class Room(models.Model):
    id = models.CharField(primary_key=True, max_length=8, default=generate_room_id, editable=False)
    name = models.CharField(max_length=100)
    subject = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_rooms')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, through='RoomParticipant', related_name='joined_rooms')
    is_active = models.BooleanField(default=True)
    is_private = models.BooleanField(default=False)
    enrollment_open = models.BooleanField(default=True)
    max_participants = models.IntegerField(null=True, blank=True)
    prerequisites = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='required_for')
    room_image = models.ImageField(upload_to='room_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"

class RoomParticipant(models.Model):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('moderator', 'Moderator'),
        ('assistant', 'Assistant'),
    ]
    ENROLLMENT_STATUS = [
        ('enrolled', 'Enrolled'),
        ('waitlisted', 'Waitlisted'),
        ('pending', 'Pending Approval'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    enrollment_status = models.CharField(max_length=10, choices=ENROLLMENT_STATUS, default='enrolled')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_muted = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)

    class Meta:
        unique_together = ['user', 'room']

    def __str__(self):
        return f"{self.user.username} in {self.room.name}"

class RoomInvitation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invitations')
    invited_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_invitations', null=True, blank=True)
    email = models.EmailField(null=True, blank=True)  # For inviting non-users
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    token = models.CharField(max_length=100, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Invitation to {self.room.name}"
