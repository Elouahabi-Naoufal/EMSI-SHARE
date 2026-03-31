import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';

// --- Cookie helpers ---
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '');
}
function removeCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Define types for our context
type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'librarian' | 'counselor' | 'coordinator' | 'staff' | 'admin' | 'administration' | 'parent';
  avatar?: string;
  profilePicture?: string;
  staff_title?: string;
  department?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher') => Promise<void>;
  updateProfile: (profileData: Partial<{ first_name: string; last_name: string; email: string; avatar?: string }>) => Promise<void>;
  refreshProfilePicture: () => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checked, setChecked] = useState(false); // Prevents flicker on first load

  const fetchProfilePicture = async () => {
    try {
      // Check if endpoint exists before making the request
      const res = await fetch('http://127.0.0.1:8000/api/auth/me/', {
        headers: { Authorization: `Bearer ${getCookie('emsi_access')}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile_picture_data) {
          setUser(prev => prev ? { ...prev, profilePicture: data.profile_picture_data } : null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile picture:', error);
    }
  };

  // On mount, check for token in cookies and auto-login if valid
  useEffect(() => {
    const token = getCookie('emsi_access');
    if (token) {
      authAPI.getMe().then(userData => {
        if (!userData) {
          throw new Error('Failed to get user data');
        }
        const mappedUser: User = {
          id: userData.id.toString(),
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
          email: userData.email,
          role: userData.role,
          staff_title: userData.staff_title,
          department: userData.department,
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.first_name || userData.email)}&background=random`,
        };
        setUser(mappedUser);
        setIsAuthenticated(true);
        fetchProfilePicture();
        setChecked(true);
      }).catch((error) => {
        console.error('Error fetching user data:', error);
        logout();
        setChecked(true);
      });
    } else {
      setChecked(true);
    }
  // eslint-disable-next-line
  }, []);

  // Login function using backend
  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      if (!data || !data.access) {
        throw new Error('Invalid response from server');
      }
      
      setCookie('emsi_access', data.access, 14); // 14 days
      setCookie('emsi_refresh', data.refresh, 30); // 30 days

      // Fetch user info
      const userData = await authAPI.getMe();
      if (!userData || !userData.id) {
        throw new Error('Failed to get user data');
      }
      
      const mappedUser: User = {
        id: userData.id.toString(),
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
        email: userData.email,
        role: userData.role,
        staff_title: userData.staff_title,
        department: userData.department,
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.first_name || userData.email)}&background=random`,
      };

      setUser(mappedUser);
      setIsAuthenticated(true);
      fetchProfilePicture();
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid email or password');
    }
  };

  // Register function using backend
  const register = async (name: string, email: string, password: string, role: 'student' | 'teacher') => {
    try {
      const nameParts = name.split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';
      
      // Generate a unique username based on email and timestamp to avoid conflicts in PostgreSQL
      const timestamp = new Date().getTime().toString().slice(-6);
      const username = `${email.split('@')[0]}_${timestamp}`;
      
      const response = await authAPI.register({
        username: username,
        email,
        password,
        password2: password,
        first_name,
        last_name,
        role,
      });
      
      if (!response) {
        throw new Error('Registration failed - no response from server');
      }
      
      // Wait a moment for the database to complete the transaction
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error('Registration failed');
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    removeCookie('emsi_access');
    removeCookie('emsi_refresh');
  };

  // Update profile function
  const updateProfile = async (profileData: Partial<{ first_name: string; last_name: string; email: string; avatar?: string }>) => {
    try {
      // Call your API to update the profile
      const updatedUserData = await authAPI.updateProfile(profileData);
      
      // Update the user state with the new data
      const mappedUser: User = {
        id: updatedUserData.id.toString(),
        name: `${updatedUserData.first_name || ''} ${updatedUserData.last_name || ''}`.trim() || updatedUserData.username,
        email: updatedUserData.email,
        role: updatedUserData.role,
        avatar: updatedUserData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUserData.first_name || updatedUserData.email)}&background=random`,
        profilePicture: user?.profilePicture
      };
      setUser(mappedUser);

    } catch (error) {
      console.error('Profile update failed:', error);
      throw new Error('Profile update failed');
    }
  };

  // Function to refresh profile picture
  const refreshProfilePicture = async () => {
    await fetchProfilePicture();
  };

  // Only render children after auth check to avoid flicker
  if (!checked) return null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register, updateProfile, refreshProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};