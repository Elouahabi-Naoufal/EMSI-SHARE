from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Q
from .models import ForumCategory, ForumTopic, ForumPost, ForumVote, ForumSubscription, ForumAttachment, TopicLike
from .serializers import (
    ForumCategorySerializer, 
    ForumTopicSerializer, 
    ForumPostSerializer,
    ForumVoteSerializer,
    ForumSubscriptionSerializer,
    ForumAttachmentSerializer,
    TopicLikeSerializer
)
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ForumCategoryViewSet(viewsets.ModelViewSet):
    queryset = ForumCategory.objects.filter(is_active=True)
    serializer_class = ForumCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ForumTopicViewSet(viewsets.ModelViewSet):
    queryset = ForumTopic.objects.all()
    serializer_class = ForumTopicSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Creating topic with data: {request.data}")
        try:
            # Ensure we have a category_id
            if 'category_id' not in request.data:
                return Response({"error": "category_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the category exists
            from .models import ForumCategory
            try:
                category_id = int(request.data['category_id'])
                category = ForumCategory.objects.get(id=category_id)
            except (ValueError, ForumCategory.DoesNotExist):
                # Create default categories if none exist
                if ForumCategory.objects.count() == 0:
                    self._create_default_categories()
                    # Try to get the category again
                    try:
                        category = ForumCategory.objects.get(id=category_id)
                    except ForumCategory.DoesNotExist:
                        return Response(
                            {"error": f"Category with ID {category_id} does not exist. Please select a valid category."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    return Response(
                        {"error": f"Category with ID {category_id} does not exist. Please select a valid category."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error creating topic: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_default_categories(self):
        """Create default forum categories if none exist"""
        logger.info("Creating default forum categories")
        categories = [
            {"name": "General Discussion", "description": "General topics", "color": "#3B82F6", "order": 1},
            {"name": "Questions & Answers", "description": "Ask and answer questions", "color": "#10B981", "order": 2},
            {"name": "Announcements", "description": "Important announcements", "color": "#F59E0B", "order": 3},
            {"name": "Homework Help", "description": "Get help with assignments", "color": "#8B5CF6", "order": 4},
            {"name": "Projects", "description": "Project discussions", "color": "#EC4899", "order": 5},
            {"name": "Resources", "description": "Sharing useful resources", "color": "#6366F1", "order": 6},
            {"name": "Events", "description": "Events and meetups", "color": "#EF4444", "order": 7},
            {"name": "Technical", "description": "Technical discussions", "color": "#14B8A6", "order": 8},
            {"name": "Off-Topic", "description": "Non-academic discussions", "color": "#F97316", "order": 9},
            {"name": "Feedback", "description": "Feedback and suggestions", "color": "#6B7280", "order": 10}
        ]
        
        from .models import ForumCategory
        for category_data in categories:
            ForumCategory.objects.get_or_create(
                name=category_data["name"],
                defaults={
                    "description": category_data["description"],
                    "color": category_data["color"],
                    "order": category_data["order"],
                    "is_active": True
                }
            )
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        from audit_logs.utils import log_action
        log_action(self.request.user, 'forum_topic_created', 'ForumTopic', serializer.instance.id,
                   {'title': serializer.instance.title}, self.request)

    def perform_destroy(self, instance):
        from audit_logs.utils import log_action
        log_action(self.request.user, 'forum_topic_deleted', 'ForumTopic', instance.id,
                   {'title': instance.title}, self.request)
        instance.delete()
        queryset = ForumTopic.objects.all()
        
        # Basic filters
        category_id = self.request.query_params.get('category', None)
        room_id = self.request.query_params.get('room', None)
        is_solved = self.request.query_params.get('is_solved', None)
        search_text = self.request.query_params.get('search', None)
        tags = self.request.query_params.get('tags', None)
        
        # Date filters
        created_after = self.request.query_params.get('created_after', None)
        created_before = self.request.query_params.get('created_before', None)
        updated_after = self.request.query_params.get('updated_after', None)
        updated_before = self.request.query_params.get('updated_before', None)
        
        # Apply filters
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        if room_id:
            queryset = queryset.filter(room_id=room_id)
            
        if is_solved is not None:
            is_solved_bool = is_solved.lower() == 'true'
            queryset = queryset.filter(is_solved=is_solved_bool)
            
        if search_text:
            queryset = queryset.filter(
                Q(title__icontains=search_text) | 
                Q(content__icontains=search_text) |
                Q(posts__content__icontains=search_text)
            ).distinct()
            
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
            for tag in tag_list:
                queryset = queryset.filter(tags__icontains=tag)
                
        # Date filtering
        if created_after:
            try:
                date = datetime.strptime(created_after, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=date)
            except ValueError:
                pass
                
        if created_before:
            try:
                date = datetime.strptime(created_before, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=date)
            except ValueError:
                pass
                
        if updated_after:
            try:
                date = datetime.strptime(updated_after, '%Y-%m-%d').date()
                queryset = queryset.filter(updated_at__date__gte=date)
            except ValueError:
                pass
                
        if updated_before:
            try:
                date = datetime.strptime(updated_before, '%Y-%m-%d').date()
                queryset = queryset.filter(updated_at__date__lte=date)
            except ValueError:
                pass
            
        return queryset
    
    @action(detail=True, methods=['get'])
    def attachment(self, request, pk=None):
        topic = self.get_object()
        
        if not topic.attachment_data:
            return Response({"error": "No attachment found"}, status=status.HTTP_404_NOT_FOUND)
        
        response = HttpResponse(
            topic.attachment_data,
            content_type=topic.attachment_type
        )
        
        # Set filename for download
        filename = topic.attachment_name or 'attachment'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    
    @action(detail=True, methods=['post'])
    def toggle_solved(self, request, pk=None):
        topic = self.get_object()
        if request.user == topic.created_by:
            topic.is_solved = not topic.is_solved
            if topic.is_solved:
                post_id = request.data.get('post_id')
                if post_id:
                    try:
                        solution_post = ForumPost.objects.get(id=post_id, topic=topic)
                        solution_post.is_solution = True
                        solution_post.save()
                        topic.solved_by = solution_post.created_by
                    except ForumPost.DoesNotExist:
                        pass
            else:
                # Clear solution status from posts
                ForumPost.objects.filter(topic=topic, is_solution=True).update(is_solution=False)
                topic.solved_by = None
            
            topic.save()
            return Response({'status': 'success', 'is_solved': topic.is_solved})
        return Response({'status': 'error', 'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    @action(detail=True, methods=['post'])
    def subscribe(self, request, pk=None):
        topic = self.get_object()
        subscription, created = ForumSubscription.objects.get_or_create(
            topic=topic,
            user=request.user,
            defaults={'email_notifications': request.data.get('email_notifications', True)}
        )
        
        if not created:
            # Toggle subscription
            ForumSubscription.objects.filter(id=subscription.id).delete()
            return Response({'status': 'success', 'subscribed': False})
        
        return Response({'status': 'success', 'subscribed': True})
    
    @action(detail=True, methods=['get'])
    def subscription_status(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({'subscribed': False})
            
        topic = self.get_object()
        is_subscribed = ForumSubscription.objects.filter(topic=topic, user=request.user).exists()
        return Response({'subscribed': is_subscribed})
    
    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        topic = self.get_object()
        topic.view_count += 1
        topic.save()
        return Response({'status': 'success', 'view_count': topic.view_count})
        
    @action(detail=True, methods=['post'])
    def like_topic(self, request, pk=None):
        topic = self.get_object()
        user = request.user
        
        # Check if user already liked this topic
        like, created = TopicLike.objects.get_or_create(topic=topic, user=user)
        
        if created:
            # User hasn't liked this topic before, increment count
            topic.like_count += 1
            topic.save()
            return Response({'status': 'success', 'liked': True, 'like_count': topic.like_count})
        else:
            # User already liked this topic, remove the like
            like.delete()
            topic.like_count = max(0, topic.like_count - 1)  # Ensure count doesn't go below 0
            topic.save()
            return Response({'status': 'success', 'liked': False, 'like_count': topic.like_count})
            
    @action(detail=True, methods=['get'])
    def like_status(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({'liked': False})
            
        topic = self.get_object()
        is_liked = TopicLike.objects.filter(topic=topic, user=request.user).exists()
        return Response({'liked': is_liked})

class ForumPostViewSet(viewsets.ModelViewSet):
    queryset = ForumPost.objects.all()
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        from audit_logs.utils import log_action
        log_action(self.request.user, 'forum_post_created', 'ForumPost', serializer.instance.id,
                   {'topic': serializer.instance.topic.title}, self.request)
        # Update the last_activity of the topic
        topic = serializer.validated_data['topic']
        topic.last_activity = serializer.instance.created_at
        topic.save()
        
        try:
            from notifications.models import Notification, NotificationType
            
            # Ensure the notification type exists
            notification_type, created = NotificationType.objects.get_or_create(
                name="forum_reply",
                defaults={
                    "description": "Someone replied to your forum topic",
                    "icon": "message-circle",
                    "color": "#3B82F6"
                }
            )
            
            # Create notification for topic creator if this is a reply
            if topic.created_by != self.request.user:
                notification = Notification.objects.create(
                    recipient=topic.created_by,
                    sender=self.request.user,
                    notification_type=notification_type,
                    title="New reply to your discussion",
                    message=f"{self.request.user.get_full_name() or self.request.user.username} replied to your discussion: {topic.title}",
                    priority="medium",
                    action_url=f"/forum/{topic.id}",
                    action_text="View Reply",
                    metadata={"topic_id": topic.id, "post_id": serializer.instance.id}
                )
                print(f"Created notification {notification.id} for user {topic.created_by.username}")
            
            # Create notifications for subscribers
            from .models import ForumSubscription
            subscribers = ForumSubscription.objects.filter(topic=topic).exclude(user=self.request.user)
            
            for subscription in subscribers:
                if subscription.user != topic.created_by:  # Avoid duplicate notifications
                    notification = Notification.objects.create(
                        recipient=subscription.user,
                        sender=self.request.user,
                        notification_type=notification_type,
                        title="New reply in subscribed discussion",
                        message=f"{self.request.user.get_full_name() or self.request.user.username} replied to '{topic.title}'",
                        priority="medium",
                        action_url=f"/forum/{topic.id}",
                        action_text="View Reply",
                        metadata={"topic_id": topic.id, "post_id": serializer.instance.id}
                    )
                    print(f"Created notification {notification.id} for subscriber {subscription.user.username}")
        except Exception as e:
            # Log the error but don't prevent post creation
            print(f"Error creating notifications: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def get_queryset(self):
        queryset = ForumPost.objects.all()
        topic_id = self.request.query_params.get('topic', None)
        search_text = self.request.query_params.get('search', None)
        
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
            
        if search_text:
            queryset = queryset.filter(content__icontains=search_text)
            
        return queryset
    
    @action(detail=True, methods=['get'])
    def attachment(self, request, pk=None):
        post = self.get_object()
        
        if not post.attachment_data:
            return Response({"error": "No attachment found"}, status=status.HTTP_404_NOT_FOUND)
        
        response = HttpResponse(
            post.attachment_data,
            content_type=post.attachment_type
        )
        
        # Set filename for download
        filename = post.attachment_name or 'attachment'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    
    @action(detail=True, methods=['post'])
    def vote(self, request, pk=None):
        post = self.get_object()
        vote_type = request.data.get('vote_type')
        
        if vote_type not in ['upvote', 'downvote']:
            return Response({'status': 'error', 'detail': 'Invalid vote type'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already voted
        existing_vote = ForumVote.objects.filter(post=post, user=request.user).first()
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # Remove vote if clicking the same button
                existing_vote.delete()
                return Response({'status': 'success', 'action': 'removed'})
            else:
                # Change vote type
                existing_vote.vote_type = vote_type
                existing_vote.save()
                return Response({'status': 'success', 'action': 'changed'})
        else:
            # Create new vote
            ForumVote.objects.create(post=post, user=request.user, vote_type=vote_type)
            return Response({'status': 'success', 'action': 'added'})
    
    @action(detail=True, methods=['get'])
    def vote_status(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({'vote_type': None})
            
        post = self.get_object()
        try:
            vote = ForumVote.objects.get(post=post, user=request.user)
            return Response({'vote_type': vote.vote_type})
        except ForumVote.DoesNotExist:
            return Response({'vote_type': None})

class ForumAttachmentViewSet(viewsets.ModelViewSet):
    queryset = ForumAttachment.objects.all()
    serializer_class = ForumAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        post_id = self.request.data.get('post')
        post = ForumPost.objects.get(id=post_id)
        
        # Ensure user is the post creator
        if post.created_by != self.request.user:
            raise permissions.PermissionDenied("You can only add attachments to your own posts")
            
        serializer.save()