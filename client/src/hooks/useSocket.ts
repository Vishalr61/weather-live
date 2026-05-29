import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import type { ServerToClientEvents, ClientToServerEvents } from '../types.ts';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export function useSocket(): { socket: AppSocket | null; status: ConnectionStatus } {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  // Callbacks are accessed through a ref so the effect dep array can be
  // [token] only — the only thing that should trigger a reconnect is the
  // token itself; putting logout/navigate in deps would reconnect the socket
  // on any identity change across renders or React Router version differences.
  const callbacksRef = useRef({ logout, navigate });
  callbacksRef.current = { logout, navigate };

  useEffect(() => {
    if (!token) return;

    setStatus('connecting');
    const newSocket: AppSocket = io({ auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect',    () => setStatus('connected'));
    newSocket.on('disconnect', () => setStatus('disconnected'));

    // connect_error fires repeatedly as socket.io-client retries on a sustained
    // outage — setStatus('reconnecting') is idempotent so repeated calls are fine.
    newSocket.on('connect_error', (err) => {
      if (err.message === 'invalid token' || err.message === 'authentication required') {
        // Auth failure: log out and redirect rather than retry.
        callbacksRef.current.logout();
        callbacksRef.current.navigate('/login', { replace: true });
      } else {
        setStatus('reconnecting');
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  return { socket, status };
}
