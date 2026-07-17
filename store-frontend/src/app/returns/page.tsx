export const metadata = { title: 'Return & refund policy' };

export default function ReturnsPage() {
  return (
    <div className="container-x max-w-3xl space-y-6 py-12">
      <h1 className="font-display text-4xl font-bold">Return &amp; refund policy</h1>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Returns window</h2>
        <p className="leading-relaxed text-ink/80">
          You may request a return within <strong>3 days</strong> of delivery if an item is damaged,
          defective, or not as described. Contact the shop or our support with your order number and
          photos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Non-returnable items</h2>
        <p className="leading-relaxed text-ink/80">
          For hygiene and safety, <strong>cosmetics and pierced jewelry (e.g. earrings)</strong>{' '}
          cannot be returned or exchanged once delivered, unless they arrive damaged or incorrect.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Refunds</h2>
        <p className="leading-relaxed text-ink/80">
          Approved returns are refunded to the original payment method, or via bKash/bank transfer
          for cash-on-delivery orders, within 7 working days of the returned item being received.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">How to request</h2>
        <p className="leading-relaxed text-ink/80">
          Message us on WhatsApp or email with your order number. Each shop handles its own returns,
          and our team is here to help if anything goes wrong.
        </p>
      </section>
    </div>
  );
}
