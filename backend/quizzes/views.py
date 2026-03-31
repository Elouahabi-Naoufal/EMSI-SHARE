from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.http import FileResponse, Http404
from django.db.models import Count
from .models import Quiz, Question, Option, QuizAttempt, Answer, QuizResource
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuestionSerializer, 
    QuizSubmitSerializer, QuizResultSerializer, QuizResourceSerializer,
    QuizAttemptDetailSerializer
)
from rooms.permissions import IsOwnerOrReadOnly

class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all().order_by('id')
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        room_id = self.request.query_params.get('room', None)
        is_public = self.request.query_params.get('public', None)

        # Base queryset
        queryset = Quiz.objects.all().order_by('created_at')

        # Filter by room or public status
        if is_public == 'true':
            queryset = queryset.filter(is_public=True, room__isnull=True)
        elif room_id:
            queryset = queryset.filter(room_id=room_id)
        else:
            # If no specific filter, return nothing for non-teachers
            # or all for teachers (handled below)
            queryset = Quiz.objects.none()

        # Only return active quizzes to non-teachers
        if user.is_authenticated and user.role != 'teacher':
            queryset = queryset.filter(is_active=True)

        # For teachers, return all quizzes in their rooms
        if user.is_authenticated and user.role == 'teacher' and self.action == 'list':
             teacher_owned_rooms = user.owned_rooms.all()
             queryset = Quiz.objects.filter(room__in=teacher_owned_rooms).order_by('created_at')

        # For other actions (retrieve, update, etc.), return all quizzes regardless of active status
        # This allows teachers to manage inactive quizzes
        if self.action not in ['list']:
             queryset = Quiz.objects.all()

        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        return super().get_permissions()

    def perform_create(self, serializer):
        quiz = serializer.save()
        from audit_logs.utils import log_action
        log_action(self.request.user, 'quiz_created', 'Quiz', quiz.id, {'title': quiz.title}, self.request)

    def perform_destroy(self, instance):
        from audit_logs.utils import log_action
        log_action(self.request.user, 'quiz_deleted', 'Quiz', instance.id, {'title': instance.title}, self.request)
        instance.delete()
    
    @action(detail=True, methods=['post'], url_path='submit')
    def submit_quiz(self, request, pk=None):
        quiz = self.get_object()
        serializer = QuizSubmitSerializer(data=request.data)
        
        if serializer.is_valid():
            # Count only completed attempts
            completed_attempts = QuizAttempt.objects.filter(
                quiz=quiz,
                student=request.user,
                status='completed'
            ).count()
            
            if completed_attempts >= quiz.max_attempts:
                return Response(
                    {"error": f"You have reached the maximum number of attempts ({quiz.max_attempts}) for this quiz"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a new quiz attempt
            attempt = QuizAttempt.objects.create(
                quiz=quiz,
                student=request.user,
                start_time=timezone.now()
            )
            
            # Process answers
            correct_count = 0
            total_questions = quiz.questions.count()
            
            # Process new answers
            for answer_data in serializer.validated_data['answers']:
                question_id = answer_data['question_id']
                option_id = answer_data['option_id']
                
                try:
                    question = Question.objects.get(id=question_id, quiz=quiz)
                    option = Option.objects.get(id=option_id, question=question)
                    
                    is_correct = option.is_correct
                    Answer.objects.create(
                        attempt=attempt,
                        question=question,
                        selected_option=option,
                        is_correct=is_correct
                    )
                    
                    if is_correct:
                        correct_count += 1
                        
                except (Question.DoesNotExist, Option.DoesNotExist):
                    continue
            
            # Calculate score
            if total_questions > 0:
                score = (correct_count / total_questions) * 100
            else:
                score = 0
            
            # Update attempt with end time and score
            attempt.end_time = timezone.now()
            attempt.score = score
            attempt.status = 'completed'
            attempt.save()
            from audit_logs.utils import log_action
            log_action(request.user, 'quiz_submitted', 'Quiz', quiz.id, {'title': quiz.title, 'score': round(score, 1)}, request)
            
            # Return the results
            result_serializer = QuizResultSerializer(attempt)
            return Response(result_serializer.data, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='resources')
    def get_resources(self, request, pk=None):
        quiz = self.get_object()
        resources = QuizResource.objects.filter(quiz=quiz)
        serializer = QuizResourceSerializer(resources, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='resource/(?P<resource_id>[^/.]+)/download')
    def download_resource(self, request, resource_id=None):
        try:
            resource = QuizResource.objects.get(id=resource_id)
            if resource.file:
                response = FileResponse(resource.file.open(), as_attachment=True, filename=resource.filename)
                return response
            else:
                raise Http404("File not found")
        except QuizResource.DoesNotExist:
            raise Http404("Resource not found")

    @action(detail=False, methods=['get'], url_path='teacher-rooms-quizzes')
    def get_teacher_rooms_quizzes(self, request):
        user = request.user
        # Check if the user is authenticated and has the 'teacher' role
        if not user.is_authenticated or user.role != 'teacher':
            return Response({"detail": "Authentication credentials were not provided or you are not a teacher."}, status=status.HTTP_403_FORBIDDEN)

        # Get rooms where the current user is the owner (teacher)
        teacher_owned_rooms = user.owned_rooms.all()

        # Get quizzes associated with these rooms (teachers see all quizzes in their rooms)
        quizzes = Quiz.objects.filter(room__in=teacher_owned_rooms).order_by('created_at')

        serializer = self.get_serializer(quizzes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='teacher-all-student-answers')
    def get_teacher_all_student_answers(self, request):
        user = request.user
        if not user.is_authenticated or user.role != 'teacher':
            return Response(
                {"detail": "Authentication credentials were not provided or you are not a teacher."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get all rooms owned by the teacher
        teacher_owned_rooms = user.owned_rooms.all()

        # Get all quizzes associated with these rooms
        quizzes_in_teacher_rooms = Quiz.objects.filter(room__in=teacher_owned_rooms)

        # Get all quiz attempts for these quizzes
        all_attempts = QuizAttempt.objects.filter(quiz__in=quizzes_in_teacher_rooms).order_by('quiz__title', 'student__username', 'start_time')

        serializer = QuizAttemptDetailSerializer(all_attempts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='toggle_active')
    def toggle_active_status(self, request, pk=None):
        quiz = self.get_object()
        # Ensure only the creator can toggle the status
        if quiz.created_by != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        quiz.is_active = not quiz.is_active
        quiz.save()
        from audit_logs.utils import log_action
        log_action(request.user, 'quiz_toggled', 'Quiz', quiz.id, {'title': quiz.title, 'is_active': quiz.is_active}, request)
        serializer = self.get_serializer(quiz)
        return Response(serializer.data)
        
    @action(detail=True, methods=['get'], url_path='student-results')
    def get_student_results(self, request, pk=None):
        quiz = self.get_object()
        user = request.user
        
        # Get all completed attempts for this student on this quiz
        attempts = QuizAttempt.objects.filter(
            quiz=quiz,
            student=user,
            status='completed'
        ).order_by('-score')  # Order by highest score first
        
        if not attempts.exists():
            return Response({"detail": "No attempts found for this quiz"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get the best attempt
        best_attempt = attempts.first()
        serializer = QuizResultSerializer(best_attempt)
        
        return Response({
            "best_attempt": serializer.data,
            "total_attempts": attempts.count(),
            "max_attempts": quiz.max_attempts,
            "attempts_remaining": max(0, quiz.max_attempts - attempts.count())
        })

class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        quiz_id = self.request.query_params.get('quiz', None)
        if quiz_id:
            return Question.objects.filter(quiz_id=quiz_id).order_by('order')
        return Question.objects.none()