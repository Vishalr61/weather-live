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
