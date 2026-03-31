from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, RegisterSerializer, AdminUserCreateSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.http import HttpResponse
import base64, csv, io
from .models import PasswordResetToken, EmailVerificationToken, ParentStudentLink
from platform_settings.models import PlatformSettings

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        # Check if registration is enabled
        try:
            settings_obj = PlatformSettings.get_settings()
            if not settings_obj.enable_registration:
                return Response(
                    {'detail': 'Registration is currently disabled by the administrator. Please contact support if you need an account.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Exception:
            # If settings can't be loaded, allow registration
            pass
        
        return super().create(request, *args, **kwargs)

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        # Support avatar upload via PATCH as multipart
        user = self.get_object()
        avatar_file = request.FILES.get('avatar')
        if avatar_file:
            if user.avatar:
                user.avatar.delete(save=False)
            user.avatar = avatar_file
            user.save()
        return super().patch(request, *args, **kwargs)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in User.PRIVILEGED_ROLES:
            return User.objects.all().order_by('date_joined')
        return User.objects.filter(id=user.id)


class AdminUserCreateView(generics.CreateAPIView):
    serializer_class = AdminUserCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role not in User.ADMIN_ROLES:
            return Response({'detail': 'You do not have permission to create users.'},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from audit_logs.utils import log_action
        log_action(request.user, 'user_created', 'User', user.id, {'email': user.email, 'role': user.role}, request)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'staff_title': user.staff_title,
            'department': user.department,
        }, status=status.HTTP_201_CREATED)


class UserDeleteView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        if request.user.role not in User.ADMIN_ROLES:
            return Response({'detail': 'You do not have permission to delete users.'},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            user_to_delete = User.objects.get(id=user_id)
            if user_to_delete.id == request.user.id:
                return Response({'detail': 'You cannot delete your own account.'},
                                status=status.HTTP_400_BAD_REQUEST)
            user_to_delete.delete()
            from audit_logs.utils import log_action
            log_action(request.user, 'user_deleted', 'User', user_id, {'email': user_to_delete.email}, request)
            return Response({'detail': 'User deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            data = response.data
            access = data.get('access')
            refresh = data.get('refresh')
            max_age_access = 60 * 60 * 24  # 1 day
            max_age_refresh = 60 * 60 * 24 * 14  # 14 days
            response.set_cookie(
                settings.SIMPLE_JWT.get('AUTH_COOKIE', 'emsi_access'),
                access,
                max_age=max_age_access,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', False),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/'),
                domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN', None),
            )
            response.set_cookie(
                settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'emsi_refresh'),
                refresh,
                max_age=max_age_refresh,
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', False),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/'),
                domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN', None),
            )
        return response

class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'detail': 'New password required.'}, status=status.HTTP_400_BAD_REQUEST)
        user.password = make_password(new_password)
        user.save()
        return Response({'detail': 'Password changed successfully.'})

class ProfilePictureDBUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        file = request.FILES.get('avatar')
        if not file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        user.profile_picture = file.read()
        user.save()
        return Response({'detail': 'Profile picture uploaded.'})

class ProfilePictureDBGetView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.profile_picture:
            return Response({'detail': 'No profile picture.'}, status=404)
        mime = 'image/png'  # Default, could be improved by storing mime type
        b64 = base64.b64encode(user.profile_picture).decode('utf-8')
        return Response({'image': f'data:{mime};base64,{b64}'})

class ProfilePictureDBDeleteView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.profile_picture = None
        user.save()
        return Response({'detail': 'Profile picture deleted.'})

class UserProfilePictureView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            requested_user = User.objects.get(id=user_id)
            if not requested_user.profile_picture:
                return Response({'detail': 'No profile picture.'}, status=404)
            
            mime = 'image/png'  # Default, could be improved by storing mime type
            b64 = base64.b64encode(requested_user.profile_picture).decode('utf-8')
            return Response({'image': f'data:{mime};base64,{b64}'})
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
            
class AdminUserUpdateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, user_id):
        if request.user.role not in User.ADMIN_ROLES:
            return Response({'detail': 'Only admin/administration can update user profiles.'},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            u = User.objects.get(id=user_id)
            for field in ['username', 'email', 'first_name', 'last_name', 'role', 'staff_title', 'department']:
                if field in request.data:
                    setattr(u, field, request.data[field])
            if request.data.get('password'):
                u.password = make_password(request.data['password'])
            pic = request.data.get('profile_picture')
            if pic and isinstance(pic, str) and pic.startswith('data:'):
                _, imgstr = pic.split(';base64,')
                u.profile_picture = base64.b64decode(imgstr)
            if request.FILES.get('profile_picture'):
                u.profile_picture = request.FILES['profile_picture'].read()
            u.save()
            return Response({
                'id': u.id, 'username': u.username, 'email': u.email,
                'first_name': u.first_name, 'last_name': u.last_name,
                'role': u.role, 'staff_title': u.staff_title, 'department': u.department,
                'profile_picture_data': f'data:image/png;base64,{base64.b64encode(u.profile_picture).decode()}' if u.profile_picture else None
            })
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

class ForgotPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'If that email exists, a reset link has been sent.'})

        token = PasswordResetToken.objects.create(user=user)
        reset_url = f"{request.data.get('frontend_url', 'http://localhost:5173')}/reset-password?token={token.token}"

        try:
            send_mail(
                subject='Password Reset Request',
                message=f'Click the link to reset your password (expires in 1 hour):\n\n{reset_url}',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@platform.com'),
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({'detail': 'If that email exists, a reset link has been sent.'})


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '')
        new_password = request.data.get('password', '')

        if not token_str or not new_password:
            return Response({'detail': 'Token and password are required.'}, status=400)

        try:
            token = PasswordResetToken.objects.get(token=token_str, used=False)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid or expired token.'}, status=400)

        if token.is_expired:
            return Response({'detail': 'Token has expired.'}, status=400)

        token.user.password = make_password(new_password)
        token.user.save()
        token.used = True
        token.save()
        return Response({'detail': 'Password reset successfully.'})


class BulkUserImportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.role not in User.ADMIN_ROLES:
            return Response({'detail': 'Permission denied.'}, status=403)

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'CSV file required.'}, status=400)

        decoded = file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        created, skipped, errors = [], [], []

        for i, row in enumerate(reader, start=2):
            email = row.get('email', '').strip()
            first_name = row.get('first_name', '').strip()
            last_name = row.get('last_name', '').strip()
            role = row.get('role', 'student').strip()
            password = row.get('password', '').strip() or User.objects.make_random_password()

            if not email:
                errors.append({'row': i, 'error': 'Missing email'})
                continue
            if role not in [r[0] for r in User.ROLE_CHOICES]:
                errors.append({'row': i, 'error': f'Invalid role: {role}'})
                continue
            if User.objects.filter(email=email).exists():
                skipped.append(email)
                continue
            try:
                import secrets as _s
                user = User.objects.create_user(
                    username=f"{email.split('@')[0]}_{_s.token_hex(3)}",
                    email=email, password=password,
                    first_name=first_name, last_name=last_name, role=role,
                )
                created.append(email)
            except Exception as e:
                errors.append({'row': i, 'error': str(e)})

        from audit_logs.utils import log_action
        log_action(request.user, 'bulk_import', 'User', None, {'created': len(created), 'skipped': len(skipped), 'errors': len(errors)}, request)
        return Response({'created': len(created), 'skipped': len(skipped), 'errors': errors,
                         'created_emails': created, 'skipped_emails': skipped})


class EmailVerificationView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get('token', '')
        try:
            token = EmailVerificationToken.objects.get(token=token_str, used=False)
        except EmailVerificationToken.DoesNotExist:
            return Response({'detail': 'Invalid or expired token.'}, status=400)
        if token.is_expired:
            return Response({'detail': 'Token has expired.'}, status=400)
        token.user.is_verified = True
        token.user.save()
        token.used = True
        token.save()
        return Response({'detail': 'Email verified successfully.'})


class DataExportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import json
        from django.forms.models import model_to_dict

        user = request.user
        data = {
            'profile': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'username': user.username,
                'role': user.role,
                'date_joined': str(user.date_joined),
            },
            'quiz_attempts': list(user.quiz_attempts.values('quiz__title', 'score', 'start_time', 'status')),
            'forum_topics': list(user.created_topics.values('title', 'created_at')),
            'forum_posts': list(user.forum_posts.values('content', 'created_at')),
            'uploaded_resources': list(user.uploaded_resources.values('title', 'type', 'uploaded_at')),
            'notifications': list(user.notifications.values('title', 'message', 'created_at')),
        }
        response = HttpResponse(json.dumps(data, indent=2, default=str), content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="my_data_{user.id}.json"'
        return response


class StudentProgressReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id=None):
        target_id = student_id or request.user.id
        if str(target_id) != str(request.user.id) and request.user.role not in ['teacher', 'admin', 'administration']:
            return Response({'detail': 'Permission denied.'}, status=403)
        try:
            student = User.objects.get(id=target_id)
        except User.DoesNotExist:
            return Response({'detail': 'Student not found.'}, status=404)

        from quizzes.models import QuizAttempt
        from assignments.models import AssignmentSubmission
        from attendance.models import AttendanceRecord
        from gradebook.models import GradeEntry

        attempts = QuizAttempt.objects.filter(student=student, status='completed')
        quiz_avg = round(sum(a.score for a in attempts if a.score) / attempts.count(), 1) if attempts.exists() else 0

        submissions = AssignmentSubmission.objects.filter(student=student)
        graded = submissions.filter(status='graded')
        grade_avg = round(sum(s.score for s in graded if s.score) / graded.count(), 1) if graded.exists() else 0

        records = AttendanceRecord.objects.filter(student=student)
        total_sessions = records.count()
        present = records.filter(status__in=['present', 'late']).count()
        attendance_rate = round((present / total_sessions) * 100, 1) if total_sessions > 0 else 0

        grade_entries = GradeEntry.objects.filter(student=student)
        grade_entry_avg = round(sum(g.percentage for g in grade_entries) / grade_entries.count(), 1) if grade_entries.exists() else 0

        return Response({
            'student': {
                'id': student.id,
                'name': f"{student.first_name} {student.last_name}".strip() or student.email,
                'email': student.email,
                'role': student.role,
            },
            'quizzes': {'total_attempts': attempts.count(), 'average_score': quiz_avg},
            'assignments': {'total_submitted': submissions.count(), 'total_graded': graded.count(), 'average_score': grade_avg},
            'attendance': {'total_sessions': total_sessions, 'present': present, 'rate': attendance_rate},
            'grades': {'total_entries': grade_entries.count(), 'average': grade_entry_avg},
            'forum': {'posts': student.forum_posts.count(), 'topics': student.created_topics.count()},
            'resources_uploaded': student.uploaded_resources.count(),
        })


