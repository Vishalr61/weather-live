import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSocket } from './useSocket.ts';

const STORAGE_KEY = 'weatherlive:watchlist';

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function useWatchlist(socket: AppSocket | null): {
  watchlist: string[];
  addCity: (cityId: string) => void;
  removeCity: (cityId: string) => void;
} {
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addCity = useCallback((cityId: string) => {
    setWatchlist((prev) => (prev.includes(cityId) ? prev : [...prev, cityId]));
  }, []);

  const removeCity = useCallback((cityId: string) => {
    setWatchlist((prev) => prev.filter((id) => id !== cityId));
  }, []);

  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  // (Re)join every watched room whenever the connection is (re)established.
  // socket.io-client's 'connect' event fires on the first successful
  // connection too, not just reconnects, so this single handler covers both
  // "socket just became available" and "backend bounced mid-session."
  useEffect(() => {
    if (!socket) return;
    const joinAll = () => {
      for (const cityId of watchlistRef.current) socket.emit('watchCity', cityId);
    };
    socket.on('connect', joinAll);
    socket.io.on('reconnect', joinAll);
    if (socket.connected) joinAll();
    return () => {
      socket.off('connect', joinAll);
      socket.io.off('reconnect', joinAll);
    };
  }, [socket]);

  // Keep room membership in sync with watchlist edits made while already
  // connected — adding/removing a city mid-session shouldn't wait for the
  // next reconnect. Diffed against the previous watchlist rather than
  // re-joining everything, so an unrelated add doesn't re-emit for cities
  // already watched.
  const prevWatchlistRef = useRef<string[]>(watchlist);
  useEffect(() => {
    if (!socket || !socket.connected) {
      prevWatchlistRef.current = watchlist;
      return;
    }
    const prev = prevWatchlistRef.current;
    for (const id of watchlist) {
      if (!prev.includes(id)) socket.emit('watchCity', id);
    }
    for (const id of prev) {
      if (!watchlist.includes(id)) socket.emit('unwatchCity', id);
    }
    prevWatchlistRef.current = watchlist;
  }, [socket, watchlist]);

  return { watchlist, addCity, removeCity };
}
