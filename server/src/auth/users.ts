export interface User {
  id: string;
  username: string;
  password: string;
}

// Passwords are plain text for demo simplicity.
// In production: bcrypt.hash at rest, bcrypt.compare on login.
const users: User[] = [
  { id: '1', username: 'demo',  password: 'demo'     },
  { id: '2', username: 'alice', password: 'alice123' },
];

export function findByUsername(username: string): User | undefined {
  return users.find((u) => u.username === username);
}
