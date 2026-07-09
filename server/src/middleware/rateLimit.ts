import rateLimit from 'express-rate-limit';

// Shared by every unauthenticated, resource-consuming POST route — pushing
// a message and forcing a poll cycle are both "ops tooling with no auth by
// design" per the README, which is exactly what makes them abusable without
// this. Per-IP, since there's no user identity to key on here.
export const pushRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests — please try again in a minute.' });
  },
});

// A separate, stricter instance for account creation — a different abuse
// vector (spam-registering accounts) from the ops-push endpoints above, so
// it gets its own budget rather than sharing pushRateLimit's.
export const registerRateLimit = rateLimit({
  windowMs: 10 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many registration attempts — please try again later.' });
  },
});
