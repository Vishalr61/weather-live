// Runs before any test file's imports are evaluated (per vitest's
// setupFiles ordering) — jwt.ts throws at module-load time if this is
// unset, and tests shouldn't depend on a real .env file existing.
process.env.JWT_SECRET = 'test-secret-for-vitest';

// The socket integration test exercises real connect/disconnect/room
// logging — silence it here rather than letting pino-pretty output
// interleave with test results. logger.ts reads this at import time.
process.env.LOG_LEVEL = 'silent';
