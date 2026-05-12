import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { messagingAPI, authAPI } from '@/services/api';
import { useChatSocket } from '@/hooks/useChatSocket';
import {
  Send, Search, Plus, Smile, Paperclip, Mic, Image, Film,
  X, Play, Pause, Check, CheckCheck, Phone, Video, MoreVertical
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const getCookie = (n: string) => document.cookie.split('; ').reduce((r, v) => { const p = v.split('='); return p[0] === n ? decodeURIComponent(p[1]) : r; }, '');

const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥','🎉','✅','💯','🙏','😭','🤣','😊','😏','🥺','😤','🤯','🥳','😴','🤗','😇','🤩','😬','🫡','💪','🎯','🚀','⭐','💡','📚','🎓','💻','📱','🎵'];

const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPzkcsvZnUpdated'; // placeholder — works without key for basic search

interface Conversation { id: number; other_user: { id: number; full_name: string; email: string }; last_message: any; unread_count: number; updated_at: string; }
interface Message { id: number; conversation: number; sender: number; sender_name: string; message_type: string; content: string; media_name: string; media_mime: string; gif_url: string; has_media: boolean; is_read: boolean; created_at: string; }

// ── Audio recorder hook ──────────────────────────────────────────────────────
function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const stop = (): Promise<File> => new Promise(resolve => {
    if (!mediaRef.current) return;
    mediaRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      resolve(new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' }));
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    };
    mediaRef.current.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  });

  const cancel = () => {
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setDuration(0);
  };

  return { recording, duration, start, stop, cancel };
}

// ── Media bubble ─────────────────────────────────────────────────────────────
const MediaBubble: React.FC<{ msg: Message; isMine: boolean }> = ({ msg, isMine }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaUrl = `${API_BASE}/conversations/${msg.conversation}/media/${msg.id}/`;
  const headers = { Authorization: `Bearer ${getCookie('emsi_access')}` };

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!msg.has_media) return;
    fetch(mediaUrl, { headers }).then(r => r.blob()).then(b => setBlobUrl(URL.createObjectURL(b)));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [msg.id]);

  if (msg.message_type === 'gif' && msg.gif_url) {
    return <img src={msg.gif_url} alt="gif" className="rounded-xl max-w-[220px] max-h-[180px] object-cover" />;
  }
  if (msg.message_type === 'image' && blobUrl) {
    return <img src={blobUrl} alt={msg.media_name} className="rounded-xl max-w-[260px] max-h-[220px] object-cover cursor-pointer" onClick={() => window.open(blobUrl)} />;
  }
  if (msg.message_type === 'video' && blobUrl) {
    return <video src={blobUrl} controls className="rounded-xl max-w-[260px] max-h-[200px]" />;
  }
  if (msg.message_type === 'audio' && blobUrl) {
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <button onClick={() => { if (playing) { audioRef.current?.pause(); setPlaying(false); } else { audioRef.current?.play(); setPlaying(true); } }}
          className={`p-2 rounded-full ${isMine ? 'bg-white/20' : 'bg-primary/10'}`}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1 h-1 rounded-full bg-current opacity-30" />
        <audio ref={audioRef} src={blobUrl} onEnded={() => setPlaying(false)} className="hidden" />
      </div>
    );
  }
  if (msg.message_type === 'file' && blobUrl) {
    return (
      <a href={blobUrl} download={msg.media_name} className="flex items-center gap-2 underline text-sm">
        <Paperclip className="h-4 w-4" />{msg.media_name}
      </a>
    );
  }
  return null;
};

