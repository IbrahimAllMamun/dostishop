import { API_URL } from '@/lib/api';
import { useAuth } from '@/store/auth';

/**
 * Uploads go through `fetch` rather than the JSON `api` helper because they are
 * multipart. The server records every one in the media library, so the gallery
 * and the product form stay in step without either telling the other.
 */
export async function uploadFile(file: File): Promise<string> {
  const token = useAuth.getState().token;
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? 'Upload failed');
  return (data as { url: string }).url;
}

/** Sequential on purpose — a shop on Bangladeshi mobile data is the common case. */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) urls.push(await uploadFile(file));
  return urls;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
