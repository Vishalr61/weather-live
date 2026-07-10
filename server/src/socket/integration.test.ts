import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { registerAuthMiddleware } from './authMiddleware.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { signToken } from '../auth/jwt.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types.js';

// A real Socket.IO server + real socket.io-client connections over an
// ephemeral port — unlike everything else in this suite, this exercises
// the actual network/handshake/room-membership behavior end to end rather
// than stubbing it, which is the only way to genuinely verify multiple
// concurrent clients see (or don't see) the right room-targeted events.
type IOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let httpServer: HttpServer;
let io: IOServer;
let port: number;
const clients: ClientSocket[] = [];

beforeAll(async () => {
  httpServer = createServer();
  io = new Server(httpServer, { cors: { origin: '*' } });
  registerAuthMiddleware(io);
  registerRoomHandlers(io);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const address = httpServer.address();
      port = typeof address === 'object' && address ? address.port : 0;
      resolve();
    });
  });
});

afterEach(() => {
  for (const client of clients.splice(0)) client.disconnect();
});

afterAll(async () => {
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

// The real app sends the token via an httpOnly cookie (browsers attach it
// automatically); a Node socket.io-client has no cookie jar, so it's set
// explicitly here via extraHeaders — this exercises the same
// socket.handshake.headers.cookie parsing path the real server uses.
function connect(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      extraHeaders: token !== undefined ? { Cookie: `token=${token}` } : {},
      reconnection: false,
      forceNew: true,
    });
    socket.on('connect', () => {
      clients.push(socket);
      resolve(socket);
    });
    socket.on('connect_error', (err) => reject(err));
  });
}

// Attaches the listener synchronously (Promise executors run immediately),
// so callers can set this up BEFORE triggering the emit that might satisfy
// it. Resolves null on timeout — used to assert a client did NOT receive
// something, not just that it did.
function waitForMessage(socket: ClientSocket, timeoutMs = 500): Promise<unknown | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once('message', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function joinAndSettle(socket: ClientSocket, city: string): Promise<void> {
  socket.emit('watchCity', city);
  await new Promise((r) => setTimeout(r, 100)); // let the join land server-side
}

describe('socket handshake auth', () => {
  it('rejects a connection with no token', async () => {
    await expect(connect(undefined)).rejects.toMatchObject({ message: 'authentication required' });
  });

  it('rejects a connection with an invalid token', async () => {
    await expect(connect('not-a-real-jwt')).rejects.toMatchObject({ message: 'invalid token' });
  });

  it('accepts a connection with a valid token', async () => {
    const socket = await connect(signToken('user-1'));
    expect(socket.connected).toBe(true);
  });
});

describe('room targeting with multiple real clients', () => {
  it('delivers a room-targeted message only to the client watching that city', async () => {
    const melbourneClient = await connect(signToken('user-1'));
    const sydneyClient = await connect(signToken('user-2'));
    await joinAndSettle(melbourneClient, 'melbourne');
    await joinAndSettle(sydneyClient, 'sydney');

    const melbournePromise = waitForMessage(melbourneClient);
    const sydneyPromise = waitForMessage(sydneyClient);

    io.to('melbourne').emit('message', {
      text: 'severe storm approaching',
      city: 'melbourne',
      timestamp: new Date().toISOString(),
    });

    const [melbourneResult, sydneyResult] = await Promise.all([melbournePromise, sydneyPromise]);
    expect(melbourneResult).toMatchObject({ text: 'severe storm approaching', city: 'melbourne' });
    expect(sydneyResult).toBeNull();
  });

  it('lets one client watch multiple cities at once and receive alerts for either', async () => {
    const client = await connect(signToken('user-3'));
    await joinAndSettle(client, 'tokyo');
    await joinAndSettle(client, 'london');

    const firstPromise = waitForMessage(client);
    io.to('tokyo').emit('message', { text: 'tokyo alert', city: 'tokyo', timestamp: new Date().toISOString() });
    expect(await firstPromise).toMatchObject({ text: 'tokyo alert' });

    const secondPromise = waitForMessage(client);
    io.to('london').emit('message', { text: 'london alert', city: 'london', timestamp: new Date().toISOString() });
    expect(await secondPromise).toMatchObject({ text: 'london alert' });
  });

  it('stops delivering to a city after unwatchCity', async () => {
    const client = await connect(signToken('user-4'));
    await joinAndSettle(client, 'paris');

    client.emit('unwatchCity', 'paris');
    await new Promise((r) => setTimeout(r, 100));

    const resultPromise = waitForMessage(client);
    io.to('paris').emit('message', { text: 'should not arrive', city: 'paris', timestamp: new Date().toISOString() });
    expect(await resultPromise).toBeNull();
  });
});
