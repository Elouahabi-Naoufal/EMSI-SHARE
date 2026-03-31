import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { messagingAPI, authAPI } from '@/services/api';
import { Plus, Send, Inbox, Mail, Paperclip } from 'lucide-react';

const Messaging: React.FC = () => {
  const { user } = useAuth();
  const [box, setBox] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [thread, setThread] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ recipient: '', subject: '', body: '' });
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    authAPI.getAllUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    messagingAPI.getMessages(box)
      .then(d => setMessages(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, [box]);

  const openMessage = async (msg: any) => {
    setSelected(msg);
    if (!msg.is_read && msg.recipient === user?.id) {
      await messagingAPI.markRead(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    const t = await messagingAPI.getThread(msg.id);
    setThread(Array.isArray(t) ? t : []);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('recipient', form.recipient);
    fd.append('subject', form.subject);
    fd.append('body', form.body);
    if (attachFile) fd.append('attachment', attachFile);
    try {
      await messagingAPI.sendMessage(fd);
      toast.success('Message sent');
      setComposeOpen(false);
      setForm({ recipient: '', subject: '', body: '' });
      setAttachFile(null);
      if (box === 'sent') {
        const d = await messagingAPI.getMessages('sent');
        setMessages(Array.isArray(d) ? d : d?.results || []);
      }
    } catch { toast.error('Failed to send message'); }
  };

  const handleReply = async () => {
    if (!selected || !replyBody.trim()) return;
    const fd = new FormData();
    fd.append('recipient', String(selected.sender));
    fd.append('body', replyBody);
    fd.append('parent', String(selected.id));
    try {
      await messagingAPI.sendMessage(fd);
      toast.success('Reply sent');
      setReplyBody('');
      const t = await messagingAPI.getThread(selected.id);
      setThread(Array.isArray(t) ? t : []);
    } catch { toast.error('Failed to send reply'); }
  };

  const unread = messages.filter(m => !m.is_read).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">Private inbox and sent messages.</p>
          </div>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Compose</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <Label>To</Label>
                  <select className="w-full border rounded px-3 py-2 text-sm bg-background" value={form.recipient} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))} required>
                    <option value="">Select recipient</option>
                    {users.filter((u: any) => String(u.id) !== String(user?.id)).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
                <div><Label>Message</Label><Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} required /></div>
                <div><Label>Attachment (optional)</Label><Input type="file" onChange={e => setAttachFile(e.target.files?.[0] || null)} /></div>
                <Button type="submit" className="w-full"><Send className="h-4 w-4 mr-2" />Send</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant={box === 'inbox' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setBox('inbox'); setSelected(null); }}>
                <Inbox className="h-4 w-4 mr-1" />Inbox {unread > 0 && <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{unread}</Badge>}
              </Button>
              <Button variant={box === 'sent' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setBox('sent'); setSelected(null); }}>
                <Mail className="h-4 w-4 mr-1" />Sent
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              {loading ? <p className="p-4 text-sm text-muted-foreground">Loading...</p> :
                messages.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No messages.</p> :
                messages.map(m => (
                  <div key={m.id} onClick={() => openMessage(m)}
                    className={`p-3 border-b cursor-pointer hover:bg-muted transition-colors ${selected?.id === m.id ? 'bg-muted' : ''} ${!m.is_read && box === 'inbox' ? 'font-semibold' : ''}`}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{box === 'inbox' ? m.sender_name : m.recipient_name}</span>
                      <span>{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm truncate">{m.subject || '(no subject)'}</p>
                    {m.has_attachment && <Paperclip className="h-3 w-3 inline text-muted-foreground mt-1" />}
                  </div>
                ))
              }
            </div>
          </div>

          <div className="md:col-span-2">
            {!selected ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">Select a message to read.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selected.subject || '(no subject)'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    From: <strong>{selected.sender_name}</strong> · To: <strong>{selected.recipient_name}</strong> · {new Date(selected.created_at).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted rounded p-4 text-sm whitespace-pre-wrap">{selected.body}</div>
                  {selected.has_attachment && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const token = document.cookie.split('; ').find(r => r.startsWith('emsi_access='))?.split('=')[1];
                      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/messages/${selected.id}/attachment/`, { headers: { Authorization: `Bearer ${token}` } });
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a'); link.href = url; link.download = selected.attachment_name || 'attachment'; link.click();
                    }}>
                      <Paperclip className="h-4 w-4 mr-1" />Download {selected.attachment_name}
                    </Button>
                  )}
                  {thread.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <p className="text-sm font-medium">Replies</p>
                      {thread.map((r: any) => (
                        <div key={r.id} className="bg-muted/50 rounded p-3 text-sm">
                          <p className="font-medium text-xs mb-1">{r.sender_name} · {new Date(r.created_at).toLocaleString()}</p>
                          <p className="whitespace-pre-wrap">{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-4 space-y-2">
                    <Textarea placeholder="Write a reply..." value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={3} />
                    <Button size="sm" onClick={handleReply}><Send className="h-4 w-4 mr-1" />Reply</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messaging;
