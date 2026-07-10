// No response body to parse anymore — the server sets the auth token via an
// httpOnly Set-Cookie header instead of returning it in JSON, which is the
// whole point of the cookie migration (a token in the JSON body would be
// just as readable to an XSS payload as one in localStorage).

export async function loginRequest(username: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error ?? 'Login failed');
  }
}

export async function registerRequest(username: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error ?? 'Registration failed');
  }
}
