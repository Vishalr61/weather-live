import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { messagesRouter } from './messages.js';

// Duck-typed mock matching only what messagesRouter actually touches
// (io.sockets.adapter.rooms.get(city)?.size, io.to(city).emit(...)) — not
// a real Socket.IO Server, which this route's logic doesn't need one for.
function createMockIo(roomSizes: Record<string, number>) {
  const emitted: Array<{ room: string; event: string; payload: unknown }> = [];
  const rooms = new Map(Object.entries(roomSizes).map(([room, size]) => [room, { size }]));
  const io = {
    sockets: { adapter: { rooms } },
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  };
  return { io: io as unknown as Parameters<typeof messagesRouter>[0], emitted };
}

function buildApp(roomSizes: Record<string, number> = {}) {
  const { io, emitted } = createMockIo(roomSizes);
  const app = express();
  app.use(express.json());
  app.use('/api/messages', messagesRouter(io));
  return { app: app as Express, emitted };
}

describe('POST /api/messages', () => {
  it('rejects a body missing message/city with 400', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/messages').send({ message: 'hi' });
    expect(res.status).toBe(400);
  });

  it('reports the mock room size as recipients and emits to that room', async () => {
    const { app, emitted } = buildApp({ melbourne: 2 });
    const res = await request(app)
      .post('/api/messages')
      .send({ message: 'Severe storm approaching', city: 'melbourne' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, recipients: 2 });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      room: 'melbourne',
      event: 'message',
      payload: { text: 'Severe storm approaching', city: 'melbourne' },
    });
  });

  it('reports 0 recipients for a city room with no subscribers', async () => {
    const { app } = buildApp({ melbourne: 2 }); // sydney intentionally absent
    const res = await request(app)
      .post('/api/messages')
      .send({ message: 'Air quality alert', city: 'sydney' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, recipients: 0 });
  });
});
