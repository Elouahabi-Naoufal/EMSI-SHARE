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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { certificatesAPI, roomsAPI } from '@/services/api';
import { Award, Plus, Trash2 } from 'lucide-react';
import { isPrivileged } from '@/types/user';

const BADGE_ICONS: Record<string, string> = {
  award: '🏆', star: '⭐', fire: '🔥', book: '📚', check: '✅', brain: '🧠',
};

const Certificates: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [certForm, setCertForm] = useState({ student: '', room: '', notes: '' });
  const isStaff = isPrivileged(user?.role);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      certificatesAPI.getCertificates(),
      certificatesAPI.getBadges(),
      certificatesAPI.getUserBadges(user?.role === 'student' ? user.id : undefined),
      roomsAPI.getRooms(),
    ]).then(([c, b, ub, r]) => {
      setCertificates(Array.isArray(c) ? c : c?.results || []);
      setBadges(Array.isArray(b) ? b : b?.results || []);
      setUserBadges(Array.isArray(ub) ? ub : ub?.results || []);
      setRooms(Array.isArray(r) ? r : []);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await certificatesAPI.issueCertificate(certForm);
      toast.success('Certificate issued');
      setCertOpen(false);
      const c = await certificatesAPI.getCertificates();
      setCertificates(Array.isArray(c) ? c : c?.results || []);
    } catch { toast.error('Failed to issue certificate'); }
  };

  const handleDeleteCert = async (id: string) => {
    await certificatesAPI.deleteCertificate(id);
    setCertificates(prev => prev.filter(c => c.id !== id));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Certificates & Badges</h1>
            <p className="text-muted-foreground">Achievements and course completions.</p>
          </div>
          {isStaff && (
            <Dialog open={certOpen} onOpenChange={setCertOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Issue Certificate</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
                <form onSubmit={handleIssueCert} className="space-y-4">
                  <div><Label>Student ID</Label><Input value={certForm.student} onChange={e => setCertForm(p => ({ ...p, student: e.target.value }))} placeholder="Student user ID" required /></div>
                  <div>
                    <Label>Room / Course</Label>
                    <Select value={certForm.room} onValueChange={v => setCertForm(p => ({ ...p, room: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Notes (optional)</Label><Textarea value={certForm.notes} onChange={e => setCertForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  <Button type="submit" className="w-full">Issue</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs defaultValue="certificates">
          <TabsList>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="certificates" className="mt-4">
            {loading ? <p className="text-muted-foreground">Loading...</p> :
              certificates.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No certificates yet.</CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {certificates.map((c: any) => (
                    <Card key={c.id} className="border-yellow-200 dark:border-yellow-800">
                      <CardContent className="flex items-start justify-between pt-6">
                        <div className="flex gap-3">
                          <div className="text-4xl">🎓</div>
                          <div>
                            <p className="font-semibold">{c.student_name}</p>
                            <p className="text-sm text-muted-foreground">{c.room_name}</p>
                            <p className="text-xs text-muted-foreground">Issued by {c.issued_by_name} · {new Date(c.issued_at).toLocaleDateString()}</p>
                            {c.notes && <p className="text-xs mt-1 italic">{c.notes}</p>}
                          </div>
                        </div>
                        {isStaff && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCert(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            }
          </TabsContent>

          <TabsContent value="badges" className="mt-4">
            <div className="space-y-6">
              {userBadges.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Earned Badges</h3>
                  <div className="flex flex-wrap gap-3">
                    {userBadges.map((ub: any) => (
                      <div key={ub.id} className="flex flex-col items-center gap-1 p-3 border rounded-lg w-24 text-center">
                        <span className="text-3xl">{BADGE_ICONS[ub.badge.icon] || '🏅'}</span>
                        <p className="text-xs font-medium">{ub.badge.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(ub.earned_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-3">All Badges</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {badges.map((b: any) => {
                    const earned = userBadges.some(ub => ub.badge.id === b.id);
                    return (
                      <Card key={b.id} className={earned ? 'border-yellow-400' : 'opacity-60'}>
                        <CardContent className="flex items-center gap-3 pt-4">
                          <span className="text-3xl">{BADGE_ICONS[b.icon] || '🏅'}</span>
                          <div>
                            <p className="font-medium text-sm">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.description}</p>
                            {earned && <span className="text-xs text-yellow-600 font-medium">Earned</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Certificates;
