from .models import Notification, NotificationType
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

User = get_user_model()


def create_notification(
    recipient: User,
    notification_type_name: str,
    title: str,
    message: str,
    sender: User = None,
    priority: str = 'medium',
    action_url: str = None,
    action_text: str = None,
    metadata: dict = None,
    expires_at=None,
):
    try:
        notification_type = NotificationType.objects.get(name=notification_type_name)
    except NotificationType.DoesNotExist:
        notification_type = NotificationType.objects.create(name=notification_type_name)

    notification = Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=priority,
        action_url=action_url,
        action_text=action_text,
        metadata=metadata,
        expires_at=expires_at,
    )

    # Push to WebSocket
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"notifications_{recipient.id}",
            {
                "type": "send_notification",
                "data": {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                    "action_url": notification.action_url,
                    "action_text": notification.action_text,
                    "metadata": notification.metadata,
                    "notification_type": {
                        "id": notification_type.id,
                        "name": notification_type.name,
                        "icon": notification_type.icon,
                        "color": notification_type.color,
                    },
                },
            },
        )

    return notification
