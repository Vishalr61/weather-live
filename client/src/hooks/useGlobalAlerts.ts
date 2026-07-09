import { useEffect, useState } from 'react';
import type { AppSocket } from './useSocket.ts';
import type { GlobalAlertPayload } from '../types.ts';

export interface GlobalAlertEntry extends GlobalAlertPayload {
  id: string;
}

const MAX_RECENT = 8;

// Global alerts fire for every connected client regardless of which city
// room they've joined — distinct from the room-targeted 'message' event
// useMessages.ts listens for, which only reaches subscribers of that city.
export function useGlobalAlerts(socket: AppSocket | null): {
  lastAlert: GlobalAlertEntry | null;
  recentAlerts: GlobalAlertEntry[];
} {
  const [lastAlert, setLastAlert] = useState<GlobalAlertEntry | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<GlobalAlertEntry[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: GlobalAlertPayload) => {
      const entry: GlobalAlertEntry = { id: crypto.randomUUID(), ...payload };
      setLastAlert(entry);
      setRecentAlerts((prev) => [entry, ...prev].slice(0, MAX_RECENT));
    };

    socket.on('globalAlert', handler);
    return () => {
      socket.off('globalAlert', handler);
    };
  }, [socket]);

  return { lastAlert, recentAlerts };
}
