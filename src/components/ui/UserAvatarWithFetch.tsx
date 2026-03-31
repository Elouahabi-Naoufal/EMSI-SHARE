import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarWithFetchProps {
  userId: number | string;
  name?: string;
  fallbackAvatar?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DEFAULT_AVATAR = "/placeholder.svg";

const UserAvatarWithFetch: React.FC<UserAvatarWithFetchProps> = ({ 
  userId, 
  name, 
  fallbackAvatar, 
  size = 'md', 
  className = '' 
}) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserProfilePicture = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('emsi_access='))?.split('=')[1];
        if (!token) return;
        
        // This would be a backend endpoint that returns profile picture for a specific user
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/users/${userId}/profile-picture`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.image) setProfilePicture(data.image);
        }
      } catch (error) {
        console.error('Failed to fetch user profile picture:', error);
      }
    };
    
    fetchUserProfilePicture();
  }, [userId]);
  
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };
  
  const sizeClass = sizeClasses[size];
  const displayName = name || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  
  return (
    <Avatar className={`${sizeClass} ${className}`}>
      <AvatarImage 
        src={profilePicture || fallbackAvatar || DEFAULT_AVATAR} 
        alt={displayName} 
      />
      <AvatarFallback className="bg-primary text-white">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatarWithFetch;