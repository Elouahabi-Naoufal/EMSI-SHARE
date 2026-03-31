from rest_framework import serializers
from .models import Message
import base64


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'recipient', 'recipient_name',
                  'subject', 'body', 'is_read', 'read_at', 'parent',
                  'has_attachment', 'attachment_name', 'attachment_type',
                  'reply_count', 'created_at']
        read_only_fields = ['sender', 'is_read', 'read_at', 'created_at']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email

    def get_recipient_name(self, obj):
        return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.email

    def get_has_attachment(self, obj):
        return bool(obj.attachment_data)

    def get_reply_count(self, obj):
        return obj.replies.count()
