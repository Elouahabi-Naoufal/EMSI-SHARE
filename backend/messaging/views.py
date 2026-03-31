from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        box = self.request.query_params.get('box', 'inbox')
        qs = Message.objects.filter(parent=None)
        if box == 'inbox':
            qs = qs.filter(recipient=user, is_deleted_by_recipient=False)
        elif box == 'sent':
            qs = qs.filter(sender=user, is_deleted_by_sender=False)
        else:
            qs = qs.filter(Q(sender=user) | Q(recipient=user))
        return qs

    def perform_create(self, serializer):
        attachment_data = attachment_name = attachment_type = None
        if 'attachment' in self.request.FILES:
            f = self.request.FILES['attachment']
            attachment_data = f.read()
            attachment_name = f.name
            attachment_type = f.content_type
        serializer.save(
            sender=self.request.user,
            attachment_data=attachment_data,
            attachment_name=attachment_name,
            attachment_type=attachment_type,
        )

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        if msg.recipient == request.user and not msg.is_read:
            msg.is_read = True
            msg.read_at = timezone.now()
            msg.save()
        return Response({'detail': 'marked as read'})

    @action(detail=True, methods=['get'], url_path='attachment')
    def download_attachment(self, request, pk=None):
        msg = self.get_object()
        if not msg.attachment_data:
            return Response({'error': 'No attachment'}, status=404)
        response = HttpResponse(msg.attachment_data, content_type=msg.attachment_type or 'application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{msg.attachment_name}"'
        return response

    @action(detail=True, methods=['get'], url_path='thread')
    def thread(self, request, pk=None):
        msg = self.get_object()
        replies = msg.replies.all()
        return Response(MessageSerializer(replies, many=True).data)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Message.objects.filter(recipient=request.user, is_read=False, is_deleted_by_recipient=False).count()
        return Response({'count': count})
