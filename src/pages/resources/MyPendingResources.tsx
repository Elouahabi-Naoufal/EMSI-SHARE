import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Code, Video, Image as ImageIcon, FileArchive, File, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ResourceDetailDialog from '@/components/resources/ResourceDetailDialog';
import { toast } from 'sonner';

interface Resource {
  id: number;  // Changed from string to number to match API response
  title: string;
  description: string;
  type: string;
  file_name: string;
  file_size: number;
  status: string;
  uploaded_at: string;
  uploaded_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  category_name: string | null;
  rejection_reason?: string;
}

const MyPendingResources: React.FC = () => {
  // Force a re-render to ensure fresh data
  const [refreshKey, setRefreshKey] = useState(0);
  
  // This is a page for pending resources, so we'll override the display
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchPendingResources();
  }, [refreshKey]);

  const fetchPendingResources = async () => {
    setLoading(true);
    try {
      // Get token from cookies or localStorage
      const getCookie = (name: string) => {
        return document.cookie.split('; ').reduce((r, v) => {
          const parts = v.split('=');
          return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
      };
      
      // Try to get token from cookie first, then localStorage
      let token = getCookie('emsi_access') || localStorage.getItem('emsi_access');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const makeRequest = async (retryOnUnauthorized = true) => {
        // Log the token being used (first 10 chars only for security)
        console.log('Using token (first 10 chars):', token.substring(0, 10) + '...');
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/resources/?my=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // If unauthorized and we should retry
        if (response.status === 401 && retryOnUnauthorized) {
          console.log('Token expired, attempting to refresh...');
          
          try {
            // Get refresh token
            const refreshToken = getCookie('emsi_refresh') || localStorage.getItem('emsi_refresh');
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }
            
            // Try to refresh the token
            const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/token/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh: refreshToken }),
            });
            
            if (!refreshResponse.ok) {
              throw new Error('Failed to refresh token');
            }
            
            const data = await refreshResponse.json();
            
            // Save the new access token to both cookie and localStorage
            document.cookie = `emsi_access=${data.access}; path=/; max-age=${14 * 24 * 60 * 60}`;
            localStorage.setItem('emsi_access', data.access);
            
            // Update token for next request
            token = data.access;
            
            // Retry the request with the new token
            console.log('Token refreshed, retrying request...');
            return makeRequest(false); // Don't retry again to avoid infinite loop
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Authentication failed. Please log in again.');
          }
        }
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        return response.json();
      };
      
      const data = await makeRequest();
      console.log('My resources response:', data);
      
      // CRITICAL FIX: Directly use the data array without any processing
      // This ensures we display exactly what the API returns
      let processedResources = [];
      
      if (Array.isArray(data)) {
        // If data is already an array, use it directly
        processedResources = data;
        console.log('Using direct array data:', processedResources.length, 'items');
      } else if (data && data.results && Array.isArray(data.results)) {
        // If data has a results property that's an array, use that
        processedResources = data.results;
        console.log('Using data.results array:', processedResources.length, 'items');
      } else if (data) {
        // If data is an object but not in expected format, wrap it in an array
        processedResources = [data];
        console.log('Using single object as array');
      }
      
      // Log the first item to see its structure
      if (processedResources.length > 0) {
        console.log('First resource item structure:', JSON.stringify(processedResources[0]));
      }
      
      console.log('Processed resources:', processedResources);
      setResources(processedResources);
    } catch (error) {
      console.error('Failed to fetch my resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string, fileName: string) => {
    if (type.includes('pdf') || fileName.endsWith('.pdf')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (type.includes('code') || fileName.match(/\.(js|ts|py|java|html|css|php|c|cpp|h|rb|go|xml|yaml|yml)$/i)) {
      return <Code className="h-5 w-5 text-green-500" />;
    } else if (type.includes('video') || fileName.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
      return <Video className="h-5 w-5 text-red-500" />;
    } else if (type.includes('image') || fileName.match(/\.(jpe?g|png|gif|bmp|webp|svg)$/i)) {
      return <ImageIcon className="h-5 w-5 text-purple-500" />;
    } else if (type.includes('zip') || fileName.match(/\.(zip|rar|tar|gz|7z)$/i)) {
      return <FileArchive className="h-5 w-5 text-orange-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const getStatusBadge = (status: string) => {
    // For this page, always show Pending badge regardless of actual status
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
  };

  const handleResourceClick = (resource: Resource) => {
    setSelectedResource(resource);
    setIsDetailDialogOpen(true);
  };

  const handleDeleteResource = async (resourceId: number) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        // Get token from cookies or localStorage
        const token = document.cookie.split('; ')
          .find(row => row.startsWith('emsi_access='))?.split('=')[1] || 
          localStorage.getItem('emsi_access');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/resources/${resourceId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete resource: ${response.status}`);
        }
        
        // Remove the deleted resource from the state
        setResources(prev => prev.filter(resource => resource.id !== resourceId));
        toast.success('Resource deleted successfully');
      } catch (error) {
        console.error('Failed to delete resource:', error);
        toast.error('Failed to delete resource');
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Pending Resources</h1>
            <p className="text-muted-foreground">
              Track the status of resources you've submitted for approval
            </p>
          </div>
          <Button onClick={() => {
            setRefreshKey(old => old + 1);
            fetchPendingResources();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading resources...</div>
        ) : resources.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You don't have any pending resources.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(resource => (
              <Card 
                key={resource.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleResourceClick(resource)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getResourceIcon(resource.type, resource.file_name)}
                      <CardTitle className="text-base">{resource.title}</CardTitle>
                    </div>
                    {getStatusBadge(resource.status)}
                  </div>
                  <CardDescription className="flex justify-between">
                    <span>{resource.type.toUpperCase()}</span>
                    <span>{formatFileSize(resource.file_size)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{resource.description}</p>
                  )}
                  
                  {resource.category_name && (
                    <p className="text-xs text-muted-foreground mb-2">Category: {resource.category_name}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(resource.uploaded_at), { addSuffix: true })}
                  </p>
                  
                  {resource.status === 'rejected' && resource.rejection_reason && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs font-medium text-red-800">Rejection reason:</p>
                      <p className="text-xs text-red-700">{resource.rejection_reason}</p>
                    </div>
                  )}
                  
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-3" 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click event
                      handleDeleteResource(resource.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ResourceDetailDialog
        resource={selectedResource}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onDelete={(resourceId) => handleDeleteResource(parseInt(resourceId))}
      />
    </MainLayout>
  );
};

export default MyPendingResources;