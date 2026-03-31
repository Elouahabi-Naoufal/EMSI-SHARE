import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { timetableAPI, roomsAPI } from '@/services/api';
import { Plus, Trash2 } from 'lucide-react';
import { isPrivileged } from '@/types/user';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const Timetable: React.FC = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ room: '', day_of_week: '0', start_time: '08:00', end_time: '09:00', location: '', color: '#3B82F6', recurrence: 'weekly' });
  const isStaff = isPrivileged(user?.role);

  useEffect(() => {
    roomsAPI.getRooms().then(setRooms).catch(() => {});
    loadSlots();
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const d = await timetableAPI.getSlots();
      setSlots(Array.isArray(d) ? d : d?.results || []);
    } catch { toast.error('Failed to load timetable'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await timetableAPI.createSlot({ ...form, day_of_week: parseInt(form.day_of_week) });
      toast.success('Slot added');
      setCreateOpen(false);
      loadSlots();
    } catch { toast.error('Failed to add slot'); }
  };

  const handleDelete = async (id: string) => {
    await timetableAPI.deleteSlot(id);
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const slotsByDay = DAYS.map((day, i) => ({ day, slots: slots.filter(s => s.day_of_week === i) }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timetable</h1>
            <p className="text-muted-foreground">Weekly class schedule.</p>
          </div>
          {isStaff && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Slot</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Timetable Slot</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label>Room</Label>
                    <Select value={form.room} onValueChange={v => setForm(p => ({ ...p, room: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Day</Label>
                    <Select value={form.day_of_week} onValueChange={v => setForm(p => ({ ...p, day_of_week: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
                    <div><Label>End</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
                  </div>
                  <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Room 204" /></div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-1">
                      {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                          className={`w-7 h-7 rounded-full border-2 ${form.color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Add Slot</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {slotsByDay.map(({ day, slots: daySlots }) => (
              <div key={day} className="space-y-2">
                <h3 className="font-semibold text-sm text-center border-b pb-1">{day}</h3>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">—</p>
                ) : daySlots.map((s: any) => (
                  <div key={s.id} className="rounded-lg p-2 text-white text-xs relative group" style={{ backgroundColor: s.color }}>
                    <p className="font-semibold truncate">{s.room_name}</p>
                    <p>{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
                    {s.location && <p className="opacity-80 truncate">{s.location}</p>}
                    {isStaff && (
                      <button onClick={() => handleDelete(s.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Timetable;
