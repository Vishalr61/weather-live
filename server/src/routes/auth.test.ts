import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import authRouter from './auth.js';

let app: Express;

// JWT_SECRET is set in vitest.setup.ts, before any test file's imports run
// (jwt.ts throws at module-load time if it's unset) — so this needn't
// depend on a real .env file existing the way the dev/build scripts do.
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
});

describe('POST /api/auth/login', () => {
  it('returns a token for each correct demo credential pair', async () => {
    for (const [username, password] of [['demo', 'demo'], ['alice', 'alice123']]) {
      const res = await request(app).post('/api/auth/login').send({ username, password });
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.').length).toBe(3); // header.payload.signature
    }
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
  });

  it('rejects an unknown username with the same 401 and message as a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
  });

  it('rejects a request missing the password field with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'demo' });
    expect(res.status).toBe(400);
  });

  it('rejects a request missing the username field with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'demo' });
    expect(res.status).toBe(400);
  });
});

// Kept to 4 requests total (well under registerRateLimit's 5/10min) so this
// describe block doesn't trip its own rate limit mid-suite.
describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser123', password: 'hunter22' });
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a duplicate username with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser123', password: 'differentpass' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('username is already taken');
  });

  it('rejects a too-short username with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'ab', password: 'hunter22' });
    expect(res.status).toBe(400);
  });

  it('rejects a too-short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'someoneelse', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('registration then login', () => {
  it('lets a freshly registered user log in with the same credentials afterward', async () => {
    // registerRateLimit is a module-level singleton, so its budget is shared
    // across every request to /register in this file regardless of which
    // app instance the router is mounted on — this is the 5th and last one
    // the describe block above leaves room for within the 5/10min limit.
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'roundtrip-user', password: 'roundtrip-pass' });
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'roundtrip-user', password: 'roundtrip-pass' });
    expect(loginRes.status).toBe(200);
    expect(typeof loginRes.body.token).toBe('string');
  });
});
