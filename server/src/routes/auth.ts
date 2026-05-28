import { Router } from 'express';
import { z } from 'zod';
import { findByUsername } from '../auth/users.js';
import { signToken } from '../auth/jwt.js';

const router = Router();

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', (req, res) => {
  const result = LoginBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const { username, password } = result.data;
  const user = findByUsername(username);

  // Same error for unknown-user and wrong-password — deliberate. Distinct
  // messages would let an attacker enumerate valid usernames.
  if (!user || user.password !== password) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  res.json({ token: signToken(user.id) });
});

export default router;
