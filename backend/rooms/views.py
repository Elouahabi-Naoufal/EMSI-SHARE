from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Room, RoomParticipant
from .serializers import RoomSerializer, RoomDetailSerializer, JoinRoomSerializer
from .permissions import IsOwnerOrReadOnly, IsAdminOrTargetTeacher, IsAuthenticatedAndTeacher
from django.contrib.auth import get_user_model
from django.db.models import Q


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsAuthenticatedAndTeacher()]
        elif self.action in ['retrieve', 'list', 'join_room', 'leave_room']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        elif self.action == 'teacher_students':
            return [permissions.IsAuthenticated(), IsAdminOrTargetTeacher()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['teacher', 'librarian', 'counselor', 'coordinator', 'staff']:
            return Room.objects.filter(owner=user).order_by('created_at')
        elif user.role == 'student':
            return Room.objects.filter(roomparticipant__user=user, roomparticipant__enrollment_status='enrolled').order_by('created_at')
        elif user.role in ['admin', 'administration']:
            return Room.objects.all().order_by('created_at')
        return Room.objects.none()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RoomDetailSerializer
        return RoomSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='catalog')
    def catalog(self, request):
        """Public course catalog — all open rooms."""
        rooms = Room.objects.filter(is_active=True, enrollment_open=True, is_private=False)
        search = request.query_params.get('search')
        if search:
            rooms = rooms.filter(Q(name__icontains=search) | Q(subject__icontains=search))
        serializer = self.get_serializer(rooms, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def join(self, request):
        serializer = JoinRoomSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        room_id = serializer.validated_data['room_id']
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user in room.participants.all():
            return Response({'message': 'You are already a participant'}, status=status.HTTP_400_BAD_REQUEST)

        if not room.enrollment_open:
            return Response({'error': 'Enrollment is closed for this room'}, status=status.HTTP_400_BAD_REQUEST)

        # Check capacity
        if room.max_participants and room.participants.filter(roomparticipant__enrollment_status='enrolled').count() >= room.max_participants:
            RoomParticipant.objects.create(user=request.user, room=room, enrollment_status='waitlisted')
            return Response({'message': 'Room is full. You have been added to the waitlist.'}, status=status.HTTP_200_OK)

        # Check if room requires approval (private)
        if room.is_private:
            RoomParticipant.objects.create(user=request.user, room=room, enrollment_status='pending')
            return Response({'message': 'Enrollment request submitted. Awaiting teacher approval.'}, status=status.HTTP_200_OK)

        RoomParticipant.objects.create(user=request.user, room=room, enrollment_status='enrolled')
        return Response({'message': 'Successfully joined the room'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='enrollment-requests')
    def enrollment_requests(self, request, pk=None):
        room = self.get_object()
        if room.owner != request.user and request.user.role not in ['admin', 'administration']:
            return Response({'error': 'Permission denied'}, status=403)
        pending = RoomParticipant.objects.filter(room=room, enrollment_status='pending').select_related('user')
        from users.serializers import UserSerializer
        data = [{'participant_id': p.id, 'user': UserSerializer(p.user).data, 'joined_at': p.joined_at} for p in pending]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='approve-enrollment')
    def approve_enrollment(self, request, pk=None):
        room = self.get_object()
        if room.owner != request.user and request.user.role not in ['admin', 'administration']:
            return Response({'error': 'Permission denied'}, status=403)
        participant_id = request.data.get('participant_id')
        action_type = request.data.get('action', 'approve')  # 'approve' or 'reject'
        try:
            participant = RoomParticipant.objects.get(id=participant_id, room=room)
            participant.enrollment_status = 'enrolled' if action_type == 'approve' else 'rejected'
            participant.save()
            return Response({'message': f'Enrollment {action_type}d successfully.'})
        except RoomParticipant.DoesNotExist:
            return Response({'error': 'Participant not found'}, status=404)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        room = self.get_object()
        try:
            participant = RoomParticipant.objects.get(user=request.user, room=room)
            participant.delete()
            return Response({'message': 'Successfully left the room'}, status=status.HTTP_200_OK)
        except RoomParticipant.DoesNotExist:
            return Response({'error': 'You are not a participant in this room'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='teacher-students')
    def teacher_students(self, request):
        User = get_user_model()
        teacher_id = request.query_params.get('teacher_id')
        if not teacher_id:
            return Response({'error': 'teacher_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            teacher = User.objects.get(id=teacher_id, role='teacher')
        except User.DoesNotExist:
            return Response({'error': 'Teacher not found'}, status=status.HTTP_404_NOT_FOUND)
        students = User.objects.filter(
            roomparticipant__room__owner=teacher,
            roomparticipant__role='student',
            roomparticipant__enrollment_status='enrolled',
        ).distinct()
        from users.serializers import UserSerializer
        return Response(UserSerializer(students, many=True).data, status=status.HTTP_200_OK)