# EMSI Share Learn Platform

A comprehensive educational platform designed for collaborative learning, resource sharing, and academic management. Built with React (TypeScript) frontend and Django REST API backend.

## 🎯 Platform Overview

EMSI Share Learn is an all-in-one educational platform that facilitates learning through multiple interactive features including resource sharing, discussion forums, event management, quizzes, and collaborative rooms.

## 👥 User Types & Roles

### 1. **Student**
- Default role for new registrations
- Can join rooms, participate in forums, take quizzes
- Access to resources and events
- Can create forum topics and posts
- Limited administrative privileges

### 2. **Teacher**
- Can create and manage rooms
- Create and manage quizzes with questions
- Upload and manage resources
- Create events and manage attendees
- Moderate forum discussions
- Access to analytics and student progress

### 3. **Admin**
- Full platform access and control
- User management capabilities
- Platform settings configuration
- Content moderation and approval
- System analytics and reporting
- Can manage all resources, events, and rooms

### 4. **Administration**
- Similar to admin but focused on institutional management
- User verification and approval
- Platform-wide announcements
- Policy enforcement and compliance

## 🏗️ System Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router DOM
- **State Management**: React Context API + TanStack Query
- **UI Components**: Radix UI + Custom Components
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend (Django REST Framework)
- **Framework**: Django 5.0 with Django REST Framework
- **Authentication**: JWT with SimpleJWT
- **Database**: PostgreSQL (configurable)
- **File Storage**: Binary field storage in database
- **API**: RESTful API with comprehensive endpoints

## 📱 Pages & Features

### 🏠 **Landing Page** (`/landing`)
- Platform introduction and overview
- Feature highlights
- Registration and login access
- Public information about the platform

### 🔐 **Authentication Pages**
- **Login** (`/login`): User authentication with email/password
- **Register** (`/register`): New user registration with role selection

### 📊 **Dashboard** (`/`)
- Personalized user dashboard
- Quick access to recent activities
- Statistics and progress overview
- Notifications summary
- Role-based content display

### 📚 **Resources** (`/resources`)
- **File Management**: Upload, download, and organize educational materials
- **Categories**: Organized by subject and type (PDF, Video, Audio, Documents, etc.)
- **Search & Filter**: Advanced filtering by category, type, and room
- **Approval System**: Admin/teacher approval for resource uploads
- **File Types Supported**: PDF, DOC, PPT, Excel, Images, Videos, Audio, ZIP archives
- **Binary Storage**: Files stored directly in database as binary data

### 🧠 **Quizzes** (`/quiz`, `/quiz/:quizId`)
- **Quiz Creation**: Teachers can create multiple-choice and true/false questions
- **Attempt Management**: Track student attempts and scores
- **Time Limits**: Configurable time constraints
- **Scoring System**: Automatic grading with passing thresholds
- **Progress Tracking**: Detailed analytics for teachers
- **Multiple Attempts**: Configurable retry limits

### 💬 **Forum** (`/forum`, `/forum/:topicId`)
- **Discussion Categories**: Organized topic categories with color coding
- **Topic Management**: Create, edit, and manage discussion topics
- **Threaded Replies**: Nested comment system
- **Voting System**: Upvote/downvote posts
- **Solution Marking**: Mark posts as solutions to questions
- **File Attachments**: Attach files to forum posts
- **Moderation Tools**: Admin controls for content management

### 📅 **Events** (`/events`, `/events/:eventId`, `/events/:eventId/edit`)
- **Event Types**: Lectures, workshops, exams, meetings, conferences, etc.
- **Scheduling**: Date/time management with timezone support
- **Location Management**: Physical and online event support
- **Attendee Management**: RSVP system with status tracking
- **Collaboration**: Multi-user event management
- **Media Support**: Image and video attachments
- **Room Integration**: Link events to specific rooms

