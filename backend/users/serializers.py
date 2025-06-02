from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
import base64

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_picture_data = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'avatar', 'profile_picture_data']
        read_only_fields = ['id']
    
    def get_profile_picture_data(self, obj):
        if obj.profile_picture:
            mime = 'image/png'  # Default, could be improved by storing mime type
            b64 = base64.b64encode(obj.profile_picture).decode('utf-8')
            return f'data:{mime};base64,{b64}'
        return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'first_name', 'last_name', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Validate role
        role = attrs.get('role')
        if role not in [r[0] for r in User.ROLE_CHOICES]:
            raise serializers.ValidationError({"role": f"Invalid role. Choose from {[r[0] for r in User.ROLE_CHOICES]}"})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    profile_picture = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'role', 'profile_picture']
    
    def validate(self, attrs):
        # Validate role
        role = attrs.get('role')
        if role not in [r[0] for r in User.ROLE_CHOICES]:
            raise serializers.ValidationError({"role": f"Invalid role. Choose from {[r[0] for r in User.ROLE_CHOICES]}"})
        
        return attrs
    
    def create(self, validated_data):
        profile_picture_data = None
        if 'profile_picture' in validated_data:
            profile_picture = validated_data.pop('profile_picture')
            if profile_picture and profile_picture.startswith('data:image'):
                # Extract the base64 part
                format, imgstr = profile_picture.split(';base64,')
                profile_picture_data = base64.b64decode(imgstr)
        
        user = User.objects.create_user(**validated_data)
        
        if profile_picture_data:
            user.profile_picture = profile_picture_data
            user.save()
            
        return user