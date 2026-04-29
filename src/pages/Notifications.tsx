import React, { useState, useEffect, useCallback } from 'react';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Calendar, 
  FileText, 
  AlertCircle, 
  Check,
  Trash2
} from 'lucide-react';
import { notificationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  read_at: string | null;
  action_url: string | null;
  action_text: string | null;
  notification_type: {
    name: string;
    icon: string;
    color: string;
  };
  metadata: Record<string, any> | null;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleNewNotification = useCallback((data: any) => {
    setNotifications(prev => [data, ...prev.filter(n => n.id !== data.id)]);
  }, []);

  useNotificationSocket(handleNewNotification);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      console.log('Fetching notifications for history page');
      const response = await notificationsAPI.getAllNotifications(true);
      console.log('Notifications history response:', response);
      setNotifications(response.results || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await notificationsAPI.markAsRead(notification.id.toString());
      }
      
      // Handle resource notifications specially
      if (notification.notification_type.name === 'resource_approved' || 
          notification.notification_type.name === 'resource_rejected' ||
          notification.notification_type.name === 'resource') {
        // Extract resource ID from metadata or action_url
        const resourceId = notification.metadata?.resource_id || 
                          notification.action_url?.split('/').pop();
        
        if (resourceId) {
          // Navigate to resources page with resource ID as query parameter
          navigate(`/resources?resourceId=${resourceId}`);
        } else {
          navigate('/resources');
        }
      } else if (notification.action_url) {
        navigate(notification.action_url);
      }
    } catch (error) {
      console.error('Failed to handle notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'forum_reply':
        return <MessageCircle className="h-5 w-5" />;
      case 'event':
        return <Calendar className="h-5 w-5" />;
      case 'resource':
        return <FileText className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          {notifications.some(n => !n.is_read) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No notifications to display
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${!notification.is_read ? 'bg-muted/50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div 
                    className="p-2 rounded-full mt-0.5" 
                    style={{ backgroundColor: notification.notification_type.color + '20' }}
                  >
                    {getNotificationIcon(notification.notification_type.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium">{notification.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    {notification.notification_type.name === 'resource_rejected' && (
                      <p className="text-sm font-medium mt-1 text-amber-600">
                        {notification.message.includes('Reason:') ? 
                          notification.message.substring(notification.message.indexOf('Reason:')) : 
                          ''}
                      </p>
                    )}
                    {notification.notification_type.name === 'resource_rejected' && notification.metadata?.reason && (
                      <p className="text-sm font-medium mt-1 text-amber-600">
                        Reason: {notification.metadata.reason}
                      </p>
                    )}
                    {notification.action_text && (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification);
                        }}
                      >
                        {notification.action_text}
                      </Button>
                    )}
                    {notification.read_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Read at: {new Date(notification.read_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;