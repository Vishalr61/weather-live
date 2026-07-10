import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { addUser, findByUsername, hashPassword, verifyPassword } from '../auth/users.js';
import { signToken, verifyToken } from '../auth/jwt.js';
import { registerRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Not a real user's hash — just something for bcrypt.compare to spend the
// same amount of time on when the username doesn't exist, so an unknown
// username can't be distinguished from a wrong password by response time.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8p8ZjhOJHAeVBpUX2FxEEBw//sIVh6';

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // matches signToken's 8h JWT expiry

// httpOnly so XSS can't read the token via document.cookie or JS — the
// whole point of this migration away from localStorage. secure is
// conditional because the dev server runs over plain http; a `secure`
// cookie is silently dropped by the browser over http, not just insecure.
// sameSite: 'lax' blocks the classic CSRF case (a cross-site POST from
// another origin) while still sending the cookie on normal top-level
// navigation. No separate CSRF token scheme: this app has no authenticated
// state-changing REST endpoint to forge (POST /api/messages and /poll-now
// are deliberately unauthenticated ops routes) — the only thing the cookie
// gates is the Socket.IO handshake, which isn't forgeable the way a hidden
// form submission is.
function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const RegisterBody = z.object({
  username: z
    .string()
    .min(3, 'username must be at least 3 characters')
    .max(30, 'username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'username may only contain letters, numbers, underscores, and hyphens'),
  password: z.string().min(6, 'password must be at least 6 characters'),
});

router.post('/login', async (req, res) => {
  const result = LoginBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const { username, password } = result.data;
  const user = findByUsername(username);

  // Same error for unknown-user and wrong-password — deliberate. Distinct
  // messages would let an attacker enumerate valid usernames. Still runs
  // bcrypt.compare against a dummy hash on an unknown user so the response
  // time doesn't itself leak whether the username exists.
  const valid = user
    ? await verifyPassword(user, password)
    : await verifyPassword({ id: '', username: '', passwordHash: DUMMY_HASH }, password);

  if (!user || !valid) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  setAuthCookie(res, signToken(user.id));
  res.json({ ok: true });
});

// No email verification — would need real SMTP/third-party infrastructure
// to actually test end to end. In memory like the rest of this store: a
// registered user is gone on restart, same trade-off as the demo users.
router.post('/register', registerRateLimit, async (req, res) => {
  const result = RegisterBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'invalid username or password' });
    return;
  }

  const { username, password } = result.data;
  if (findByUsername(username)) {
    res.status(409).json({ error: 'username is already taken' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = addUser(username, passwordHash);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ ok: true });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// The client can't read an httpOnly cookie directly — this is how it asks
// "am I logged in" without the token ever touching JS.
router.get('/me', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'not authenticated' });
    return;
  }
  try {
    const payload = verifyToken(token);
    res.json({ userId: payload.sub });
  } catch {
    res.status(401).json({ error: 'not authenticated' });
  }
});

export default router;
