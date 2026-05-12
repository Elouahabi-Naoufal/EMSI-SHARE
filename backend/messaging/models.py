from django.db import models
from django.conf import settings


class DirectConversation(models.Model):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def other_participant(self, user):
        return self.participants.exclude(id=user.id).first()


class ChatMessage(models.Model):
    TYPE_TEXT = 'text'
    TYPE_IMAGE = 'image'
    TYPE_AUDIO = 'audio'
    TYPE_VIDEO = 'video'
    TYPE_GIF = 'gif'
    TYPE_FILE = 'file'
    MESSAGE_TYPES = [
        (TYPE_TEXT, 'Text'),
        (TYPE_IMAGE, 'Image'),
        (TYPE_AUDIO, 'Audio'),
        (TYPE_VIDEO, 'Video'),
        (TYPE_GIF, 'GIF'),
        (TYPE_FILE, 'File'),
    ]

    conversation = models.ForeignKey(DirectConversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default=TYPE_TEXT)
    content = models.TextField(blank=True)
    media_data = models.BinaryField(null=True, blank=True)
    media_name = models.CharField(max_length=255, null=True, blank=True)
    media_mime = models.CharField(max_length=100, null=True, blank=True)
    gif_url = models.URLField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.email}: {self.message_type}"