// ── GIF picker ───────────────────────────────────────────────────────────────
const GifPicker: React.FC<{ onSelect: (url: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);

  useEffect(() => {
    const term = query || 'trending';
    const url = query
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyC9pUAoMBBMFnuDpGMFMGMFMGMFMGMFMGM&limit=20&media_filter=gif`
      : `https://tenor.googleapis.com/v2/featured?key=AIzaSyC9pUAoMBBMFnuDpGMFMGMFMGMFMGMFMGM&limit=20&media_filter=gif`;
    // Use Giphy public beta as fallback (no key needed for basic)
    const giphyUrl = query
      ? `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=20&rating=g`;
    fetch(giphyUrl)
      .then(r => r.json())
      .then(d => setGifs(d.data || []))
      .catch(() => setGifs([]));
  }, [query]);

  return (
    <div className="absolute bottom-full mb-2 left-0 w-80 bg-popover border rounded-xl shadow-xl z-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Input placeholder="Search GIFs..." value={query} onChange={e => setQuery(e.target.value)} className="h-8 text-sm" autoFocus />
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-3 gap-1 max-h-52 overflow-y-auto">
        {gifs.map((g: any) => {
          const url = g.images?.fixed_height_small?.url || g.images?.downsized?.url;
          return url ? (
            <img key={g.id} src={url} alt="" className="rounded cursor-pointer hover:opacity-80 h-20 w-full object-cover"
              onClick={() => { onSelect(url); onClose(); }} />
          ) : null;
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Messaging: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { recording, duration, start: startRec, stop: stopRec, cancel: cancelRec } = useAudioRecorder();

  const loadConversations = useCallback(async () => {
    try {
      const d = await messagingAPI.getConversations();
      setConversations(Array.isArray(d) ? d : d?.results || []);
    } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { authAPI.getAllUsers().then(setUsers).catch(() => {}); }, []);

  const openConv = async (conv: Conversation) => {
    setActiveConv(conv);
    try {
      const msgs = await messagingAPI.getMessages(conv.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    } catch {}
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  const handleWsMessage = useCallback((data: any) => {
    if (data.sender_id !== undefined) {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (data.is_typing) next.add(data.sender_id); else next.delete(data.sender_id);
        return next;
      });
      return;
    }
    const currentConvId = activeConvRef.current?.id;
    if (data.conversation_id === currentConvId) {
      setMessages(prev => [...prev, data]);
    }
    setConversations(prev => prev.map(c =>
      c.id === data.conversation_id
        ? { ...c, last_message: { content: data.content || `[${data.message_type}]`, created_at: data.created_at, sender_id: data.sender }, unread_count: data.conversation_id !== currentConvId ? c.unread_count + 1 : 0 }
        : c
    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
  }, []);

  const { sendTyping } = useChatSocket(handleWsMessage);

  const handleTyping = (val: string) => {
    setText(val);
    if (!activeConv) return;
    sendTyping(activeConv.other_user.id, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(activeConv.other_user.id, false), 1500);
  };

  const sendMsg = async (type: string, extra: Partial<Parameters<typeof messagingAPI.sendMessage>[1]> = {}) => {
    if (!activeConv || sending) return;
    setSending(true);
    try {
      const msg = await messagingAPI.sendMessage(activeConv.id, { message_type: type, content: text, ...extra });
      setMessages(prev => [...prev, msg]);
      setText('');
      loadConversations();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    const mime = file.type;
    const type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file';
    await sendMsg(type, { media: file, content: '' });
    e.target.value = '';
  };

  const handleVoice = async () => {
    if (recording) {
      const file = await stopRec();
      await sendMsg('audio', { media: file, content: '' });
    } else {
      try { await startRec(); } catch { toast.error('Microphone access denied'); }
    }
  };

  const startNewChat = async (u: any) => {
    const conv = await messagingAPI.startConversation(u.id);
    setNewChatOpen(false);
    setUserSearch('');
    await loadConversations();
    setActiveConv(conv);
    const msgs = await messagingAPI.getMessages(conv.id);
    setMessages(Array.isArray(msgs) ? msgs : []);
  };

  const filteredConvs = conversations.filter(c =>
    c.other_user?.full_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter((u: any) =>
    String(u.id) !== String(user?.id) &&
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] rounded-xl overflow-hidden border bg-background shadow-sm">

        {/* ── Sidebar ── */}
        <div className="w-80 flex flex-col border-r">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Messages</h2>
              <Button size="icon" variant="ghost" onClick={() => setNewChatOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet.<br />
                <button className="text-primary mt-1 underline" onClick={() => setNewChatOpen(true)}>Start one</button>
              </div>
            ) : filteredConvs.map(conv => (
              <button key={conv.id} onClick={() => openConv(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/40 ${activeConv?.id === conv.id ? 'bg-muted' : ''}`}>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                  {conv.other_user?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-sm truncate">{conv.other_user?.full_name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">
                      {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message?.sender_id === user?.id ? '✓ ' : ''}{conv.last_message?.content || 'No messages yet'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="ml-1 flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat area ── */}
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Send className="h-7 w-7" />
            </div>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">or start a new one</p>
            <Button variant="outline" onClick={() => setNewChatOpen(true)}><Plus className="h-4 w-4 mr-2" />New Message</Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {activeConv.other_user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{activeConv.other_user?.full_name}</p>
                {typingUsers.has(activeConv.other_user?.id) && (
                  <p className="text-xs text-primary animate-pulse">typing...</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {messages.map((msg, i) => {
                const isMine = msg.sender === user?.id;
                const prevMsg = messages[i - 1];
                const showDate = !prevMsg || formatDate(msg.created_at) !== formatDate(prevMsg.created_at);
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">{formatDate(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-0.5`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                        isMine
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}>
                        {msg.message_type === 'text' ? (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : (
                          <MediaBubble msg={msg} isMine={isMine} />
                        )}
                        {msg.content && msg.message_type !== 'text' && (
                          <p className="text-xs mt-1 opacity-80">{msg.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                          {isMine && (msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                            : <Check className="h-3 w-3 text-primary-foreground/50" />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t bg-background/80 backdrop-blur">
              {recording && (
                <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400 flex-1">Recording... {duration}s</span>
                  <button onClick={cancelRec} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  {showEmoji && (
                    <div className="absolute bottom-full mb-2 left-0 bg-popover border rounded-xl shadow-xl z-50 p-3 w-72">
                      <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                        {EMOJI_LIST.map(e => (
                          <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); }}
                            className="text-xl hover:bg-muted rounded p-1 transition-colors">{e}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {showGif && (
                    <GifPicker onSelect={url => sendMsg('gif', { gif_url: url, content: '' })} onClose={() => setShowGif(false)} />
                  )}
                  <div className="flex items-end bg-muted rounded-2xl px-3 py-2 gap-2">
                    <button onClick={() => { setShowEmoji(v => !v); setShowGif(false); }} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                      <Smile className="h-5 w-5" />
                    </button>
                    <textarea
                      value={text}
                      onChange={e => handleTyping(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) sendMsg('text'); } }}
                      placeholder="Type a message..."
                      rows={1}
                      className="flex-1 bg-transparent resize-none outline-none text-sm max-h-32 overflow-y-auto"
                      style={{ minHeight: '24px' }}
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setShowGif(v => !v); setShowEmoji(false); }} className="text-muted-foreground hover:text-foreground">
                        <Film className="h-5 w-5" />
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-foreground">
                        <Paperclip className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10 flex-shrink-0"
                  onClick={() => text.trim() ? sendMsg('text') : handleVoice()}
                  disabled={sending}
                  variant={recording ? 'destructive' : 'default'}
                >
                  {text.trim() ? <Send className="h-4 w-4" /> : <Mic className={`h-4 w-4 ${recording ? 'animate-pulse' : ''}`} />}
                </Button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip" onChange={handleFile} />
            </div>
          </div>
        )}
      </div>

      {/* New chat dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
          <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} autoFocus />
          <div className="space-y-1 max-h-64 overflow-y-auto mt-2">
            {filteredUsers.map((u: any) => (
              <button key={u.id} onClick={() => startNewChat(u)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Messaging;
