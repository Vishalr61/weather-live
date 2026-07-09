import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { pushRateLimit } from './rateLimit.js';

// Deliberately its own file (and therefore its own fresh module registry,
// per Vitest's default per-file isolation) rather than sharing a describe
// block with routes/messages.test.ts — pushRateLimit is a module-level
// singleton, so tests that share it would otherwise consume each other's
// budget and become order-dependent.
describe('pushRateLimit', () => {
  it('allows 10 requests per window then returns 429 with the app error shape', async () => {
    const app = express();
    app.get('/probe', pushRateLimit, (_req, res) => res.json({ ok: true }));

    const statuses: number[] = [];
    let lastBody: unknown;
    for (let i = 0; i < 11; i++) {
      const res = await request(app).get('/probe');
      statuses.push(res.status);
      lastBody = res.body;
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
    expect(lastBody).toEqual({ error: 'Too many requests — please try again in a minute.' });
  });
});
