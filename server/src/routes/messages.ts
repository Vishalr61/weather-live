import { Router } from 'express';
import { z } from 'zod';
import type { Server } from 'socket.io';
import { pushRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../logger.js';
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

// City is intentionally not validated against the weather city catalog —
// the push endpoint is an ops mechanism that should work for any room name,
// decoupled from what the weather UI happens to list.
const MessageBody = z.object({
  message: z.string().min(1),
  city: z.string().min(1),
});

// Factory pattern: needs the io instance from index.ts; returning a router
// from a factory keeps the wiring explicit rather than relying on a
// module-level singleton.
export function messagesRouter(io: IOServer): Router {
  const router = Router();

  // Intentionally unauthenticated per the brief — described as a push
  // mechanism into the system (ops/admin tooling). In production: API key
  // or admin role. Rate-limited per IP in the meantime since there's no
  // auth to key abuse prevention on otherwise.
  router.post('/', pushRateLimit, (req, res) => {
    const result = MessageBody.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'message and city are required' });
      return;
    }

    const { message, city } = result.data;

    // Synchronous read of the target city's room size — no fetchSockets()
    // round-trip needed. adapter.rooms excludes socket-id rooms so this
    // counts only sockets that explicitly joined the named room.
    const recipients = io.sockets.adapter.rooms.get(city)?.size ?? 0;

    io.to(city).emit('message', {
      text: message,
      city,
      timestamp: new Date().toISOString(),
    });

    logger.info({ city, recipients }, 'message pushed');
    res.json({ ok: true, recipients });
  });

  return router;
}