class TwoFactorSetupView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import pyotp, qrcode, io as _io
        user = request.user
        if not user.totp_secret:
            user.totp_secret = pyotp.random_base32()
            user.save(update_fields=['totp_secret'])
        totp = pyotp.TOTP(user.totp_secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name='Platform')
        img = qrcode.make(uri)
        buf = _io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        return Response({
            'secret': user.totp_secret,
            'qr_code': f'data:image/png;base64,{qr_b64}',
            'enabled': user.totp_enabled,
        })

    def post(self, request):
        import pyotp
        user = request.user
        code = request.data.get('code', '')
        action = request.data.get('action', 'enable')
        if not user.totp_secret:
            return Response({'detail': 'Setup not started.'}, status=400)
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Invalid code.'}, status=400)
        if action == 'enable':
            user.totp_enabled = True
            user.save(update_fields=['totp_enabled'])
            return Response({'detail': '2FA enabled successfully.'})
        elif action == 'disable':
            user.totp_enabled = False
            user.totp_secret = None
            user.save(update_fields=['totp_enabled', 'totp_secret'])
            return Response({'detail': '2FA disabled.'})
        return Response({'detail': 'Invalid action.'}, status=400)


class TwoFactorVerifyView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import pyotp
        email = request.data.get('email', '')
        code = request.data.get('code', '')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=400)
        if not user.totp_enabled or not user.totp_secret:
            return Response({'detail': '2FA not enabled for this user.'}, status=400)
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Invalid 2FA code.'}, status=400)
        return Response({'detail': '2FA verified.', 'verified': True})


class ParentPortalView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'parent':
            return Response({'detail': 'Only parents can access this endpoint.'}, status=403)
        links = ParentStudentLink.objects.filter(parent=request.user).select_related('student')
        children = []
        for link in links:
            student = link.student
            from quizzes.models import QuizAttempt
            from assignments.models import AssignmentSubmission
            from attendance.models import AttendanceRecord
            attempts = QuizAttempt.objects.filter(student=student, status='completed')
            quiz_avg = round(sum(a.score for a in attempts if a.score) / attempts.count(), 1) if attempts.exists() else 0
            records = AttendanceRecord.objects.filter(student=student)
            total = records.count()
            present = records.filter(status__in=['present', 'late']).count()
            att_rate = round((present / total) * 100, 1) if total > 0 else 0
            pending_assignments = AssignmentSubmission.objects.filter(
                student=student, status__in=['missing', 'late']
            ).count()
            children.append({
                'student_id': student.id,
                'name': f"{student.first_name} {student.last_name}".strip() or student.email,
                'email': student.email,
                'relationship': link.relationship,
                'quiz_average': quiz_avg,
                'attendance_rate': att_rate,
                'pending_assignments': pending_assignments,
            })
        return Response(children)

    def post(self, request):
        if request.user.role not in ['admin', 'administration']:
            return Response({'detail': 'Only admins can link parents to students.'}, status=403)
        parent_id = request.data.get('parent_id')
        student_id = request.data.get('student_id')
        relationship = request.data.get('relationship', 'parent')
        try:
            parent = User.objects.get(id=parent_id, role='parent')
            student = User.objects.get(id=student_id, role='student')
            link, created = ParentStudentLink.objects.get_or_create(
                parent=parent, student=student,
                defaults={'relationship': relationship}
            )
            return Response({'detail': 'Linked successfully.' if created else 'Already linked.'})
        except User.DoesNotExist:
            return Response({'detail': 'Parent or student not found.'}, status=404)
