from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.views import UserListView, RegisterView, UserDetailView as MeView
from users.views import ProfilePictureDBUploadView, ProfilePictureDBGetView, ProfilePictureDBDeleteView
from users.views import UserProfilePictureView
from rooms.views import RoomViewSet
from resources.views import ResourceViewSet, ResourceCategoryViewSet
from quizzes.views import QuizViewSet, QuestionViewSet
from forums.views import ForumCategoryViewSet, ForumTopicViewSet, ForumPostViewSet, ForumAttachmentViewSet
from notifications.views import NotificationViewSet

router = routers.DefaultRouter()
# router.register(r'users', UserListView, basename='user')  # Removed - not a ViewSet
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'resource-categories', ResourceCategoryViewSet, basename='resource-category')
router.register(r'quizzes', QuizViewSet)
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'forums/categories', ForumCategoryViewSet)
router.register(r'forums/topics', ForumTopicViewSet)
router.register(r'forums/posts', ForumPostViewSet)
router.register(r'forums/attachments', ForumAttachmentViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')

from users.views import UserDeleteView, AdminUserCreateView, AdminUserUpdateView, ForgotPasswordView, ResetPasswordView, BulkUserImportView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/events/', include('events.urls')),
    path('api/platform/', include('platform_settings.urls')),
    path('api/', include('assignments.urls')),
    path('api/', include('gradebook.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('timetable.urls')),
    path('api/', include('messaging.urls')),
    path('api/', include('announcements.urls')),
    path('api/', include('calendar_app.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('api/users/', UserListView.as_view(), name='users'),
    path('api/users/create/', AdminUserCreateView.as_view(), name='user_create'),
    path('api/users/bulk-import/', BulkUserImportView.as_view(), name='bulk_import'),
    path('api/users/<str:user_id>/', UserDeleteView.as_view(), name='user_delete'),
    path('api/users/<str:user_id>/update/', AdminUserUpdateView.as_view(), name='admin_user_update'),
    path('api/users/<int:user_id>/profile-picture/', UserProfilePictureView.as_view(), name='user_profile_picture'),
    path('api/auth/profile/picture/upload/', ProfilePictureDBUploadView.as_view(), name='profile_picture_upload'),
    path('api/auth/profile/picture/', ProfilePictureDBGetView.as_view(), name='profile_picture_get'),
    path('api/auth/profile/picture/delete/', ProfilePictureDBDeleteView.as_view(), name='profile_picture_delete'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)