import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import type { ServerToClientEvents, ClientToServerEvents } from '../types.ts';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(): AppSocket | null {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<AppSocket | null>(null);

  // Callbacks are accessed through a ref so the effect dep array can be
  // [token] only — the only thing that should trigger a reconnect is the
  // token itself; putting logout/navigate in deps would reconnect the socket
  // on any identity change across renders or React Router version differences.
  const callbacksRef = useRef({ logout, navigate });
  callbacksRef.current = { logout, navigate };

  useEffect(() => {
    if (!token) return;

    const newSocket: AppSocket = io({ auth: { token } });
    setSocket(newSocket);

    // On connect_error, if the server rejects the token (expired/invalid),
    // call logout() — ProtectedRoute will redirect to /login automatically.
    newSocket.on('connect_error', (err) => {
      if (err.message === 'invalid token' || err.message === 'authentication required') {
        callbacksRef.current.logout();
        callbacksRef.current.navigate('/login', { replace: true });
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  return socket;
}
