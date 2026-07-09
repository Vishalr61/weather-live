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

export function findByUsername(username: string): User | undefined {
  return users.find((u) => u.username === username);
}

export function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}
