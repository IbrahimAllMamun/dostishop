import { useAuth } from '@/store/auth';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    useAuth.getState().logout();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

export const API_URL = API;
