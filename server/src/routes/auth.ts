import { Router } from 'express';
import { z } from 'zod';
import { findByUsername, verifyPassword } from '../auth/users.js';
import { signToken } from '../auth/jwt.js';

const router = Router();

// Not a real user's hash — just something for bcrypt.compare to spend the
// same amount of time on when the username doesn't exist, so an unknown
// username can't be distinguished from a wrong password by response time.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8p8ZjhOJHAeVBpUX2FxEEBw//sIVh6';

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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

export default router;
