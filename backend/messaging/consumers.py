import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token = self.scope["query_string"].decode().split("token=")[-1]
        user = await self.get_user(token)
        if user is None:
            await self.close()
            return
        self.user_id = user.id
        self.group_name = f"chat_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("type") == "typing":
            recipient_id = data.get("recipient_id")
            await self.channel_layer.group_send(
                f"chat_{recipient_id}",
                {"type": "typing_indicator", "data": {"sender_id": self.user_id, "is_typing": data.get("is_typing", False)}}
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    @database_sync_to_async
    def get_user(self, token):
        try:
            payload = AccessToken(token)
            return User.objects.get(id=payload["user_id"])
        except Exception:
            return None
