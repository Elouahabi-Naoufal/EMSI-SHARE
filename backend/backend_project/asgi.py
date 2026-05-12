import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_project.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from notifications.routing import websocket_urlpatterns as notif_ws
from messaging.routing import websocket_urlpatterns as chat_ws

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(notif_ws + chat_ws),
})
