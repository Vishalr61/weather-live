import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

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
  cors: { origin: 'http://localhost:5173' },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? '3001';
httpServer.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
