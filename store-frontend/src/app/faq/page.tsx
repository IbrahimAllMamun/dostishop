export const metadata = { title: 'FAQ' };

const FAQS = [
  {
    q: 'How do I place an order?',
    a: 'Add items to your cart and check out with your name, phone and delivery address. No account needed.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Cash on delivery is available nationwide. Online payment (bKash / card) is coming soon.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Usually 2–5 days. Inside Dhaka is faster than outside-Dhaka areas.',
  },
  {
    q: 'Why is shipping charged per shop?',
    a: 'Each shop packs and ships its own items, so if your order spans multiple shops, each ships separately.',
  },
  {
    q: 'How do I track my order?',
    a: 'Use the Track order page with your order number and the phone number you used at checkout.',
  },
  {
    q: 'What is your return policy?',
    a: 'Most items can be returned within the policy window. Cosmetics and pierced jewelry are non-returnable for hygiene reasons. See the Returns page for details.',
  },
];

export default function FaqPage() {
  return (
    <div className="container-x max-w-3xl space-y-6 py-12">
      <h1 className="font-display text-4xl font-bold">Frequently asked questions</h1>
      <div className="space-y-3">
        {FAQS.map((f) => (
          <details key={f.q} className="card group p-5">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="flex items-center justify-between">
                {f.q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