### 🏫 **Rooms** (`/rooms`, `/student-rooms`, `/rooms/:roomId`)
- **Room Creation**: Teachers create subject-specific rooms
- **Participant Management**: Invite and manage students
- **Role Assignment**: Student, moderator, assistant roles
- **Private/Public**: Configurable room visibility
- **Resource Integration**: Room-specific resource collections
- **Event Integration**: Room-specific event calendars
- **Forum Integration**: Room-specific discussion areas

### 👤 **Profile Management** (`/profile`)
- **Personal Information**: Name, email, bio, contact details
- **Profile Picture**: Upload and manage avatar
- **Academic Details**: Institution, department, graduation year
- **Skills & Interests**: Customizable tags and categories
- **Social Links**: External profile connections
- **Privacy Settings**: Control information visibility

### ⚙️ **Settings** (`/settings`)
- **Notification Preferences**: Email, push, quiz reminders
- **Theme Selection**: Light, dark, auto themes
- **Privacy Controls**: Public, friends, private visibility
- **Language Preferences**: Internationalization support
- **Account Security**: Password management

### 🔔 **Notifications** (`/notifications`)
- **Real-time Updates**: Forum replies, event reminders, quiz deadlines
- **Categorized Alerts**: System, academic, social notifications
- **Read/Unread Status**: Notification management
- **Preference Controls**: Granular notification settings

### 👥 **User Management** (`/users`) - Admin Only
- **User Directory**: Complete user listing with search
- **Role Management**: Assign and modify user roles
- **Account Status**: Activate, deactivate, verify users
- **Bulk Operations**: Mass user management tools

### 📈 **Analytics** (`/analytics`) - Admin/Teacher
- **User Engagement**: Activity tracking and statistics
- **Content Performance**: Resource usage, quiz scores
- **Platform Metrics**: System-wide analytics
- **Custom Reports**: Exportable data insights

### 📖 **Documentation** (`/documentation`)
- **User Guides**: Comprehensive platform documentation
- **API Documentation**: Developer resources
- **Feature Tutorials**: Step-by-step guides
- **FAQ Section**: Common questions and answers

## 🔧 Technical Features

### Security & Authentication
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- CORS configuration for cross-origin requests
- Input validation and sanitization
- File upload security measures

### File Management
- Binary file storage in database
- Chunked upload support for large files
- MIME type validation
- File size limitations
- Automatic file type detection

### Real-time Features
- Notification system
- Activity tracking
- Live updates for forum discussions
- Real-time collaboration features

### Performance Optimization
- Lazy loading for components
- Query optimization with TanStack Query
- Image optimization and caching
- Database indexing for performance

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL (recommended) or SQLite

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure database settings in settings.py
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Environment Configuration
Create `.env` files for both frontend and backend with necessary configuration variables.

## 📁 Project Structure

```
emsi-share-learn/
├── src/                          # React frontend
│   ├── components/               # Reusable UI components
│   │   ├── admin/               # Admin-specific components
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── events/              # Event management
│   │   ├── forum/               # Forum components
│   │   ├── resources/           # Resource management
│   │   ├── rooms/               # Room components
│   │   └── ui/                  # Base UI components
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom React hooks
│   ├── pages/                   # Page components
│   ├── services/                # API services
│   └── types/                   # TypeScript definitions
├── backend/                     # Django backend
│   ├── users/                   # User management
│   ├── resources/               # Resource management
│   ├── forums/                  # Forum system
│   ├── events/                  # Event management
│   ├── rooms/                   # Room system
│   ├── quizzes/                 # Quiz system
│   ├── notifications/           # Notification system
│   └── platform_settings/       # Platform configuration
└── public/                      # Static assets
```

## 🔒 Security Updates

Recent security improvements include:
- Updated `react-syntax-highlighter` to fix vulnerabilities
- Replaced vulnerable PDF viewer with safer alternatives
- Enhanced file upload validation
- Improved authentication security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation section in the platform
- Review the FAQ
- Contact the development team
- Submit issues through the platform's feedback system

---

**EMSI Share Learn Platform** - Empowering education through collaborative technology.