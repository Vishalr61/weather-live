import { useEffect, useRef, useState } from 'react';
import type { AppSocket } from './useSocket.ts';
import { fetchAlertHistory } from '../api/weather.ts';
import type { GlobalAlertPayload } from '../types.ts';

export interface GlobalAlertEntry extends GlobalAlertPayload {
  id: string;
}

const MAX_RECENT = 12;

function alertKey(a: GlobalAlertPayload): string {
  return `${a.cityId}:${a.timestamp}`;
}

// Global alerts fire for every connected client regardless of which city
// room they've joined — distinct from the room-targeted 'message' event
// useMessages.ts listens for, which only reaches subscribers of that city.
export function useGlobalAlerts(socket: AppSocket | null): {
  lastAlert: GlobalAlertEntry | null;
  recentAlerts: GlobalAlertEntry[];
} {
  const [lastAlert, setLastAlert] = useState<GlobalAlertEntry | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<GlobalAlertEntry[]>([]);

  // The poller persists an alert to disk before broadcasting it live, so an
  // alert received over the socket may also show up in the history fetch —
  // this tracks keys already surfaced so the merge doesn't duplicate them.
  const seenKeys = useRef(new Set<string>());

  // Seed from server-persisted history on mount, so a freshly-loaded client
  // sees alerts that fired before it ever connected — not just whatever
  // arrives live from this point on.
  useEffect(() => {
    fetchAlertHistory()
      .then((alerts) => {
        const fresh = alerts.filter((a) => !seenKeys.current.has(alertKey(a)));
        fresh.forEach((a) => seenKeys.current.add(alertKey(a)));
        const entries = fresh.map((a) => ({ id: crypto.randomUUID(), ...a }));
        setRecentAlerts((prev) => [...prev, ...entries].slice(0, MAX_RECENT));
      })
      .catch(() => { /* history unavailable — ticker just starts empty and fills live */ });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: GlobalAlertPayload) => {
      const key = alertKey(payload);
      if (seenKeys.current.has(key)) return;
      seenKeys.current.add(key);
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
