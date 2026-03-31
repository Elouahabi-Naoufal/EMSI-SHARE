import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { gradebookAPI, roomsAPI } from '@/services/api';
import { Plus, Trash2 } from 'lucide-react';
import { isPrivileged } from '@/types/user';

const Gradebook: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [summary, setSummary] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addGradeOpen, setAddGradeOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({ student: '', title: '', score: '', max_score: '100', category: '', notes: '' });
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const isStaff = isPrivileged(user?.role);

  useEffect(() => { roomsAPI.getRooms().then(setRooms).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    setLoading(true);
    Promise.all([
      gradebookAPI.getSummary(selectedRoom),
      gradebookAPI.getCategories(selectedRoom),
      gradebookAPI.getGrades({ room: selectedRoom }),
    ]).then(([s, c, g]) => {
      setSummary(Array.isArray(s) ? s : []);
      setCategories(Array.isArray(c) ? c : c?.results || []);
      setGrades(Array.isArray(g) ? g : g?.results || []);
    }).catch(() => toast.error('Failed to load gradebook'))
      .finally(() => setLoading(false));
  }, [selectedRoom]);

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await gradebookAPI.createGrade({ ...gradeForm, room: selectedRoom, score: parseFloat(gradeForm.score), max_score: parseFloat(gradeForm.max_score), category: gradeForm.category || null });
      toast.success('Grade added');
      setAddGradeOpen(false);
      const [s, g] = await Promise.all([gradebookAPI.getSummary(selectedRoom), gradebookAPI.getGrades({ room: selectedRoom })]);
      setSummary(Array.isArray(s) ? s : []);
      setGrades(Array.isArray(g) ? g : g?.results || []);
    } catch { toast.error('Failed to add grade'); }
  };

  const handleDelete = async (id: string) => {
    await gradebookAPI.deleteGrade(id);
    setGrades(prev => prev.filter(g => g.id !== id));
    const s = await gradebookAPI.getSummary(selectedRoom);
    setSummary(Array.isArray(s) ? s : []);
  };

  const myGrades = user?.role === 'student' ? grades.filter(g => String(g.student) === String(user?.id)) : grades;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gradebook</h1>
            <p className="text-muted-foreground">Track grades per room and student.</p>
          </div>
          {isStaff && selectedRoom && (
            <Dialog open={addGradeOpen} onOpenChange={setAddGradeOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Grade</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Grade Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleAddGrade} className="space-y-4">
                  <div><Label>Student ID</Label><Input value={gradeForm.student} onChange={e => setGradeForm(p => ({ ...p, student: e.target.value }))} placeholder="Student user ID" required /></div>
                  <div><Label>Title</Label><Input value={gradeForm.title} onChange={e => setGradeForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Quiz 1" required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Score</Label><Input type="number" value={gradeForm.score} onChange={e => setGradeForm(p => ({ ...p, score: e.target.value }))} required /></div>
                    <div><Label>Max Score</Label><Input type="number" value={gradeForm.max_score} onChange={e => setGradeForm(p => ({ ...p, max_score: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={gradeForm.category} onValueChange={v => setGradeForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Notes</Label><Input value={gradeForm.notes} onChange={e => setGradeForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  <Button type="submit" className="w-full">Add Grade</Button>
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

        {loading ? <p className="text-muted-foreground">Loading...</p> : selectedRoom && (
          <div className="space-y-6">
            {isStaff && summary.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Class Overview</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Entries</TableHead><TableHead>Average</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {summary.map((s: any) => (
                        <TableRow key={s.student_id}>
                          <TableCell>{s.student_name}</TableCell>
                          <TableCell>{s.entries.length}</TableCell>
                          <TableCell><span className={`font-bold ${s.average >= 60 ? 'text-green-600' : 'text-red-600'}`}>{s.average}%</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>{user?.role === 'student' ? 'My Grades' : 'All Grade Entries'}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isStaff && <TableHead>Student</TableHead>}
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>%</TableHead>
                      {isStaff && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myGrades.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No grades yet.</TableCell></TableRow>
                    ) : myGrades.map((g: any) => (
                      <TableRow key={g.id}>
                        {isStaff && <TableCell>{g.student_name}</TableCell>}
                        <TableCell>{g.title}</TableCell>
                        <TableCell>{g.category_name || '—'}</TableCell>
                        <TableCell>{g.score}/{g.max_score}</TableCell>
                        <TableCell><span className={g.percentage >= 60 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{g.percentage}%</span></TableCell>
                        {isStaff && <TableCell><Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Gradebook;
