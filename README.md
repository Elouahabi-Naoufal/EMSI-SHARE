<div align="center">

<img src="public/favicon.ico" alt="Logo" width="80" height="80" />

# EMSI Share Learn

### A full-stack collaborative learning platform for schools & universities

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Django](https://img.shields.io/badge/Django-5.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[![GitHub stars](https://img.shields.io/github/stars/Elouahabi-Naoufal/EMSI-SHARE?style=for-the-badge&logo=github&color=yellow)](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Elouahabi-Naoufal/EMSI-SHARE?style=for-the-badge&logo=github&color=blue)](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/network/members)
[![GitHub issues](https://img.shields.io/github/issues/Elouahabi-Naoufal/EMSI-SHARE?style=for-the-badge&logo=github&color=red)](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/issues)
[![GitHub commits](https://img.shields.io/github/commit-activity/t/Elouahabi-Naoufal/EMSI-SHARE?style=for-the-badge&logo=github&color=green&label=commits)](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/commits/main)
[![Last Commit](https://img.shields.io/github/last-commit/Elouahabi-Naoufal/EMSI-SHARE?style=for-the-badge&logo=github&color=purple)](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/commits/main)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

<br/>

[**Live Demo**](https://github.com/Elouahabi-Naoufal/EMSI-SHARE) · [**Report Bug**](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/issues) · [**Request Feature**](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/issues) · [**Roadmap**](ROADMAP.md)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [User Roles](#-user-roles)
- [API Overview](#-api-overview)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

**EMSI Share Learn** is a production-ready Learning Management System (LMS) built for schools and universities. It brings together resource sharing, quizzes, discussion forums, event management, and collaborative rooms into a single unified platform — all with role-based access control and a clean, modern UI.

> Built as a final-year project (PFA) at EMSI — École Marocaine des Sciences de l'Ingénieur.

---

## ✨ Features

<table>
<tr>
<td>

**📚 Resources**
- Upload & download educational files
- Binary storage directly in PostgreSQL
- PDF, Video, Audio, Code, Documents
- Approval workflow for student uploads
- Category & search filtering

</td>
<td>

**🧠 Quizzes**
- Multiple choice & true/false
- Time limits & attempt tracking
- Auto-grading with score history
- Teacher analytics per student
- Active/inactive toggle

</td>
</tr>
<tr>
<td>

**💬 Forum**
- Threaded discussions per room
- Upvote / downvote posts
- Mark solutions, subscribe to topics
- File attachments on posts
- Like system & view tracking

</td>
<td>

**📅 Events**
- 12 event types (lecture, exam, workshop…)
- Online & physical events
- RSVP attendance tracking
- Collaborator management
- Image & video media support

</td>
</tr>
<tr>
<td>

**🏫 Rooms**
- Teacher-created subject rooms
- Student join via room code
- Moderator & assistant roles
- Room-scoped resources, quizzes, events & forum
- Private / public visibility

</td>
<td>

**⚙️ Admin Panel**
- Platform name & logo customization
- User management (create, edit, delete)
- Resource approval queue
- Database & SSH server management
- Real-time database statistics

</td>
</tr>
</table>

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| TypeScript | 5.2 | Type safety |
| Vite | 6.3 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Radix UI | Latest | Accessible components |
| TanStack Query | 5.28 | Server state management |
| React Router | 6.22 | Client-side routing |
| Recharts | 2.12 | Analytics charts |
| Lucide React | 0.358 | Icons |
| Sonner | 1.4 | Toast notifications |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Django | 5.0 | Web framework |
| Django REST Framework | 3.14 | REST API |
| SimpleJWT | 5.3 | JWT authentication |
| django-cors-headers | 4.3 | CORS handling |
| PostgreSQL | Latest | Primary database |
| psycopg2 | Latest | PostgreSQL adapter |
| Paramiko | Latest | SSH management |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   Pages  │  │Components│  │ Contexts │  │Services│  │
│  │ Dashboard│  │  Layout  │  │   Auth   │  │  API   │  │
│  │ Resources│  │  Forum   │  │ Platform │  │        │  │
│  │  Quizzes │  │  Events  │  │  Theme   │  │        │  │
│  │  Forums  │  │  Rooms   │  └──────────┘  └────────┘  │
│  └──────────┘  └──────────┘                             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / REST (JWT Bearer)
┌────────────────────────▼────────────────────────────────┐
│                   Django REST API                        │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────────────────┐ │
│  │ users  │ │resources│ │quizzes │ │     forums       │ │
│  ├────────┤ ├─────────┤ ├────────┤ ├──────────────────┤ │
│  │ rooms  │ │ events  │ │notifs  │ │platform_settings │ │
│  └────────┘ └─────────┘ └────────┘ └──────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    PostgreSQL                            │
│         (Binary file storage — no filesystem)           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **PostgreSQL** 14+

### 1. Clone the repository

```bash
git clone https://github.com/Elouahabi-Naoufal/EMSI-SHARE.git
cd EMSI-SHARE
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.development .env.local
# Set VITE_API_URL=http://127.0.0.1:8000/api

# Start development server
npm run dev
```

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv env
source env/bin/activate        # Linux/macOS
# env\Scripts\activate         # Windows

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers psycopg2-binary Pillow paramiko django-filter

# Configure database
# Edit backend/db_config.json:
# { "db_name": "your_db", "db_user": "postgres", "db_password": "your_password" }

# Run migrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### 4. Open the app

```
Frontend → http://localhost:5173
Backend  → http://localhost:8000
Admin    → http://localhost:8000/admin
```

---

## 👥 User Roles

| Role | Description | Key Permissions |
|---|---|---|
| 🎓 **Student** | Default registration role | Join rooms, take quizzes, post in forums, upload resources (pending approval) |
| 👨‍🏫 **Teacher** | Educator role | Create rooms & quizzes, manage resources, create events, view student analytics |
| 🔧 **Admin** | Platform administrator | Full access, approve resources, manage users, platform settings |
| 🏛 **Administration** | Institutional management | User CRUD, verification, platform-wide control |

---

## 📡 API Overview

Base URL: `http://localhost:8000/api`

| Endpoint | Method | Description |
|---|---|---|
| `/token/` | POST | Obtain JWT token pair |
| `/token/refresh/` | POST | Refresh access token |
| `/auth/register/` | POST | Register new user |
| `/auth/me/` | GET/PATCH | Current user profile |
| `/rooms/` | GET/POST | List / create rooms |
| `/rooms/{id}/join/` | POST | Join a room |
| `/resources/` | GET/POST | List / upload resources |
| `/resources/{id}/approve/` | POST | Approve resource (admin) |
| `/quizzes/` | GET/POST | List / create quizzes |
| `/quizzes/{id}/submit/` | POST | Submit quiz answers |
| `/forums/topics/` | GET/POST | List / create topics |
| `/forums/posts/` | GET/POST | List / create posts |
| `/events/` | GET/POST | List / create events |
| `/notifications/` | GET | Get notifications |
| `/platform/public/` | GET | Public branding (no auth) |
| `/platform/settings/` | GET/POST | Full settings (admin only) |

> Full API documentation available in the platform's `/documentation` page.

---

## 📁 Project Structure

```
emsi-share-learn/
│
├── src/                          # React frontend
│   ├── components/
│   │   ├── admin/                # Admin-specific components
│   │   ├── dashboard/            # Role-based dashboard widgets
│   │   ├── events/               # Event management UI
│   │   ├── forum/                # Forum components
│   │   ├── layout/               # Header, Sidebar, MainLayout
│   │   ├── resources/            # Resource upload/view/preview
│   │   ├── rooms/                # Room management
│   │   └── ui/                   # Base Radix UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx        # JWT auth, user state
│   │   ├── PlatformContext.tsx    # Platform settings & branding
│   │   └── ThemeContext.tsx       # Light/dark theme
│   ├── pages/                    # Route-level page components
│   ├── services/
│   │   └── api.ts                # All API calls (typed)
│   └── types/                    # TypeScript type definitions
│
├── backend/
│   ├── users/                    # Custom user model, auth views
│   ├── rooms/                    # Room & participant management
│   ├── resources/                # File upload, approval workflow
│   ├── quizzes/                  # Quiz engine, attempts, scoring
│   ├── forums/                   # Topics, posts, votes, subscriptions
│   ├── events/                   # Events, attendees, collaborators
│   ├── notifications/            # Notification system
│   ├── platform_settings/        # Admin settings, DB stats, SSH
│   └── backend_project/          # Django settings, URLs, WSGI
│
├── ROADMAP.md                    # Planned features
└── README.md                     # This file
```

---

## 🗺 Roadmap

See the full [**ROADMAP.md**](ROADMAP.md) for the complete list of planned features.

**Coming next:**

- [ ] 📝 Assignments & Submission System
- [ ] 📊 Gradebook
- [ ] ✅ Attendance Tracking
- [ ] 🗓 Timetable / Class Schedule
- [ ] 🔑 Forgot Password / Email Reset
- [ ] 💬 Direct Messaging
- [ ] 🎓 Certificates & Badges
- [ ] 👨‍👩‍👧 Parent Portal
- [ ] 🌍 Internationalization (EN / FR / AR)

---

## 🤝 Contributing

Contributions are welcome!

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Commit your changes
git commit -m "feat: add amazing feature"

# 4. Push to the branch
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

Please make sure to:
- Follow the existing code style
- Write meaningful commit messages
- Test your changes before submitting

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

## 👨‍💻 Authors

<table>
<tr>
<td align="center">
<b>Naoufal Elouahabi</b><br/>
<a href="mailto:naoufal.elouahabi@emsi-edu.ma">naoufal.elouahabi@emsi-edu.ma</a><br/>
<a href="https://github.com/Elouahabi-Naoufal">@Elouahabi-Naoufal</a>
</td>
<td align="center">
<b>Amine Amrani</b><br/>
<a href="mailto:amraniaamine@gmail.com">amraniaamine@gmail.com</a>
</td>
</tr>
</table>

---

<div align="center">

**⭐ Star this repo if you find it useful!**

[![GitHub stars](https://img.shields.io/github/stars/Elouahabi-Naoufal/EMSI-SHARE?style=social)](https://github.com/Elouahabi-Naoufal/EMSI-SHARE/stargazers)

<sub>Built with ❤️ at EMSI — École Marocaine des Sciences de l'Ingénieur</sub>

</div>
