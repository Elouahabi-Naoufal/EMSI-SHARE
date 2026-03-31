import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { resourcesAPI } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Resource {
  id: number;
  title: string;
  description: string;
  type: string;
  file_name: string;
  file_size: number;
  uploaded_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  uploaded_at: string;
  status: string;
}

const PendingResourcesPanel: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmRejectDialogOpen, setConfirmRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPendingResources();
  }, []);

  const fetchPendingResources = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/resources/?status=pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('emsi_access')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const pendingResources = data.results ? data.results.filter(r => r.status === 'pending') : [];
      
      setResources(pendingResources);
    } catch (error) {
      console.error('Failed to fetch pending resources:', error);
      toast.error('Failed to load pending resources');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (resource: Resource) => {
    setProcessingId(resource.id);
    try {
      await resourcesAPI.approveResource(resource.id.toString());
      toast.success(`Resource "${resource.title}" approved successfully`);
      setResources(resources.filter(r => r.id !== resource.id));
    } catch (error) {
      console.error('Failed to approve resource:', error);
      toast.error('Failed to approve resource');
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirmRejectDialog = () => {
    if (!selectedResource || !rejectionReason.trim()) return;
    setConfirmRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedResource || !rejectionReason.trim()) return;
    
    setProcessingId(selectedResource.id);
    try {
      await resourcesAPI.rejectResource(selectedResource.id.toString(), rejectionReason);
      toast.success(`Resource "${selectedResource.title}" rejected`);
      setResources(resources.filter(r => r.id !== selectedResource.id));
      setRejectDialogOpen(false);
      setConfirmRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedResource(null);
    } catch (error) {
      console.error('Failed to reject resource:', error);
      toast.error('Failed to reject resource');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setRejectDialogOpen(true);
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <Badge variant="outline">PDF</Badge>;
      case 'video':
        return <Badge variant="outline">Video</Badge>;
      case 'image':
        return <Badge variant="outline">Image</Badge>;
      case 'document':
        return <Badge variant="outline">Document</Badge>;
      case 'code':
        return <Badge variant="outline">Code</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pending Resources</h2>
        <Button variant="outline" onClick={fetchPendingResources}>Refresh</Button>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No pending resources to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(resource => (
            <Card key={resource.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate">{resource.title}</CardTitle>
                  {getFileTypeIcon(resource.type)}
                </div>
                <CardDescription>
                  Uploaded by {resource.uploaded_by.first_name || resource.uploaded_by.username} on {format(new Date(resource.uploaded_at), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {resource.description || 'No description provided'}
                </p>
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 mr-2 text-primary" />
                  <span className="truncate">{resource.file_name}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openRejectDialog(resource)}
                  disabled={processingId === resource.id}
                >
                  {processingId === resource.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />
                  )}
                  Reject
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleApprove(resource)}
                  disabled={processingId === resource.id}
                >
                  {processingId === resource.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection reason input dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Resource</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this resource. This will be sent to the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={openConfirmRejectDialog}
              disabled={!rejectionReason.trim() || processingId !== null}
            >
              {processingId !== null && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmRejectDialogOpen} onOpenChange={setConfirmRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Rejection
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedResource && (
                <div className="space-y-4">
                  <p>Are you sure you want to reject the resource <span className="font-medium">"{selectedResource.title}"</span>?</p>
                  <div className="bg-muted p-3 rounded-md border">
                    <p className="font-medium mb-1">Rejection reason:</p>
                    <p className="text-sm whitespace-pre-wrap">{rejectionReason}</p>
                  </div>
                  <p>This action cannot be undone and the student will be notified.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmRejectDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processingId !== null}
            >
              {processingId !== null && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingResourcesPanel;