import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { roomsAPI } from '@/services/api';
import { Search, Users, BookOpen, Lock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const getToken = () => document.cookie.split('; ').reduce((r, v) => {
  const [k, val] = v.split('='); return k === 'emsi_access' ? decodeURIComponent(val) : r;
}, '');

const CourseCatalog: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_BASE}/rooms/catalog/${q}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : data?.results || []);
    } catch { toast.error('Failed to load catalog'); }
    finally { setLoading(false); }
  };

  const handleEnroll = async (roomId: string) => {
    setEnrolling(roomId);
    try {
      const res = await fetch(`${API_BASE}/rooms/join/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || data.message || 'Enrollment failed'); return; }
      toast.success(data.message);
      load();
    } catch { toast.error('Enrollment failed'); }
    finally { setEnrolling(null); }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
          <p className="text-muted-foreground">Browse and enroll in available courses.</p>
        </div>

        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> :
          rooms.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No courses available.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room: any) => (
                <Card key={room.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{room.name}</CardTitle>
                        <CardDescription>{room.subject}</CardDescription>
                      </div>
                      {room.is_private && <Lock className="h-4 w-4 text-muted-foreground mt-1" />}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-3">
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{room.participants_count}</span>
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{room.resources_count}</span>
                      </div>
                      {room.is_private && (
                        <Badge variant="outline" className="text-xs">Approval Required</Badge>
                      )}
                    </div>
                    {user?.role === 'student' && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleEnroll(room.id)}
                        disabled={enrolling === room.id}
                      >
                        {enrolling === room.id ? 'Enrolling...' : room.is_private ? 'Request Enrollment' : 'Enroll'}
                      </Button>
                    )}
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

export default CourseCatalog;
