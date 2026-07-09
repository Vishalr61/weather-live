export interface LoginResponse {
  token: string;
}

export async function loginRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error ?? 'Login failed');
  }

  return res.json() as Promise<LoginResponse>;
}

export async function registerRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error ?? 'Registration failed');
  }

  return res.json() as Promise<LoginResponse>;
}
