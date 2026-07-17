import { getSettings } from '@/lib/api';

export const metadata = { title: 'Contact us' };

export default async function ContactPage() {
  const settings = await getSettings().catch(() => null);
  const phone = settings?.supportPhone ?? '01700000000';
  const email = settings?.supportEmail ?? 'support@boutique.test';

  return (
    <div className="container-x max-w-3xl space-y-6 py-12">
      <h1 className="font-display text-4xl font-bold">Contact us</h1>
      <p className="text-ink/80">
        Have a question about an order or a product? Reach out — we usually reply within a few hours.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-muted">Call / WhatsApp</p>
          <a href={`tel:${phone}`} className="mt-1 block text-lg font-semibold text-primary">
            {phone}
          </a>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Email</p>
          <a href={`mailto:${email}`} className="mt-1 block text-lg font-semibold text-primary">
            {email}
          </a>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Support hours</p>
          <p className="mt-1 font-medium">Saturday–Thursday, 10am–8pm</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Track an order</p>
          <a href="/track" className="mt-1 block font-medium text-primary">
            Go to order tracking →
          </a>
        </div>
      </div>
    </div>
  );
}
