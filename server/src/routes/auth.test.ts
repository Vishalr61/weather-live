import express from 'express';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';
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
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
});

// supertest doesn't manage a cookie jar across requests the way a browser
// does — this pulls the token cookie's raw Set-Cookie value out of a
// response so a later request can .set('Cookie', ...) with it explicitly.
function extractCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('no Set-Cookie header on response');
  return raw.split(';')[0]; // "token=<jwt>"
}

describe('POST /api/auth/login', () => {
  it('sets an httpOnly token cookie for each correct demo credential pair', async () => {
    for (const [username, password] of [['demo', 'demo'], ['alice', 'alice123']]) {
      const res = await request(app).post('/api/auth/login').send({ username, password });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const cookie = extractCookie(res);
      expect(cookie).toMatch(/^token=/);
      const rawSetCookie = res.headers['set-cookie'];
      const setCookieHeader = Array.isArray(rawSetCookie) ? rawSetCookie[0] : rawSetCookie;
      expect(setCookieHeader).toMatch(/HttpOnly/i);

      const token = cookie.slice('token='.length);
      expect(token.split('.').length).toBe(3); // header.payload.signature
    }
  });

  it('rejects a wrong password with 401 and no cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
    expect(res.headers['set-cookie']).toBeUndefined();
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

describe('GET /api/auth/me', () => {
  it('returns 401 with no cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the userId for a valid cookie from a real login', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'demo' });
    const cookie = extractCookie(loginRes);

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({ userId: '1' }); // demo is the first hardcoded user
  });

  it('returns 401 for a garbage cookie value', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie so a subsequent /me call is unauthenticated', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'demo' });
    const cookie = extractCookie(loginRes);

    const meBefore = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meBefore.status).toBe(200);

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(200);
    const clearedCookie = extractCookie(logoutRes);
    // clearCookie sets an empty value with an immediate expiry — the browser
    // (and our extractCookie helper) sees this as "token=" with no value.
    expect(clearedCookie).toBe('token=');
  });
});

// Kept to 4 requests total (well under registerRateLimit's 5/10min) so this
// describe block doesn't trip its own rate limit mid-suite.
describe('POST /api/auth/register', () => {
  it('creates a new user and sets a token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser123', password: 'hunter22' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(extractCookie(res)).toMatch(/^token=/);
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

describe('registration then login then /me', () => {
  it('lets a freshly registered user log in with the same credentials and hit /me afterward', async () => {
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

    const cookie = extractCookie(loginRes);
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(typeof meRes.body.userId).toBe('string');
  });
});
