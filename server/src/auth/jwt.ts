import jwt from 'jsonwebtoken';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  // Fail fast on missing config — a silent insecure default is worse than a
  // crash because it looks like it's working while signing tokens with a key
  // that's committed to a public repo.
  throw new Error('JWT_SECRET is not set. Copy server/.env.example to server/.env');
}
// Two-step assignment so TypeScript narrows SECRET to string; flow analysis
// doesn't carry the throw guard across a module-level const directly.
const SECRET: string = rawSecret;

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, SECRET) as { sub: string };
}
