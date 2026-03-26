const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// API utility functions
// Use cookies for JWT tokens
const getCookie = (name: string) => {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '');
};
const getAuthToken = () => getCookie('emsi_access');

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('API Error details:', errorData);
        if (errorData.error) {
          errorMessage = `API Error: ${errorData.error}`;
        } else if (errorData.detail) {
          errorMessage = `API Error: ${errorData.detail}`;
        } else if (typeof errorData === 'object') {
          // Format error object into a readable string
          const errorDetails = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ');
          errorMessage = `API Error: ${errorDetails}`;
        }
      } catch (e) {
        // If we can't parse the error as JSON, just use the status
        console.error('Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }

    // Handle empty response (e.g., DELETE or 204 No Content)
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
      return null;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      console.error('Network error when connecting to API:', error);
      throw new Error('Database connection error. Please check your network connection.');
    }
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid credentials');
        } else if (response.status >= 500) {
          throw new Error('Database connection error');
        } else {
          const errorData = await response.text();
          console.error('Login error response:', errorData);
          throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }
      }
      
      return response.json();
    } catch (error) {
      console.error('Login request failed:', error);
      throw error;
    }
  },
  
  getAllUsers: async () => {
    try {
      const response = await apiRequest('/users/');
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  deleteUser: async (userId: string) => {
    try {
      const response = await apiRequest(`/users/${userId}/`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
  
  updateUser: async (userId: string, userData: Partial<{
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'teacher' | 'admin' | 'administration';
    profile_picture?: string;
  }>) => {
    try {
      const response = await apiRequest(`/users/${userId}/update/`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  
  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'teacher' | 'admin' | 'administration';
    profile_picture?: string;
  }) => {
    try {
      const response = await apiRequest('/users/create/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    password2: string;
    first_name: string;
    last_name: string;
    role: string;
  }) => {
    try {
      // Add retry logic for potential PostgreSQL transaction issues
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          const response = await apiRequest('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(userData),
          });
          return response;
        } catch (error: any) {
          // If it's a database constraint error and we haven't reached max attempts, retry
          if (error.message && error.message.includes('duplicate key') && attempts < maxAttempts) {
            console.log(`Registration attempt ${attempts} failed, retrying...`);
            // Modify username to avoid conflicts
            userData.username = `${userData.username}_${attempts}`;
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
          } else {
            throw error; // Rethrow if max attempts reached or different error
          }
        }
      }
      throw new Error('Registration failed after multiple attempts');
    } catch (error) {
      console.error('Registration API error:', error);
      throw error;
    }
  },
  
  getMe: async () => {
    try {
      const response = await apiRequest('/auth/me/');
      if (!response) {
        throw new Error('Failed to fetch user data');
      }
      return response;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },
  updateProfile: async (profileData: Partial<{ first_name: string; last_name: string; email: string; avatar?: string }>) => {
    try {
      // Validate email uniqueness if email is being updated
      if (profileData.email) {
        // We could add a check here to verify email uniqueness before attempting update
        // This would prevent PostgreSQL unique constraint errors
      }
      
      const response = await apiRequest('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      });
      
      if (!response) {
        throw new Error('Failed to update profile');
      }
      
      return response;
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // Handle PostgreSQL unique constraint errors
      if (error.message && error.message.includes('duplicate key')) {
        throw new Error('Email already exists. Please use a different email.');
      }
      
      throw error;
    }
  },
};

// Rooms API
export const roomsAPI = {
  getRooms: async () => {
    return apiRequest('/rooms/',{
      method: 'GET',
      }
    );
  },

  createRoom: async (roomData: {
    name: string;
    subject: string;
    description?: string;
  }) => {
    return apiRequest('/rooms/', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },

  joinRoom: async (roomId: string) => {
    return apiRequest('/rooms/join/', {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId }),
    });
  },

  leaveRoom: async (roomId: string) => {
    return apiRequest(`/rooms/${roomId}/leave/`, {
      method: 'POST',
    });
  },

  getRoomDetails: async (roomId: string) => {
    return apiRequest(`/rooms/${roomId}/`);
  },

  deleteRoom: async (roomId: string) => {
    return apiRequest(`/rooms/${roomId}/`, {
      method: 'DELETE',
    });
  },

  // New function to get students for a teacher
  getTeacherStudents: async (teacherId: string) => {
    try {
      console.log(`Fetching students for teacher ID: ${teacherId}`);
      const response = await apiRequest(`/rooms/teacher-students/?teacher_id=${teacherId}`);
      console.log('Teacher students response:', response);
      return response || [];
    } catch (error) {
      console.error(`Error fetching students for teacher ${teacherId}:`, error);
      return [];
    }
  },
};

// Resources API
export const resourcesAPI = {
  getResources: async (params?: {
    roomId?: string;
    type?: string;
    category?: string;
    search?: string;
    status?: string;
    uploaded_by?: string;
  }) => {
    let endpoint = '/resources/';
    const queryParams = new URLSearchParams();
    
    if (params) {
      if (params.roomId) queryParams.append('room', params.roomId);
      if (params.type) queryParams.append('type', params.type);
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.uploaded_by) queryParams.append('uploaded_by', params.uploaded_by);
    }
    
    if (queryParams.toString()) {
      endpoint += `?${queryParams.toString()}`;
    }
    
    const response = await apiRequest(endpoint);

    // Ensure consistent response structure
    return {
      results: Array.isArray(response) ? response : response?.results || [],
      count: response?.count || 0
    };
  },
  
  getPendingResources: async () => {
    try {
      console.log('Fetching pending resources from API');
      // Use status=pending filter to get only pending resources
      const response = await apiRequest('/resources/?status=pending');
      console.log('Raw pending resources response:', response);
      return {
        results: Array.isArray(response) ? response : response?.results || [],
        count: response?.count || 0
      };
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      throw error;
    }
  },
  
  getMyPendingResources: async () => {
    try {
      console.log('Fetching my pending resources from API');
      // Use status=my-pending filter to get only the user's pending resources
      const response = await apiRequest('/resources/?status=my-pending');
      console.log('Raw my pending resources response:', response);
      
      // Filter results to include only resources with status pending, approved, or rejected
      let results = Array.isArray(response) ? response : response?.results || [];
      
      // Log the results for debugging
      console.log('My resources before filtering:', results);
      
      return {
        results: results,
        count: results.length
      };
    } catch (error) {
      console.error('Error fetching my pending resources:', error);
      throw error;
    }
  },
  
  getAllPendingResources: async () => {
    try {
      const response = await apiRequest('/resources/?status=pending');
      return response;
    } catch (error) {
      console.error('Error fetching all pending resources:', error);
      throw error;
    }
  },
  
  // Chunked upload functions for large resources
  // NOTE: These endpoints don't exist in the backend yet
  // They are kept here for future implementation
  createResourceUploadSession: async (metadata: any) => {
    console.warn('createResourceUploadSession endpoint not implemented in backend');
    throw new Error('Upload session endpoint not implemented');
  },

  uploadResourceChunk: async (sessionId: string, data: any) => {
    console.warn('uploadResourceChunk endpoint not implemented in backend');
    throw new Error('Upload chunk endpoint not implemented');
  },

  finalizeResourceUpload: async (sessionId: string) => {
    console.warn('finalizeResourceUpload endpoint not implemented in backend');
    throw new Error('Finalize upload endpoint not implemented');
  },

  getAllResources: async () => {
    const response = await apiRequest('/resources/all/');
    return {
      results: Array.isArray(response) ? response : response?.results || [],
      count: response?.count || 0
    };
  },

  getCategories: async () => {
    try {
      const response = await apiRequest('/resource-categories/');
      console.log('Resource categories response:', response);
      return {
        results: Array.isArray(response) ? response : response?.results || [],
        count: response?.count || 0
      };
    } catch (error) {
      console.error('Failed to fetch resource categories:', error);
      return { results: [], count: 0 };
    }
  },

  uploadResource: async (formData: FormData) => {
    const token = getAuthToken();
    
    // Log the formData contents for debugging
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    // Map resource types to valid backend types
    const typeMap: Record<string, string> = {
      'archive': 'document', // Map 'archive' to 'document' which is valid in backend
      'code': 'code',
      'document': 'document',
      'video': 'video',
      'other': 'other'
    };
    
    // Check if the file is a ZIP file and map the type correctly
    const fileData = formData.get('file_data');
    const currentType = formData.get('type') as string;
    
    if (currentType && typeMap[currentType]) {
      formData.set('type', typeMap[currentType]);
    } else if (fileData instanceof File && fileData.name.toLowerCase().endsWith('.zip')) {
      // Default to document type for ZIP files
      formData.set('type', 'document');
    }
    
    // CRITICAL: Ensure status is set correctly
    const status = formData.get('status');
    if (!status) {
      // Get user role from localStorage
      const userRole = localStorage.getItem('user_role');
      // If student, set status to pending
      if (userRole === 'student') {
        formData.set('status', 'pending');
        console.log('Setting missing status to pending for student');
      } else {
        formData.set('status', 'approved');
        console.log('Setting missing status to approved for non-student');
      }
    }
    
    console.log('Final resource upload status:', formData.get('status'));
    
    try {
      const response = await fetch(`${API_BASE_URL}/resources/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type header - let browser set it with boundary for multipart
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Upload error response:', errorData);
        throw new Error(`Failed to upload resource: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Resource upload successful, server response:', result);
      return result;
    } catch (error) {
      console.error('Resource upload failed:', error);
      throw error;
    }
  },

  downloadResource: async (resourceId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/download/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download resource');
    }

    return response.blob();
  },

  bookmarkResource: async (resourceId: string) => {
    return apiRequest(`/resources/${resourceId}/bookmark/`, {
      method: 'POST',
    });
  },

  deleteResource: async (resourceId: string, roomId?: string) => {
    let url = `/resources/${resourceId}/`;
    if (roomId) {
      url += `?room=${roomId}`;
    }
    return apiRequest(url, {
      method: 'DELETE',
    });
  },
  
  approveResource: async (resourceId: string) => {
    return apiRequest(`/resources/${resourceId}/approve/`, {
      method: 'POST',
    });
  },
  
  rejectResource: async (resourceId: string, rejection_reason: string) => {
    return apiRequest(`/resources/${resourceId}/reject/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: rejection_reason }),
    });
  },

};

// Events API
export const eventsAPI = {
  getEvents: async (params?: {
    room?: string;
    type?: string;
    period?: 'today' | 'tomorrow' | 'week' | 'month' | 'past';
    attendance?: 'attending' | 'maybe' | 'declined' | 'all';
    start_date?: string;
    end_date?: string;
    search?: string;
  }) => {
    let endpoint = '/events/';
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
    }
    
    if (queryParams.toString()) {
      endpoint += `?${queryParams.toString()}`;
    }
    
    return apiRequest(endpoint);
  },
  
  getEvent: async (eventId: string) => {
    return apiRequest(`/events/${eventId}/`);
  },
  
  createEvent: async (eventData: {
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    event_type: string;
    is_online: boolean;
    meeting_link?: string;
    room?: number;
    image_upload?: string;
    video_upload?: string;
    trailer_upload?: string;
    trailer_type?: 'image' | 'video';
  }) => {
    return apiRequest('/events/', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },
  
  updateEvent: async (eventId: string, eventData: Partial<{
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    event_type: string;
    is_online: boolean;
    meeting_link?: string;
    room?: number;
    image_upload?: string;
    video_upload?: string;
    trailer_upload?: string;
    trailer_type?: 'image' | 'video' | null;
  }>) => {
    return apiRequest(`/events/${eventId}/`, {
      method: 'PATCH',
      body: JSON.stringify(eventData),
    });
  },
  
  searchTeachers: async (query: string) => {
    console.log('Searching teachers with query:', query);
    return apiRequest(`/events/search_teachers/?q=${encodeURIComponent(query)}`);
  },
  
  searchStudents: async (query: string) => {
    console.log('Searching students with query:', query);
    return apiRequest(`/events/search_students/?q=${encodeURIComponent(query)}`);
  },
  
  getCollaborators: async (eventId: string) => {
    return apiRequest(`/events/${eventId}/collaborators/`);
  },
  
  addCollaborator: async (eventId: string, userId: string, isAdmin: boolean = false) => {
    return apiRequest(`/events/${eventId}/add_collaborator/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, is_admin: isAdmin }),
    });
  },
  
  removeCollaborator: async (eventId: string, collaboratorId: string) => {
    return apiRequest(`/events/${eventId}/remove_collaborator/`, {
      method: 'POST',
      body: JSON.stringify({ collaborator_id: collaboratorId }),
    });
  },
  
  updateCollaborator: async (eventId: string, collaboratorId: string, isAdmin: boolean) => {
    return apiRequest(`/events/${eventId}/update_collaborator/`, {
      method: 'POST',
      body: JSON.stringify({ collaborator_id: collaboratorId, is_admin: isAdmin }),
    });
  },
  
  deleteEvent: async (eventId: string) => {
    return apiRequest(`/events/${eventId}/`, {
      method: 'DELETE',
    });
  },
  
  attendEvent: async (eventId: string, status: 'attending' | 'maybe' | 'declined') => {
    return apiRequest(`/events/${eventId}/attend/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
  
  cancelAttendance: async (eventId: string) => {
    return apiRequest(`/events/${eventId}/cancel_attendance/`, {
      method: 'POST',
    });
  },
  
  getAttendees: async (eventId: string, status?: 'attending' | 'maybe' | 'declined') => {
    let endpoint = `/events/${eventId}/attendees/`;
    if (status) {
      endpoint += `?status=${status}`;
    }
    return apiRequest(endpoint);
  },
  
  autoRegisterCollaborators: async (eventId: string) => {
    return apiRequest(`/events/${eventId}/auto_register_collaborators/`, {
      method: 'POST'
    });
  }
};

// Quizzes API
export const quizzesAPI = {
  getPublicQuizzes: async () => {
    return apiRequest('/quizzes/?public=true');
  },

  getStudentResults: async (quizId: string) => {
    return apiRequest(`/quizzes/${quizId}/student-results/`);
  },
  


  
  getQuizzes: async (roomId: string) => {
    return apiRequest(`/quizzes/?room=${roomId}`);
  },
  
  getQuizDetails: async (quizId: string) => {
    return apiRequest(`/quizzes/${quizId}/`);
  },
  
  createQuiz: async (quizData: any) => {
    return apiRequest('/quizzes/', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  },

  deleteQuiz: async (quizId: string) => {
    return apiRequest(`/quizzes/${quizId}/`, {
      method: 'DELETE',
    });
  },
  
  
  submitQuiz: async (quizId: string, answers: any[]) => {
    return apiRequest(`/quizzes/${quizId}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },
  
  getQuizResources: async (quizId: string) => {
    return apiRequest(`/quizzes/${quizId}/resources/`);
  },
  
  downloadQuizResource: async (resourceId: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/quizzes/resource/${resourceId}/download/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download resource');
    }
    
    return response.blob();
  },
  
  getTeacherRoomsQuizzes: async () => {
    return apiRequest('/quizzes/teacher-rooms-quizzes/');
  },

  updateQuiz: async (quizId: string, data: any) => {
    return apiRequest(`/quizzes/${quizId}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
  },

  toggleQuizActiveStatus: async (quizId: string) => {
    return apiRequest(`/quizzes/${quizId}/toggle_active/`, {
        method: 'POST',
    });
  },

  getTeacherAllStudentAnswers: async () => {
    return apiRequest('/quizzes/teacher-all-student-answers/');
  },
};

// Forums API
export const forumsAPI = {
  getCategories: async () => {
    try {
      const response = await apiRequest('/forums/categories/');
      console.log('Forum categories response:', response);
      
      // Handle potential PostgreSQL connection issues with empty response
      if (!response) {
        console.error('Empty response from forum categories API');
        return { results: [], count: 0 };
      }
      
      return {
        results: Array.isArray(response) ? response : response?.results || [],
        count: response?.count || 0
      };
    } catch (error) {
      console.error('Failed to fetch forum categories:', error);
      
      // For database connection errors, return empty results instead of throwing
      if (error instanceof Error && error.message.includes('connection')) {
        console.warn('Database connection issue, returning empty categories');
        return { results: [], count: 0 };
      }
      
      throw error; // Propagate other errors to be handled by the component
    }
  },
  
  getTopics: async (params?: { 
    category?: string; 
    room?: string; 
    search?: string;
    tags?: string;
    is_solved?: boolean;
    created_after?: string;
    created_before?: string;
  }) => {
    let endpoint = '/forums/topics/';
    if (params) {
      const queryParams = [];
      if (params.category) queryParams.push(`category=${params.category}`);
      if (params.room) queryParams.push(`room=${params.room}`);
      if (params.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
      if (params.tags) queryParams.push(`tags=${encodeURIComponent(params.tags)}`);
      if (params.is_solved !== undefined) queryParams.push(`is_solved=${params.is_solved}`);
      if (params.created_after) queryParams.push(`created_after=${params.created_after}`);
      if (params.created_before) queryParams.push(`created_before=${params.created_before}`);
      
      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }
    }
    
    console.log('Fetching topics from endpoint:', endpoint);
    try {
      // Add retry logic for PostgreSQL connection issues
      let attempts = 0;
      const maxAttempts = 2;
      let lastError;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          const response = await apiRequest(endpoint);
          console.log('Topics response:', response);
          
          // Ensure consistent response format
          if (Array.isArray(response)) {
            return { results: response, count: response.length };
          } else if (response && response.results) {
            return response;
          } else if (response) {
            return { results: [response], count: 1 };
          }
          return { results: [], count: 0 };
        } catch (error) {
          console.error(`Error fetching topics (attempt ${attempts}):`, error);
          lastError = error;
          
          // Only retry on connection errors
          if (error instanceof Error && error.message.includes('connection') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
          } else {
            throw error; // Rethrow if not a connection error or max attempts reached
          }
        }
      }
      
      throw lastError; // Throw the last error if all attempts failed
    } catch (error) {
      console.error('Error fetching topics after all attempts:', error);
      throw error; // Propagate error to be handled by the component
    }
  },
  
  getTopic: async (topicId: string) => {
    try {
      const response = await apiRequest(`/forums/topics/${topicId}/`);
      return response;
    } catch (error) {
      console.error(`Error fetching topic ${topicId}:`, error);
      throw error; // Propagate error to be handled by the component
    }
  },
  
  createTopic: async (topicData: {
    title: string;
    content: string;
    category_id: number;
    room?: number;
    tags?: string;
    attachment_base64?: string | null;
    attachment_name?: string | null;
    attachment_type?: string | null;
    attachment_size?: number | null;
  }) => {
    try {
      console.log('Sending topic data to server:', {
        ...topicData,
        attachment_base64: topicData.attachment_base64 ? '[base64 data]' : null
      });
      
      // Sanitize data for PostgreSQL
      const sanitizedData = {
        ...topicData,
        // Ensure title and content don't exceed PostgreSQL text field limits
        title: topicData.title.substring(0, 255), // VARCHAR(255) limit
        // Ensure tags are properly formatted for PostgreSQL
        tags: topicData.tags ? topicData.tags.replace(/[^\w\s,]/g, '').substring(0, 500) : undefined,
      };
      
      const response = await apiRequest('/forums/topics/', {
        method: 'POST',
        body: JSON.stringify(sanitizedData),
      });
      
      if (!response || !response.id) {
        throw new Error('Invalid response from server when creating topic');
      }
      
      console.log('Server response:', response);
      return response;
    } catch (error) {
      console.error('Error in createTopic:', error);
      
      // Handle specific PostgreSQL errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          throw new Error('A similar topic already exists');
        } else if (error.message.includes('foreign key')) {
          throw new Error('Invalid category or room reference');
        }
      }
      
      throw error;
    }
  },
  
  downloadTopicAttachment: async (topicId: string) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/attachment/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Attachment download error:', errorText);
        throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error(`Error downloading topic attachment for topic ${topicId}:`, error);
      throw error;
    }
  },
  
  toggleSolved: async (topicId: string, postId?: string) => {
    try {
      console.log(`Toggling solved status for topic ${topicId}${postId ? ` with solution post ${postId}` : ''}`);
      const response = await apiRequest(`/forums/topics/${topicId}/toggle_solved/`, {
        method: 'POST',
        body: JSON.stringify({ post_id: postId }),
      });
      console.log('Toggle solved response:', response);
      return response;
    } catch (error) {
      console.error('Error in toggleSolved:', error);
      throw error;
    }
  },
  
  subscribeTopic: async (topicId: string, emailNotifications: boolean = true) => {
    try {
      console.log(`${emailNotifications ? 'Subscribing to' : 'Unsubscribing from'} topic ${topicId}`);
      const response = await apiRequest(`/forums/topics/${topicId}/subscribe/`, {
        method: 'POST',
        body: JSON.stringify({ email_notifications: emailNotifications }),
      });
      console.log('Subscription response:', response);
      return response;
    } catch (error) {
      console.error('Error in subscribeTopic:', error);
      throw error;
    }
  },
  
  getSubscriptionStatus: async (topicId: string) => {
    try {
      const response = await apiRequest(`/forums/topics/${topicId}/subscription_status/`);
      return response;
    } catch (error) {
      console.error(`Error fetching subscription status for topic ${topicId}:`, error);
      return { subscribed: false }; // Default to not subscribed on error
    }
  },
  
  incrementView: async (topicId: string) => {
    try {
      console.log(`Incrementing view count for topic ${topicId}`);
      const response = await apiRequest(`/forums/topics/${topicId}/increment_view/`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error in incrementView:', error);
      // Don't throw the error as this is not critical functionality
      return null;
    }
  },
  
  likeTopic: async (topicId: string) => {
    try {
      console.log(`Toggling like for topic ${topicId}`);
      const response = await apiRequest(`/forums/topics/${topicId}/like_topic/`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error in likeTopic:', error);
      throw error;
    }
  },
  
  getLikeStatus: async (topicId: string) => {
    try {
      const response = await apiRequest(`/forums/topics/${topicId}/like_status/`);
      return response;
    } catch (error) {
      console.error(`Error fetching like status for topic ${topicId}:`, error);
      return { liked: false };
    }
  },
  
  getPosts: async (topicId: string, search?: string) => {
    let endpoint = `/forums/posts/?topic=${topicId}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    try {
      // Direct database query - simple and straightforward
      const response = await apiRequest(endpoint);
      console.log('Posts from database:', response);
      
      // Process the response to ensure content is a string
      let results = [];
      if (Array.isArray(response)) {
        results = response.map(post => ({
          ...post,
          content: String(post.content) // Ensure content is a string
        }));
      } else if (response && response.results) {
        results = response.results.map(post => ({
          ...post,
          content: String(post.content) // Ensure content is a string
        }));
      }
      
      return { 
        results: results, 
        count: results.length 
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return { results: [], count: 0 }; // Return empty results on error
    }
  },
  
  createPost: async (postData: {
    topic: number;
    content: string;
    parent_post?: number;
    attachment_base64?: string | null;
    attachment_name?: string | null;
    attachment_type?: string | null;
    attachment_size?: number | null;
  }) => {
    try {
      // Ensure content is a string
      const sanitizedData = {
        ...postData,
        content: String(postData.content)
      };
      
      // Wait for the response
      const response = await apiRequest('/forums/posts/', {
        method: 'POST',
        body: JSON.stringify(sanitizedData),
      });
      
      return response;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },
  
  downloadPostAttachment: async (postId: string) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/forums/posts/${postId}/attachment/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Attachment download error:', errorText);
        throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error(`Error downloading post attachment for post ${postId}:`, error);
      throw error;
    }
  },
  
  votePost: async (postId: string, voteType: 'upvote' | 'downvote') => {
    try {
      console.log(`Voting ${voteType} for post ${postId}`);
      const response = await apiRequest(`/forums/posts/${postId}/vote/`, {
        method: 'POST',
        body: JSON.stringify({ vote_type: voteType }),
      });
      console.log('Vote response:', response);
      return response;
    } catch (error) {
      console.error('Error in votePost:', error);
      throw error;
    }
  },
  
  getVoteStatus: async (postId: string) => {
    return apiRequest(`/forums/posts/${postId}/vote_status/`);
  }
};

// Notifications API
export const notificationsAPI = {
  getNotifications: async () => {
    try {
      console.log('Fetching notifications from API');
      const response = await apiRequest('/notifications/');
      console.log('Raw notifications response:', response);
      return {
        results: Array.isArray(response) ? response : response?.results || [],
        count: response?.count || 0
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { results: [], count: 0 };
    }
  },
  
  getAllNotifications: async (includeArchived: boolean = true) => {
    try {
      console.log('Fetching all notifications from API');
      const endpoint = includeArchived ? '/notifications/?include_archived=true' : '/notifications/';
      const response = await apiRequest(endpoint);
      console.log('Raw all notifications response:', response);
      return {
        results: Array.isArray(response) ? response : response?.results || [],
        count: response?.count || 0
      };
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      return { results: [], count: 0 };
    }
  },
  
  markAsRead: async (notificationId: string) => {
    try {
      console.log(`Marking notification ${notificationId} as read`);
      const response = await apiRequest(`/notifications/${notificationId}/mark_as_read/`, {
        method: 'POST',
      });
      console.log('Mark as read response:', response);
      return response;
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      throw error;
    }
  },
  
  markAllAsRead: async () => {
    try {
      console.log('Marking all notifications as read');
      const response = await apiRequest('/notifications/mark_all_as_read/', {
        method: 'POST',
      });
      console.log('Mark all as read response:', response);
      return response;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
};


// Chunked upload API functions
export const uploadAPI = {
  createUploadSession: async (eventId: string, metadata: {
    filename: string;
    filesize: number;
    filetype: string;
    chunks: number;
  }) => {
    return apiRequest(`/events/${eventId}/upload-session/`, {
      method: 'POST',
      body: JSON.stringify(metadata),
    });
  },

  uploadChunk: async (sessionId: string, data: {
    chunk: string;
    chunkNumber: number;
  }) => {
    return apiRequest(`/upload-sessions/${sessionId}/chunk/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  finalizeUpload: async (sessionId: string) => {
    return apiRequest(`/upload-sessions/${sessionId}/finalize/`, {
      method: 'POST',
    });
  }
};

// Platform settings API
export const platformAPI = {
  getSettings: async () => {
    try {
      const response = await apiRequest('/platform/settings/');
      return response;
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      throw error;
    }
  },
  
  updateSettings: async (settings: {
    platformName?: string;
    pageSizes?: {
      resources?: number;
      forumPosts?: number;
      events?: number;
      users?: number;
    };
    generalSettings?: {
      enableRegistration?: boolean;
      maintenanceMode?: boolean;
      publicProfiles?: boolean;
    };
    securitySettings?: {
      passwordPolicy?: boolean;
      sessionTimeout?: boolean;
    }
  }) => {
    try {
      const response = await apiRequest('/platform/settings/', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      return response;
    } catch (error) {
      console.error('Error updating platform settings:', error);
      throw error;
    }
  },
  
  uploadLogo: async (logoData: string) => {
    try {
      const response = await apiRequest('/platform/logo/', {
        method: 'POST',
        body: JSON.stringify({ logo: logoData }),
      });
      return response;
    } catch (error) {
      console.error('Error uploading platform logo:', error);
      throw error;
    }
  },
  
  getDatabaseStats: async () => {
    try {
      const response = await apiRequest('/platform/stats/');
      return response;
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw error;
    }
  },

  getDbConfig: async () => {
    return apiRequest('/platform/db-config/');
  },

  saveDbConfig: async (config: {
    db_host: string;
    db_port: string;
    db_name: string;
    db_user: string;
    db_password: string;
  }) => {
    return apiRequest('/platform/db-config/', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  testDbConnection: async (config: {
    db_host: string;
    db_port: string;
    db_name: string;
    db_user: string;
    db_password: string;
  }) => {
    return apiRequest('/platform/db-config/test/', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
};
