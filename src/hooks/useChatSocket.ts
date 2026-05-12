import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api')
  .replace(/^http/, 'ws')
  .replace('/api', '');

const getCookie = (name: string) =>
  document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');

export function useChatSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always call the latest onMessage without reconnecting
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    const token = getCookie('emsi_access');
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/chat/?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (e) => onMessageRef.current(JSON.parse(e.data));
    ws.onclose = () => { reconnectTimer.current = setTimeout(connect, 4000); };
    ws.onerror = () => ws.close();
  }, []); // no deps — connect only once

  const sendTyping = useCallback((recipientId: number, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', recipient_id: recipientId, is_typing: isTyping }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  return { sendTyping };
}
