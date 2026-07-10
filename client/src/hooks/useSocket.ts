import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import type { ServerToClientEvents, ClientToServerEvents } from '../types.ts';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export function useSocket(): { socket: AppSocket | null; status: ConnectionStatus } {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  // Callbacks are accessed through a ref so the effect dep array can be
  // [isAuthenticated] only — the only thing that should trigger a reconnect
  // is auth state itself; putting logout/navigate in deps would reconnect
  // the socket on any identity change across renders or React Router
  // version differences.
  const callbacksRef = useRef({ logout, navigate });
  callbacksRef.current = { logout, navigate };

  useEffect(() => {
    if (!isAuthenticated) return;

    setStatus('connecting');
    // withCredentials so the browser attaches the httpOnly auth cookie to
    // the handshake — there's no token to pass explicitly anymore.
    const newSocket: AppSocket = io({ withCredentials: true });
    setSocket(newSocket);

    newSocket.on('connect',    () => setStatus('connected'));
    newSocket.on('disconnect', () => setStatus('disconnected'));
    // socket.io-client's reconnect event fires on the Manager (newSocket.io),
    // not the Socket itself. Without this, the status would stay amber after a
    // successful reconnect because 'connect' on the Socket only fires on the
    // initial connection in a reconnect cycle.
    newSocket.io.on('reconnect', () => setStatus('connected'));

    // connect_error fires repeatedly as socket.io-client retries on a sustained
    // outage — setStatus('reconnecting') is idempotent so repeated calls are fine.
    newSocket.on('connect_error', (err) => {
      if (err.message === 'invalid token' || err.message === 'authentication required') {
        // Auth failure: log out and redirect rather than retry.
        void callbacksRef.current.logout();
        callbacksRef.current.navigate('/login', { replace: true });
      } else {
        setStatus('reconnecting');
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated]);

  return { socket, status };
}
