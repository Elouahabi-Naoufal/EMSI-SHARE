# Platform Roadmap

A full list of missing features for a production-ready school/university LMS, organized by priority.

---

## 🔴 Priority 1 — Critical (Core LMS Functionality)

### 1. Assignments & Submission System
The core loop of any LMS. Without this the platform is just a resource library.

**Teacher side:**
- Create assignments with title, description, deadline, max score
- Attach files/resources to assignments
- Link assignments to a room
- Set submission type (file upload, text, link)
- Late submission policy (allow/deny/penalty)
- Grade and leave feedback per submission

**Student side:**
- View assignments per room with deadline countdown
- Submit files or text answers
- See submission status (submitted, graded, late, missing)
- View teacher feedback and score

**Backend models needed:**
- `Assignment` (title, description, room, created_by, deadline, max_score, submission_type, allow_late)
- `AssignmentSubmission` (assignment, student, file_data, text_answer, submitted_at, score, feedback, status)

---

### 2. Gradebook
Centralized grade tracking per student per subject.

**Teacher side:**
- View all students' grades in a table per room
- Manually enter grades for any activity (assignment, exam, participation)
- Auto-populate from quiz scores and assignment grades
- Calculate weighted averages (configurable weights per grade type)
- Export gradebook as CSV or PDF

**Student side:**
- View own grades per room/subject
- See grade breakdown (quizzes, assignments, participation)
- GPA calculation across all rooms

**Backend models needed:**
- `GradeEntry` (student, room, category, title, score, max_score, weight, created_by, created_at)
- `GradeCategory` (room, name, weight — e.g. "Quizzes 30%, Assignments 50%, Participation 20%")

---

### 3. Attendance System
Mark and track who attended each class or event.

**Teacher side:**
- Open attendance for a session (linked to room or event)
- Mark each student: present / absent / late / excused
- Add notes per student
- View attendance history per room
- Attendance rate per student (%)

**Student side:**
- View own attendance record per room
- See absence count and warnings

**Admin side:**
- Platform-wide attendance reports
- Flag students below attendance threshold
- Notify students/parents of absences

**Backend models needed:**
- `AttendanceSession` (room, event, date, created_by, title)
- `AttendanceRecord` (session, student, status, note)

---

### 4. Timetable / Class Schedule
Weekly schedule for students and teachers.

**Features:**
- Admin creates institution-wide timetable slots
- Teachers assigned to rooms/subjects at specific times
- Students see their personal weekly schedule
- Color-coded by subject
- Export to calendar (iCal)
- Conflict detection (same room/teacher double-booked)

**Backend models needed:**
- `TimetableSlot` (room, day_of_week, start_time, end_time, recurrence, location)

---

### 5. Forgot Password / Password Reset
Currently impossible to recover an account without admin help.

**Flow:**
- "Forgot password" link on login page
- Enter email → receive reset link (token-based, expires in 1 hour)
- Click link → enter new password
- Token invalidated after use

**Backend:**
- `PasswordResetToken` (user, token, created_at, used)
- Email sending via Django's email backend (SMTP configurable in settings)

---

## 🟡 Priority 2 — Important (Institutional Features)

### 6. Direct Messaging / Inbox
Private communication between users.

**Features:**
- Student ↔ Teacher private messages
- Teacher ↔ Teacher
- Admin broadcast messages
- Unread message count in header
- Message threads (conversation view)
- File attachments in messages
- No group chat (keep it simple, forums handle that)

**Backend models needed:**
- `Message` (sender, recipient, subject, body, attachment_data, is_read, created_at)
- `MessageThread` (participants, last_message, created_at)

---

### 7. Enrollment / Course Registration
Formal enrollment instead of just joining with a code.

**Features:**
- Course catalog (public list of available rooms/courses)
- Students request enrollment → teacher/admin approves
- Enrollment periods (open/closed)
- Waitlist when room is full
- Prerequisites (must complete room X before enrolling in room Y)
- Admin can bulk-enroll students

**Backend changes:**
- Add `enrollment_status` to `RoomParticipant` (enrolled, waitlisted, rejected)
- Add `enrollment_open` and `max_students` to `Room`
- Add `prerequisites` M2M on `Room`

---

### 8. Academic Calendar
Institution-wide calendar separate from room events.

**Features:**
- Admin manages calendar entries
- Entry types: semester start/end, exam period, holiday, registration deadline, break
- Visible to all users on dashboard
- Syncs with personal calendar view
- Color-coded by type

**Backend models needed:**
- `AcademicCalendarEntry` (title, start_date, end_date, entry_type, description, created_by)

---

### 9. Announcements System
Broadcast messages from admin/teachers to targeted audiences.

**Features:**
- Admin announces to entire platform
- Teacher announces to specific room(s)
- Pinned announcements on dashboard
- Announcement expiry date
- Rich text content (markdown)
- Push notification on new announcement

**Backend models needed:**
- `Announcement` (title, content, created_by, target_type (all/room/role), target_room, target_role, pinned, expires_at)

---

### 10. Bulk User Import
Import students/teachers from CSV at semester start.

**Features:**
- Upload CSV with columns: first_name, last_name, email, role, room_codes
- Preview before import (show errors)
- Auto-generate passwords and send welcome emails
- Duplicate detection (skip or update existing)
- Import report (X created, Y skipped, Z errors)

