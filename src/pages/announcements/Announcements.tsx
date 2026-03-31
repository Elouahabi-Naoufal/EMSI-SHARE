import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { announcementsAPI, roomsAPI } from '@/services/api';
import { Plus, Pin, Trash2 } from 'lucide-react';
import { isPrivileged } from '@/types/user';

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_type: 'all', target_room: '', target_role: '', is_pinned: false, expires_at: '' });
  const isStaff = isPrivileged(user?.role);

  useEffect(() => {
    roomsAPI.getRooms().then(setRooms).catch(() => {});
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const d = await announcementsAPI.getAnnouncements();
      setAnnouncements(Array.isArray(d) ? d : d?.results || []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await announcementsAPI.createAnnouncement({
        ...form,
        target_room: form.target_type === 'room' ? form.target_room : null,
        target_role: form.target_type === 'role' ? form.target_role : null,
        expires_at: form.expires_at || null,
      });
      toast.success('Announcement posted');
      setCreateOpen(false);
      setForm({ title: '', content: '', target_type: 'all', target_room: '', target_role: '', is_pinned: false, expires_at: '' });
      load();
    } catch { toast.error('Failed to post announcement'); }
  };

  const handleDelete = async (id: string) => {
    await announcementsAPI.deleteAnnouncement(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground">Platform-wide and room-specific announcements.</p>
          </div>
          {isStaff && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Announcement</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Post Announcement</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
                  <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} required /></div>
                  <div>
                    <Label>Target</Label>
                    <Select value={form.target_type} onValueChange={v => setForm(p => ({ ...p, target_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="room">Specific Room</SelectItem>
                        <SelectItem value="role">Specific Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.target_type === 'room' && (
                    <Select value={form.target_room} onValueChange={v => setForm(p => ({ ...p, target_room: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {form.target_type === 'role' && (
                    <Select value={form.target_role} onValueChange={v => setForm(p => ({ ...p, target_role: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {['student', 'teacher', 'librarian', 'counselor', 'coordinator', 'staff'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <div><Label>Expires At (optional)</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} /></div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_pinned} onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))} />
                    <Label>Pin this announcement</Label>
                  </div>
                  <Button type="submit" className="w-full">Post</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> :
          announcements.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No announcements.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((a: any) => (
                <Card key={a.id} className={a.is_pinned ? 'border-primary' : ''}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-2">
                      {a.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">{a.target_type === 'all' ? 'Everyone' : a.target_type === 'room' ? 'Room' : a.target_role}</Badge>
                    </div>
                    {isStaff && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">By {a.created_by_name} · {new Date(a.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </div>
    </MainLayout>
  );
};

export default Announcements;
