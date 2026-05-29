import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSocket } from './useSocket.ts';
import type { MessagePayload } from '../types.ts';

export interface ToastMessage {
  id: string;
  text: string;
  city: string;
  timestamp: string;
}

export function useMessages(socket: AppSocket | null): {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
} {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // A ref (not local effect state) so dismiss() — defined outside the effect —
  // can cancel a timer that was created inside the effect.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: MessagePayload) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, ...payload }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 5000);
      timersRef.current.set(id, timer);
    };

    socket.on('message', handler);
    return () => {
      socket.off('message', handler);
      // Clear all pending auto-dismiss timers — without this, timers queued
      // before logout would call setToasts after the component unmounts.
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, [socket]);

  return { toasts, dismiss };
}
