import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

// Hashes precomputed once (bcrypt.hashSync('demo'/'alice123', 10)) rather
// than hashed at every module load — mirrors how a real signup flow would
// store a hash once, not recompute it on every server boot.
const users: User[] = [
  { id: '1', username: 'demo', passwordHash: '$2b$10$B2h5S4PnI16ZB0CEcQHZ7.djFlV0QVfQasrZPCwSysdXjhIgYlJLS' },
  { id: '2', username: 'alice', passwordHash: '$2b$10$Wn8lCJiYXBCxH38Ui5q.y.UZvlODxyEFGKQymQratjCXQJosyja5.' },
];

// Demo users occupy ids '1' and '2' — registered users start after them.
let nextId = 3;

export function findByUsername(username: string): User | undefined {
  return users.find((u) => u.username === username);
}

export function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// In-memory, like the rest of this store — a new user is gone on restart.
// No email verification (would need real SMTP/third-party infrastructure
// to actually test); see README's "what I'd add for production".
export function addUser(username: string, passwordHash: string): User {
  const user: User = { id: String(nextId++), username, passwordHash };
  users.push(user);
  return user;
}
