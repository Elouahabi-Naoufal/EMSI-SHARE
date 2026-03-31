import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { attendanceAPI, roomsAPI } from '@/services/api';
import { Plus, Users } from 'lucide-react';
import { isPrivileged } from '@/types/user';

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  excused: 'bg-blue-100 text-blue-800',
};

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Class Session');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [markOpen, setMarkOpen] = useState<any | null>(null);
  const [markRecords, setMarkRecords] = useState<any[]>([]);
  const isStaff = isPrivileged(user?.role);

  useEffect(() => { roomsAPI.getRooms().then(setRooms).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    setLoading(true);
    Promise.all([
      attendanceAPI.getSessions(selectedRoom),
      user?.role === 'student' ? attendanceAPI.getStudentSummary(selectedRoom) : Promise.resolve(null),
    ]).then(([s, sum]) => {
      setSessions(Array.isArray(s) ? s : s?.results || []);
      if (sum) setSummary(sum);
    }).catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, [selectedRoom]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await attendanceAPI.createSession({ room: selectedRoom, title: sessionTitle, date: sessionDate });
      toast.success('Session created');
      setCreateOpen(false);
      const s = await attendanceAPI.getSessions(selectedRoom);
      setSessions(Array.isArray(s) ? s : s?.results || []);
    } catch { toast.error('Failed to create session'); }
  };

  const openMarkDialog = (session: any) => {
    const records = (session.records || []).length > 0
      ? session.records
      : (session.room_students || []).map((s: any) => ({ student_id: s.id, student_name: `${s.first_name} ${s.last_name}`, status: 'present', note: '' }));
    setMarkRecords(records.map((r: any) => ({ student_id: r.student || r.student_id, student_name: r.student_name || '', status: r.status || 'present', note: r.note || '' })));
    setMarkOpen(session);
  };

  const handleMark = async () => {
    try {
      await attendanceAPI.markAttendance(markOpen.id, markRecords);
      toast.success('Attendance saved');
      setMarkOpen(null);
      const s = await attendanceAPI.getSessions(selectedRoom);
      setSessions(Array.isArray(s) ? s : s?.results || []);
    } catch { toast.error('Failed to save attendance'); }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">Track student attendance per session.</p>
          </div>
          {isStaff && selectedRoom && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Session</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Attendance Session</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div><Label>Title</Label><Input value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} /></div>
                  <div><Label>Date</Label><Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Create</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="w-64">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
            <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {user?.role === 'student' && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['Total Sessions', summary.total], ['Present', summary.present], ['Absent', summary.absent], ['Rate', `${summary.rate}%`]].map(([label, val]) => (
              <Card key={label as string}><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{val}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>
            ))}
          </div>
        )}

        {loading ? <p className="text-muted-foreground">Loading...</p> : sessions.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No sessions yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.date} · {s.records?.length || 0} records</p>
                  </div>
                  {isStaff && (
                    <Dialog open={markOpen?.id === s.id} onOpenChange={o => { if (o) openMarkDialog(s); else setMarkOpen(null); }}>
                      <DialogTrigger asChild><Button variant="outline" size="sm"><Users className="h-4 w-4 mr-1" />Mark</Button></DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Mark Attendance — {s.title}</DialogTitle></DialogHeader>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {markRecords.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No students found. Add students to the room first.</p>
                          ) : markRecords.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 border rounded p-2">
                              <span className="flex-1 text-sm">{r.student_name || `Student ${r.student_id}`}</span>
                              <Select value={r.status} onValueChange={v => setMarkRecords(prev => prev.map((x, j) => j === i ? { ...x, status: v } : x))}>
                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['present', 'absent', 'late', 'excused'].map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                        <Button className="w-full mt-4" onClick={handleMark}>Save Attendance</Button>
                      </DialogContent>
                    </Dialog>
                  )}
                  {user?.role === 'student' && (
                    <div className="flex gap-2">
                      {s.records?.filter((r: any) => String(r.student) === String(user?.id)).map((r: any) => (
                        <span key={r.id} className={`text-xs px-2 py-1 rounded ${statusColors[r.status]}`}>{r.status}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Attendance;
