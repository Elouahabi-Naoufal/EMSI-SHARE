import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const DEFAULT_AVATAR = "/placeholder.svg";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { platformName, platformLogo } = usePlatform();
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-r from-primary to-primary-light dark:from-primary-dark dark:to-primary shadow-sm border-b border-gray-200 dark:border-gray-700 py-3 px-4 md:px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center">
        <Link to="/" className="flex items-center">
          {platformLogo ? (
            <img 
              src={platformLogo} 
              alt={platformName} 
              className="h-8 w-8 mr-2 rounded-sm"
            />
          ) : null}
          <h1 className="text-2xl font-bold text-white">{platformName}</h1>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full hover:bg-accent/20 transition-colors focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => navigate('/profile')}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePicture || user?.avatar || DEFAULT_AVATAR} alt={user?.name} />
                <AvatarFallback className="bg-white text-primary dark:bg-gray-800 dark:text-white">
                  {user?.role === 'administration' ? 'AD' : user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-background border border-border shadow-lg" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center w-full cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/notifications" className="flex items-center w-full cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Notification History</span>
              </Link>
            </DropdownMenuItem>
            {(user?.role === 'admin' || user?.role === 'administration') && (
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center w-full cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Platform Settings</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;