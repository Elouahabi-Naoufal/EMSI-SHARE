from rest_framework import serializers
from .models import DirectConversation, ChatMessage
from django.contrib.auth import get_user_model

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    has_media = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'conversation', 'sender', 'sender_name', 'message_type',
                  'content', 'media_name', 'media_mime', 'gif_url',
                  'has_media', 'is_read', 'created_at']
        read_only_fields = ['sender', 'created_at', 'is_read']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email

    def get_has_media(self, obj):
        return bool(obj.media_data)


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = DirectConversation
        fields = ['id', 'other_user', 'last_message', 'unread_count', 'updated_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        other = obj.participants.exclude(id=request.user.id).first()
        return UserMiniSerializer(other).data if other else None

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if not msg:
            return None
        return {'content': msg.content or f'[{msg.message_type}]', 'created_at': msg.created_at.isoformat(), 'sender_id': msg.sender_id}

    def get_unread_count(self, obj):
        request = self.context.get('request')
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
