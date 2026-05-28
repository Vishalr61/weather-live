import type { Server } from 'socket.io';
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
  // handshake disconnects the socket before any room logic runs.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
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
