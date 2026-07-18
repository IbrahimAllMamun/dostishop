import { useState } from 'react';
import { api } from '@/lib/api';

export function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setMsg({ ok: true, text: 'Password updated ✓' });
      setCurrent('');
      setNext('');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-6">
      <h2 className="font-semibold">Change password</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Current password</label>
          <input
            type="password"
            required
            className="input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="label">New password (min 6)</label>
          <input
            type="password"
            required
            minLength={6}
            className="input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-sale'}`}>{msg.text}</p>}
      <button type="submit" disabled={saving} className="btn-primary btn-sm">
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}
