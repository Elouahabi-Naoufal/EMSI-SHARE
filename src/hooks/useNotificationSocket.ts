import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api')
  .replace(/^http/, 'ws')
  .replace('/api', '');

const getCookie = (name: string) =>
  document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');

export function useNotificationSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = getCookie('emsi_access');
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => onMessage(JSON.parse(e.data));

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);
}
