import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types.js';
import authRouter from './routes/auth.js';
import { weatherRouter } from './routes/weather.js';
import { messagesRouter } from './routes/messages.js';
import { registerAuthMiddleware } from './socket/authMiddleware.js';
import { registerRoomHandlers } from './socket/roomHandlers.js';
import { startWeatherPoller } from './weather/poller.js';
import { logger } from './logger.js';

const app = express();
// credentials: true (both here and on the Socket.IO server below) so the
// browser actually sends/stores the httpOnly auth cookie — an explicit
// origin is required for this, "*" is rejected by browsers once
// credentials are involved.
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Logs every request (method, path, status, response time) as one
// structured line — the "no visibility into what's flowing" gap this
// closes doesn't need full distributed tracing to be worth having.
app.use(pinoHttp({ logger }));

const httpServer = createServer(app);

// io is exported so route factories can receive it as a parameter — keeps
// the dependency explicit and avoids a module-level singleton that's harder
// to reason about when tracing the message broadcast path.
export const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: 'http://localhost:5173', credentials: true },
});

registerAuthMiddleware(io);
registerRoomHandlers(io);

const poller = startWeatherPoller(io, Number(process.env.WEATHER_POLL_INTERVAL_MS ?? 5 * 60 * 1000));

app.use('/api/auth', authRouter);
app.use('/api/weather', weatherRouter(poller.getLatestSnapshot, poller.pollOnce));
app.use('/api/messages', messagesRouter(io));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? '3001';
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'server listening');
});
