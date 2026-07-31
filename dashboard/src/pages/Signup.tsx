import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth, type AuthUser } from '@/store/auth';

export function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);

  const [form, setForm] = useState({
    name: '',
    shopName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: form.name,
        shopName: form.shopName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      // Log the new vendor straight in (shop starts pending approval)
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email: form.email,
        password: form.password,
      });
      setAuth(res.token, res.user);
      navigate('/vendor', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold">
            Boutique<span className="text-primary">BD</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Open your shop — sell to customers nationwide</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Your name</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Shop name</label>
              <input
                required
                className="input"
                value={form.shopName}
                onChange={(e) => set('shopName', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              className="input"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-sale">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating your shop…' : 'Create shop'}
          </button>
        </form>

        <p className="mt-4 rounded-lg bg-sand/60 px-3 py-2 text-center text-xs text-muted-foreground">
          Your shop is reviewed by an admin before it goes live. You can add products right away.
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have a shop?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