**Backend:**
- New admin endpoint `/api/users/bulk-import/`
- CSV parsing with validation

---

### 11. Email Verification on Registration
Currently users register without verifying their email.

**Flow:**
- On register → send verification email with token link
- Account is active but limited until verified
- Resend verification email option
- Admin can manually verify users

**Backend:**
- `EmailVerificationToken` (user, token, created_at, used)

---

## 🟢 Priority 3 — Nice to Have (Engagement & Polish)

### 12. Certificates & Badges
Reward completion and achievement.

**Certificates:**
- Auto-generate PDF certificate when student completes a room (teacher marks complete)
- Certificate includes: student name, course name, teacher name, date, platform logo
- Downloadable from student profile
- Shareable link

**Badges:**
- First login, first quiz, perfect score, 10 resources uploaded, etc.
- Displayed on student profile
- Configurable by admin

**Backend models needed:**
- `Certificate` (student, room, issued_at, pdf_data)
- `Badge` (name, description, icon, criteria_type, criteria_value)
- `UserBadge` (user, badge, earned_at)

---

### 13. Student Progress Reports
Auto-generated PDF reports per student.

**Contents:**
- Attendance percentage
- Quiz scores and averages
- Assignment completion rate
- Resources accessed count
- Forum participation (posts, topics)
- Grade summary

**Features:**
- Teacher generates report for any student in their room
- Admin generates for any student
- Exportable as PDF
- Scheduled auto-send to student email (weekly/monthly)

---

### 14. Two-Factor Authentication (2FA)
The `password_policy` and `session_timeout` fields exist but do nothing.

**Features:**
- TOTP-based 2FA (Google Authenticator compatible)
- QR code setup in profile settings
- Backup codes
- Admin can require 2FA for specific roles
- Session timeout enforcement (auto-logout after X minutes of inactivity)

---

### 15. Internationalization (i18n)
`UserProfile.language_preference` exists but is unused.

**Languages to support:**
- English (default)
- French (relevant for EMSI/Moroccan institutions)
- Arabic (RTL support needed)

**Implementation:**
- Frontend: i18next
- Backend: Django's built-in i18n
- Language switcher in settings and login page

---

### 16. Parent / Guardian Portal
For schools (less relevant for universities).

**New role:** `parent`

**Features:**
- Parent linked to one or more student accounts
- View child's grades, attendance, assignments
- Receive notifications for absences, low grades, missing assignments
- Message teachers directly
- Cannot access forums or resources

**Backend changes:**
- Add `parent` to `ROLE_CHOICES`
- `ParentStudentLink` (parent, student, relationship)

---

### 17. Audit Logs
Track all sensitive actions for accountability.

**Logged actions:**
- User created/deleted/role changed
- Resource approved/rejected
- Grade added/modified
- Assignment graded
- Settings changed
- Bulk imports

**Backend models needed:**
- `AuditLog` (actor, action, target_type, target_id, details, ip_address, created_at)

**Admin UI:**
- Filterable log viewer in settings
- Export as CSV

---

### 18. Data Export & Privacy (GDPR)
**Features:**
- Student can request full data export (JSON/ZIP with all their data)
- Account deletion request (admin approval)
- Admin can anonymize a user's data
- Data retention policy settings

---

### 19. Plagiarism Detection (Basic)
For assignment submissions.

**Approach:**
- Compare submitted text against other submissions in the same assignment
- Similarity score (%) using basic text fingerprinting
- Flag high-similarity submissions for teacher review
- No external API needed for basic implementation

---

### 20. Live Session Integration
Events have `meeting_link` but no real integration.

**Features:**
- Generate Jitsi Meet room link automatically when creating an online event
- Embedded video player in event detail page (for recorded sessions)
- "Join now" button active only during event time window

---

## 📊 Implementation Order Summary

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Assignments & Submissions | High | 🔴 Critical |
| 2 | Gradebook | High | 🔴 Critical |
| 3 | Attendance | Medium | 🔴 Critical |
| 4 | Timetable | Medium | 🔴 Critical |
| 5 | Forgot Password | Low | 🔴 Critical |
| 6 | Direct Messaging | Medium | 🟡 Important |
| 7 | Enrollment System | Medium | 🟡 Important |
| 8 | Academic Calendar | Low | 🟡 Important |
| 9 | Announcements | Low | 🟡 Important |
| 10 | Bulk User Import | Low | 🟡 Important |
| 11 | Email Verification | Low | 🟡 Important |
| 12 | Certificates & Badges | Medium | 🟢 Nice to have |
| 13 | Progress Reports | Medium | 🟢 Nice to have |
| 14 | 2FA | Medium | 🟢 Nice to have |
| 15 | i18n | High | 🟢 Nice to have |
| 16 | Parent Portal | High | 🟢 Nice to have |
| 17 | Audit Logs | Low | 🟢 Nice to have |
| 18 | Data Export / GDPR | Low | 🟢 Nice to have |
| 19 | Plagiarism Detection | Medium | 🟢 Nice to have |
| 20 | Live Session Integration | Medium | 🟢 Nice to have |

---

## Current Stack Reminder
- **Frontend:** React 18 + TypeScript, Vite, Tailwind, Radix UI, TanStack Query
- **Backend:** Django 6 + DRF, PostgreSQL, JWT (SimpleJWT)
- **File storage:** Binary fields in PostgreSQL (no filesystem)
