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
import { toast } from 'sonner';
import { assignmentsAPI, roomsAPI } from '@/services/api';
import { Plus, Upload, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { isPrivileged } from '@/types/user';

const statusColor: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  late: 'bg-yellow-100 text-yellow-800',
  graded: 'bg-green-100 text-green-800',
  missing: 'bg-red-100 text-red-800',
  returned: 'bg-purple-100 text-purple-800',
};

const Assignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState<string | null>(null);
  const [gradeOpen, setGradeOpen] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', max_score: '100', submission_type: 'any', allow_late: true });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const isStaff = isPrivileged(user?.role);

  useEffect(() => {
    roomsAPI.getRooms().then(setRooms).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRoom) { setAssignments([]); return; }
    setLoading(true);
    assignmentsAPI.getAssignments({ room: selectedRoom })
      .then(d => setAssignments(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, [selectedRoom]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('room', selectedRoom);
    if (attachmentFile) fd.append('attachment', attachmentFile);
    try {
      await assignmentsAPI.createAssignment(fd);
      toast.success('Assignment created');
      setCreateOpen(false);
      setForm({ title: '', description: '', deadline: '', max_score: '100', submission_type: 'any', allow_late: true });
      const d = await assignmentsAPI.getAssignments({ room: selectedRoom });
      setAssignments(Array.isArray(d) ? d : d?.results || []);
    } catch { toast.error('Failed to create assignment'); }
  };

  const handleSubmit = async (assignmentId: string) => {
    const fd = new FormData();
    fd.append('assignment', assignmentId);
    if (submitFile) fd.append('file', submitFile);
    if (submitText) fd.append('text_answer', submitText);
    try {
      await assignmentsAPI.submitAssignment(fd);
      toast.success('Submitted successfully');
      setSubmitOpen(null);
      const d = await assignmentsAPI.getAssignments({ room: selectedRoom });
      setAssignments(Array.isArray(d) ? d : d?.results || []);
    } catch { toast.error('Submission failed'); }
  };

  const handleGrade = async () => {
    if (!gradeOpen) return;
    try {
      await assignmentsAPI.gradeSubmission(gradeOpen.id, parseFloat(gradeScore), gradeFeedback);
      toast.success('Graded');
      setGradeOpen(null);
      const subs = await assignmentsAPI.getSubmissions(gradeOpen.assignment);
      setSubmissions(subs);
    } catch { toast.error('Grading failed'); }
  };

  const loadSubmissions = async (assignmentId: string) => {
    const subs = await assignmentsAPI.getSubmissions(assignmentId);
    setSubmissions(Array.isArray(subs) ? subs : []);
  };

  const deadlinePassed = (deadline: string) => new Date(deadline) < new Date();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
            <p className="text-muted-foreground">Manage and submit assignments per room.</p>
          </div>
          {isStaff && selectedRoom && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Assignment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                  <div><Label>Deadline</Label><Input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Max Score</Label><Input type="number" value={form.max_score} onChange={e => setForm(p => ({ ...p, max_score: e.target.value }))} /></div>
                    <div>
                      <Label>Submission Type</Label>
                      <Select value={form.submission_type} onValueChange={v => setForm(p => ({ ...p, submission_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Attachment (optional)</Label><Input type="file" onChange={e => setAttachmentFile(e.target.files?.[0] || null)} /></div>
                  <Button type="submit" className="w-full">Create</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="w-64">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger><SelectValue placeholder="Select a room" /></SelectTrigger>
            <SelectContent>
              {rooms.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : assignments.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No assignments yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((a: any) => (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                    <CardDescription>{a.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(a.deadline).toLocaleString()}
                    {deadlinePassed(a.deadline) && <Badge variant="destructive">Closed</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm">
                    <span>Max: <strong>{a.max_score}</strong></span>
                    <span>Submissions: <strong>{a.submission_count}</strong></span>
                    {a.my_submission && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[a.my_submission.status]}`}>
                        {a.my_submission.status} {a.my_submission.score != null && `— ${a.my_submission.score}/${a.max_score}`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {a.attachment_name && (
                      <Button variant="outline" size="sm" onClick={async () => {
                        const token = document.cookie.split('; ').find(r => r.startsWith('emsi_access='))?.split('=')[1];
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/assignments/${a.id}/attachment/`, { headers: { Authorization: `Bearer ${token}` } });
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a'); link.href = url; link.download = a.attachment_name; link.click();
                      }}>
                        <Download className="h-4 w-4 mr-1" />Brief
                      </Button>
                    )}
                    {user?.role === 'student' && !a.my_submission && !deadlinePassed(a.deadline) && (
                      <Dialog open={submitOpen === a.id} onOpenChange={o => setSubmitOpen(o ? a.id : null)}>
                        <DialogTrigger asChild><Button size="sm"><Upload className="h-4 w-4 mr-1" />Submit</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Submit — {a.title}</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            {(a.submission_type === 'file' || a.submission_type === 'any') && (
                              <div><Label>File</Label><Input type="file" onChange={e => setSubmitFile(e.target.files?.[0] || null)} /></div>
                            )}
                            {(a.submission_type === 'text' || a.submission_type === 'any') && (
                              <div><Label>Text Answer</Label><Textarea value={submitText} onChange={e => setSubmitText(e.target.value)} rows={5} /></div>
                            )}
                            <Button className="w-full" onClick={() => handleSubmit(a.id)}>Submit</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {isStaff && (
                      <Dialog onOpenChange={async o => { if (o) await loadSubmissions(a.id); }}>
                        <DialogTrigger asChild><Button variant="outline" size="sm">View Submissions</Button></DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader><DialogTitle>Submissions — {a.title}</DialogTitle></DialogHeader>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {submissions.length === 0 ? <p className="text-muted-foreground text-sm">No submissions yet.</p> : submissions.map((s: any) => (
                              <div key={s.id} className="flex items-center justify-between border rounded p-3">
                                <div>
                                  <p className="font-medium text-sm">{s.student_name}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor[s.status]}`}>{s.status}</span>
                                  {s.score != null && <span className="ml-2 text-xs font-medium">{s.score}/{a.max_score}</span>}
                                </div>
                                <div className="flex gap-2">
                                  {s.file_name && (
                                    <Button variant="outline" size="sm" onClick={async () => {
                                      const blob = await assignmentsAPI.downloadSubmission(s.id);
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a'); link.href = url; link.download = s.file_name; link.click();
                                    }}><Download className="h-3 w-3" /></Button>
                                  )}
                                  <Dialog open={gradeOpen?.id === s.id} onOpenChange={o => { if (o) { setGradeOpen({ ...s, assignment: a.id }); setGradeScore(s.score ?? ''); setGradeFeedback(s.feedback ?? ''); } else setGradeOpen(null); }}>
                                    <DialogTrigger asChild><Button size="sm"><CheckCircle className="h-3 w-3 mr-1" />Grade</Button></DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
                                      <div className="space-y-4">
                                        <div><Label>Score (max {a.max_score})</Label><Input type="number" value={gradeScore} onChange={e => setGradeScore(e.target.value)} /></div>
                                        <div><Label>Feedback</Label><Textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={4} /></div>
                                        <Button className="w-full" onClick={handleGrade}>Save Grade</Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Assignments;
