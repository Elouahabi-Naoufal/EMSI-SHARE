import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as resourcesAPI from '@/services/api';

interface ResourceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResourceUploaded?: () => void;
  onSuccess?: (data: { title: string; description: string; type: string }) => void;
  roomId?: string;
}

const ResourceUploadDialog: React.FC<ResourceUploadDialogProps> = ({
  open,
  onOpenChange,
  onResourceUploaded,
  onSuccess,
  roomId,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editorMode, setEditorMode] = useState<'markdown' | 'code' | 'plain'>('plain');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  
  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = () => setShowCategoryDropdown(false);
    document.addEventListener('click', handleClickOutside);
    
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await resourcesAPI.resourcesAPI.getCategories();
        setCategories(response.results);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    
    fetchCategories();
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  
  const handleCategorySelect = (id: string, name: string) => {
    setSelectedCategory(id);
    setCategorySearch(name);
    setShowCategoryDropdown(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Set editor mode based on file extension for code files
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.match(/\.(js|ts|py|java|c|cpp|html|css|json)$/)) {
        setEditorMode('code');
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !file) {
      toast.error('Please provide a title and file');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // For files larger than 10MB, use chunked upload
      if (file.size > 10 * 1024 * 1024) {
        await handleChunkedUpload();
      } else {
        // Use regular upload for smaller files
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('file_data', file);
        
        if (selectedCategory) {
          formData.append('category', selectedCategory);
        }
        
        if (roomId) {
          formData.append('room', roomId);
        }

        const uploadedResource = await resourcesAPI.resourcesAPI.uploadResource(formData); // Capture the response
      }
      
      toast.success('Resource uploaded successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      setCategorySearch('');
      setFile(null);
      setUploadProgress(0);
      
      // Close dialog
      onOpenChange(false);
      
      // Trigger success callback
      if (onResourceUploaded) {
        onResourceUploaded();
      }
      
      // Also trigger the other success callback if it exists
      if (onSuccess) {
        onSuccess({ title, description, type: 'auto' });
      }
    } catch (error) {
      console.error('Failed to upload resource:', error);
      toast.error('Failed to upload resource');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleChunkedUpload = async () => {
    if (!file) return;
    
    try {
      // For large files, use regular upload instead of chunked upload
      // since the backend endpoint for chunked uploads is not available
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('file_data', file);
      
      // Always set status to approved for all users
      formData.append('status', 'approved');
      console.log('Setting resource status to approved');
      
      // Store user role in localStorage for reference
      if (user?.role) {
        localStorage.setItem('user_role', user.role);
      }
      
      // Add user ID to ensure proper ownership
      if (user?.id) {
        formData.append('uploaded_by', user.id.toString());
        console.log('Setting uploaded_by to user ID:', user.id);
      }
      
      if (selectedCategory) {
        formData.append('category', selectedCategory);
      }
      
      if (roomId) {
        formData.append('room', roomId);
      }

      // Show progress simulation for better UX
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          if (progress >= 95) {
            clearInterval(interval);
          } else {
            setUploadProgress(progress);
          }
        }, 500);
        
        return () => clearInterval(interval);
      };
      
      const cleanup = simulateProgress();
      
      // Get token from cookies instead of localStorage
      const getCookie = (name: string) => {
        return document.cookie.split('; ').reduce((r, v) => {
          const parts = v.split('=');
          return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
      };
      
      // Make the upload request with token refresh capability
      const makeUploadRequest = async (retryOnUnauthorized = true) => {
        // Get token from cookie (primary) or localStorage (fallback)
        let token = getCookie('emsi_access') || localStorage.getItem('emsi_access');
        
        if (!token) {
          console.error('No access token found in cookies or localStorage');
          throw new Error('Authentication token not found. Please log in again.');
        }
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/resources/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
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
            
            // Retry the request with the new token
            console.log('Token refreshed, retrying upload...');
            return makeUploadRequest(false); // Don't retry again to avoid infinite loop
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Authentication failed. Please log in again.');
          }
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload error response:', errorText);
          throw new Error('Upload failed: ' + (errorText || response.statusText));
        }
        
        return await response.json();
      };
      
      // Execute the upload
      const result = await makeUploadRequest();
      setUploadProgress(100);
      cleanup();
      return result;
    } catch (error) {
      console.error('Chunked upload failed:', error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Resource title" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Describe this resource" 
              rows={3} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="relative">
              <Input 
                id="category" 
                value={categorySearch} 
                onChange={(e) => setCategorySearch(e.target.value)} 
                placeholder="Search for a category" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryDropdown(true);
                }}
              />
              
              {showCategoryDropdown && filteredCategories.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCategories.map((category) => (
                    <div 
                      key={category.id} 
                      className="px-4 py-2 hover:bg-muted cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(category.id.toString(), category.name);
                      }}
                    >
                      {category.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Input 
                id="file" 
                type="file" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <Label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </span>
                {file && (
                  <span className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </Label>
            </div>
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Uploading...</span>
                <span className="text-sm">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUploading || !file || !title}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Resource'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResourceUploadDialog;