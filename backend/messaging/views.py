import json
import base64
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import DirectConversation, ChatMessage
from .serializers import ConversationSerializer, ChatMessageSerializer

User = get_user_model()


def push_message_ws(recipient_id, data):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"chat_{recipient_id}",
            {"type": "chat_message", "data": data}
        )


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DirectConversation.objects.filter(participants=self.request.user)

    @action(detail=False, methods=['post'], url_path='start')
    def start(self, request):
        other_id = request.data.get('user_id')
        try:
            other = User.objects.get(id=other_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        conv = DirectConversation.objects.filter(participants=request.user).filter(participants=other).first()
        if not conv:
            conv = DirectConversation.objects.create()
            conv.participants.add(request.user, other)

        return Response(ConversationSerializer(conv, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        conv = self.get_object()
        msgs = conv.messages.all()
        # Mark all as read
        msgs.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response(ChatMessageSerializer(msgs, many=True).data)

    @action(detail=True, methods=['post'], url_path='send')
    def send(self, request, pk=None):
        conv = self.get_object()
        msg_type = request.data.get('message_type', 'text')
        content = request.data.get('content', '')
        gif_url = request.data.get('gif_url')

        media_data = media_name = media_mime = None
        if 'media' in request.FILES:
            f = request.FILES['media']
            media_data = f.read()
            media_name = f.name
            media_mime = f.content_type
        elif request.data.get('media_base64'):
            media_data = base64.b64decode(request.data['media_base64'])
            media_name = request.data.get('media_name', 'file')
            media_mime = request.data.get('media_mime', 'application/octet-stream')

        msg = ChatMessage.objects.create(
            conversation=conv,
            sender=request.user,
            message_type=msg_type,
            content=content,
            media_data=media_data,
            media_name=media_name,
            media_mime=media_mime,
            gif_url=gif_url,
        )
        conv.save()  # update updated_at

        serialized = ChatMessageSerializer(msg).data

        # Push to all participants except sender
        for participant in conv.participants.exclude(id=request.user.id):
            push_message_ws(participant.id, {**serialized, 'conversation_id': conv.id})

        return Response(serialized, status=201)

    @action(detail=True, methods=['get'], url_path='media/(?P<msg_id>[0-9]+)')
    def media(self, request, pk=None, msg_id=None):
        msg = ChatMessage.objects.get(id=msg_id, conversation_id=pk)
        if not msg.media_data:
            return Response({'error': 'No media'}, status=404)
        response = HttpResponse(bytes(msg.media_data), content_type=msg.media_mime or 'application/octet-stream')
        response['Content-Disposition'] = f'inline; filename="{msg.media_name}"'
        return response
