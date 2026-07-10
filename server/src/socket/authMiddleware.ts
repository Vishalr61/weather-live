import type { Server } from 'socket.io';
import { parseCookie } from 'cookie';
import { verifyToken } from '../auth/jwt.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types.js';

type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerAuthMiddleware(io: IOServer): void {
  // Verify JWT once at connection time rather than on every event — a failed
  // handshake disconnects the socket before any room logic runs. The token
  // now rides along in the httpOnly cookie (client connects with
  // withCredentials: true) rather than an explicit auth.token payload —
  // socket.io doesn't parse cookies itself, so the raw header is parsed here.
  io.use((socket, next) => {
    const rawCookie = socket.handshake.headers.cookie;
    const token = rawCookie ? parseCookie(rawCookie).token : undefined;
    if (!token) {
      return next(new Error('authentication required'));
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });
}
