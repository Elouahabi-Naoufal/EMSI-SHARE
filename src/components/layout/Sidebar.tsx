
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  MessageSquare, 
  BarChart, 
  FileText, 
  Home, 
  Users, 
  Calendar,
  GraduationCap,
  Settings,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  BookMarked,
  UserCheck,
  Clock,
  Mail,
  Megaphone,
  Award,
  Upload,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { quizzesAPI } from '@/services/api';

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [publicQuizzes, setPublicQuizzes] = useState<any[]>([]);
  
  // Fetch public quizzes
  useEffect(() => {
    const fetchPublicQuizzes = async () => {
      try {
        const quizzes = await quizzesAPI.getPublicQuizzes();
        setPublicQuizzes(quizzes);
      } catch (error) {
        console.error('Failed to fetch public quizzes:', error);
      }
    };
    
    if (user) {
      fetchPublicQuizzes();
    }
  }, [user]);
  
  // Define navigation items based on user role
  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Resources', href: '/resources', icon: FileText },
    ...(user?.role === 'teacher' || user?.role === 'librarian' || user?.role === 'counselor' || user?.role === 'coordinator' || user?.role === 'staff' ? [
      { name: 'My Rooms', href: '/rooms', icon: DoorOpen },
    ] : []),
    ...(user?.role === 'student' ? [
      { name: 'My Rooms', href: '/student-rooms', icon: DoorOpen },
      { name: 'Course Catalog', href: '/catalog', icon: BookOpen },
    ] : []),
    ...(user?.role === 'parent' ? [
      { name: 'Parent Portal', href: '/parent', icon: Users },
    ] : []),
    { name: 'Assignments', href: '/assignments', icon: ClipboardList },
    { name: 'Gradebook', href: '/gradebook', icon: BookMarked },
    { name: 'Attendance', href: '/attendance', icon: UserCheck },
    { name: 'Timetable', href: '/timetable', icon: Clock },
    { name: 'Forum', href: '/forum', icon: MessageSquare },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Announcements', href: '/announcements', icon: Megaphone },
    { name: 'Academic Calendar', href: '/calendar', icon: BookOpen },
    { name: 'Messages', href: '/messages', icon: Mail },
    ...(user?.role === 'admin' || user?.role === 'administration' ? [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Bulk Import', href: '/bulk-import', icon: Upload },
      { name: 'Audit Logs', href: '/audit-logs', icon: Shield },
      { name: 'Settings', href: '/settings', icon: Settings },
    ] : []),
  ];

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} fixed top-16 left-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-64px)] flex flex-col shadow-md transition-all duration-300 ease-in-out z-10`}>
      <div className="p-4 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute -right-3 top-2 h-6 w-6 rounded-full bg-gradient-to-r from-primary/10 to-primary-light/10 dark:from-primary-dark/20 dark:to-primary/20 backdrop-blur-md border border-primary/20 dark:border-primary-dark/30 shadow-md hover:shadow-lg hover:bg-primary/20 dark:hover:bg-primary-dark/30 transition-all duration-200"
          onClick={toggleSidebar}
        >
          {collapsed ? <ChevronRight className="h-4 w-4 text-primary dark:text-primary-light" /> : <ChevronLeft className="h-4 w-4 text-primary dark:text-primary-light" />}
        </Button>
        
        <div className={`py-3 ${collapsed ? 'px-2 justify-center' : 'px-4'} rounded-lg bg-gradient-to-r from-primary/20 to-accent/10 dark:from-primary-dark/30 dark:to-accent/20 border border-primary/30 dark:border-primary-dark/40 flex items-center mb-4 shadow-inner transition-all duration-300 hover:shadow-md hover:from-primary/30 hover:to-accent/20 dark:hover:from-primary-dark/40 dark:hover:to-accent/30`}>
          <Avatar className="w-10 h-10 shadow-md hover:shadow-lg transition-all duration-300 ring-2 ring-primary/20 dark:ring-primary-dark/30 hover:ring-primary/40 dark:hover:ring-primary-dark/50">
            <AvatarImage src={user?.profilePicture || user?.avatar} alt={user?.name || ''} />
            <AvatarFallback className="bg-gradient-to-r from-primary to-primary-light dark:from-primary-dark dark:to-primary text-white">
              {user?.role === 'admin' ? 'A' : user?.role === 'administration' ? 'AD' : user?.role === 'teacher' ? 'T' : 'S'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-primary-dark dark:text-primary-light">{user?.name}</p>
              <p className="text-xs text-neutral dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
      
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-300 ease-in-out",
                collapsed ? "justify-center px-2" : "px-4",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary-light dark:from-primary-dark dark:to-primary text-white shadow-md scale-[1.02] transform"
                  : "text-neutral-dark dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary-dark/20 hover:text-primary dark:hover:text-primary-light hover:scale-[1.01] hover:shadow-sm"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-300", 
                collapsed ? "" : "mr-3", 
                isActive ? "text-white" : "text-neutral dark:text-gray-400",
                collapsed && !isActive && "hover:text-primary dark:hover:text-primary-light"
              )} />
              {!collapsed && item.name}
            </Link>
          );
        })}
        
        {/* Public Quizzes Section */}
        {publicQuizzes.length > 0 && !collapsed && (
          <div className="pt-4">
            <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Public Quizzes
            </h3>
            {publicQuizzes.map((quiz) => (
              <Link
                key={quiz.id}
                to={`/quiz/${quiz.id}`}
                className="flex items-center px-4 py-2 text-sm text-neutral-dark dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-primary-dark/10 hover:text-primary dark:hover:text-primary-light rounded-lg transition-all duration-200"
              >
                <GraduationCap className="mr-3 h-4 w-4 text-neutral dark:text-gray-400" />
                <span className="truncate">{quiz.title}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>
      
      {!collapsed && (
        <div className="p-4 mt-auto">
          <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10 border border-accent/20 dark:border-accent/30">
            <h3 className="text-sm font-medium text-primary-dark dark:text-primary-light">Need Help?</h3>
            <p className="text-xs text-neutral dark:text-gray-400 mt-1">Check our documentation for help with EMSI Share.</p>
            <Link to="/documentation">
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs border-primary/30 dark:border-primary-dark/50 text-primary dark:text-primary-light hover:bg-primary dark:hover:bg-primary-dark hover:text-white">
                View Documentation
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
