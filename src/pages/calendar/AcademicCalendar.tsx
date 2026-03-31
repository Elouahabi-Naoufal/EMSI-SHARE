import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { calendarAPI } from '@/services/api';
import { Plus, Trash2 } from 'lucide-react';

const ENTRY_TYPES = [
  { value: 'semester_start', label: 'Semester Start', color: '#10B981' },
  { value: 'semester_end', label: 'Semester End', color: '#EF4444' },
  { value: 'exam_period', label: 'Exam Period', color: '#F59E0B' },
  { value: 'holiday', label: 'Holiday', color: '#6366F1' },
  { value: 'registration', label: 'Registration Deadline', color: '#3B82F6' },
  { value: 'break', label: 'Break', color: '#8B5CF6' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const AcademicCalendar: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', entry_type: 'other', start_date: '', end_date: '' });
  const isAdmin = user?.role === 'admin' || user?.role === 'administration';

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const d = await calendarAPI.getEntries();
      setEntries(Array.isArray(d) ? d : d?.results || []);
    } catch { toast.error('Failed to load calendar'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await calendarAPI.createEntry(form);
      toast.success('Entry added');
      setCreateOpen(false);
      setForm({ title: '', description: '', entry_type: 'other', start_date: '', end_date: '' });
      load();
    } catch { toast.error('Failed to add entry'); }
  };

  const handleDelete = async (id: string) => {
    await calendarAPI.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const grouped = ENTRY_TYPES.map(t => ({ ...t, entries: entries.filter(e => e.entry_type === t.value) })).filter(t => t.entries.length > 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Academic Calendar</h1>
            <p className="text-muted-foreground">Institution-wide important dates.</p>
          </div>
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Entry</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Calendar Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.entry_type} onValueChange={v => setForm(p => ({ ...p, entry_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required /></div>
                    <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required /></div>
                  </div>
                  <Button type="submit" className="w-full">Add</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> :
          entries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No calendar entries yet.</CardContent></Card>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ label, color, entries: typeEntries }) => (
                <div key={label}>
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                    {label}
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {typeEntries.map((e: any) => (
                      <Card key={e.id} style={{ borderLeftColor: e.color, borderLeftWidth: 4 }}>
                        <CardContent className="flex items-start justify-between py-4">
                          <div>
                            <p className="font-medium">{e.title}</p>
                            <p className="text-sm text-muted-foreground">{e.start_date} → {e.end_date}</p>
                            {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                          </div>
                          {isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </MainLayout>
  );
};

export default AcademicCalendar;
