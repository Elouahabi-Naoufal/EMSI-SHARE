
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PlatformProvider } from "./contexts/PlatformContext";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import Quiz from "./pages/Quiz";
import Forum from "./pages/Forum";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import EditEvent from "./pages/EditEvent";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Rooms from "./pages/Rooms";
import StudentRooms from "./pages/StudentRooms";
import RoomDetails from "./pages/RoomDetails";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Documentation from "./pages/Documentation";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Assignments from "./pages/assignments/Assignments";
import Gradebook from "./pages/gradebook/Gradebook";
import Attendance from "./pages/attendance/Attendance";
import Timetable from "./pages/timetable/Timetable";
import Messaging from "./pages/messaging/Messaging";
import Announcements from "./pages/announcements/Announcements";
import AcademicCalendar from "./pages/calendar/AcademicCalendar";
import Certificates from "./pages/certificates/Certificates";
import AuditLogs from "./pages/admin/AuditLogs";
import BulkImport from "./pages/admin/BulkImport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="emsi-share-theme">
      <AuthProvider>
        <PlatformProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/quiz/:quizId" element={<Quiz />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/:topicId" element={<Forum />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:eventId" element={<EventDetails />} />
              <Route path="/events/:eventId/edit" element={<EditEvent />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/student-rooms" element={<StudentRooms />} />
              <Route path="/rooms/:roomId" element={<RoomDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/gradebook" element={<Gradebook />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/messages" element={<Messaging />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/calendar" element={<AcademicCalendar />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/bulk-import" element={<BulkImport />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </PlatformProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
