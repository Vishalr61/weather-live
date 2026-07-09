import { Router } from 'express';
import { z } from 'zod';
import { addUser, findByUsername, hashPassword, verifyPassword } from '../auth/users.js';
import { signToken } from '../auth/jwt.js';
import { registerRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Not a real user's hash — just something for bcrypt.compare to spend the
// same amount of time on when the username doesn't exist, so an unknown
// username can't be distinguished from a wrong password by response time.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8p8ZjhOJHAeVBpUX2FxEEBw//sIVh6';

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

  res.json({ token: signToken(user.id) });
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
  res.status(201).json({ token: signToken(user.id) });
});

export default router;
