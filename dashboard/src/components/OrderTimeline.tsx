import { Check, X } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { SubOrderEvent } from '@/lib/types';

/** The happy path a sub-order walks. CANCELLED and RETURNED are exits from it,
 *  not steps along it, so they get their own treatment below. */
const STEPS = [
  { status: 'PENDING', label: 'Placed' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'PROCESSING', label: 'Processing' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'DELIVERED', label: 'Delivered' },
] as const;

const TERMINAL = ['CANCELLED', 'RETURNED'];

function timeOf(events: SubOrderEvent[], status: string) {
  return events.find((e) => e.status === status)?.createdAt;
}

/**
 * Stepped progress plus the raw event log. Both are driven by SubOrderEvent —
 * the current `status` field alone can't say when anything happened.
 */
export function OrderTimeline({
  status,
  events,
}: {
  status: string;
  events: SubOrderEvent[];
}) {
  const exited = TERMINAL.includes(status);
  const currentIndex = STEPS.findIndex((s) => s.status === status);
  // On an exit the walk stopped wherever the last happy-path event got to
  const reachedIndex = exited
    ? Math.max(
        ...STEPS.map((s, i) => (events.some((e) => e.status === s.status) ? i : -1)),
        0,
      )
    : currentIndex;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        {exited && (
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-sale-strong">
            <X className="h-4 w-4" /> This order was {status.toLowerCase()}.
          </p>
        )}

        <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0">
          {STEPS.map((step, i) => {
            const done = i <= reachedIndex;
            const at = timeOf(events, step.status);
            const isLast = i === STEPS.length - 1;
            return (
              <li key={step.status} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
                <div className="flex flex-col items-center sm:w-full sm:flex-row">
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                      done && !exited
                        ? 'bg-primary text-primary-foreground'
                        : done
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted text-muted-foreground/50'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  {!isLast && (
                    <span
                      aria-hidden
                      className={`w-0.5 flex-1 sm:h-0.5 sm:w-full ${
                        i < reachedIndex && !exited ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
                <div className="pb-4 sm:pb-0 sm:pr-4">
                  <p className={`text-sm font-medium ${done ? '' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {at ? formatDate(at) : done ? '—' : 'Pending'}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <h2 className="font-semibold">History</h2>
          <span className="text-xs text-muted-foreground">
            {events.length} event{events.length === 1 ? '' : 's'}
          </span>
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5">
                  <th className="th">When</th>
                  <th className="th">Status</th>
                  <th className="th">Note</th>
                </tr>
              </thead>
              <tbody>
                {[...events].reverse().map((e, i) => (
                  <tr
                    key={e.id}
                    style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                    className="animate-row-in border-b border-ink/5 last:border-0"
                  >
                    <td className="td whitespace-nowrap text-muted-foreground">
                      {formatDate(e.createdAt)}
                    </td>
                    <td className="td">{e.status}</td>
                    <td className="td text-muted-foreground">{e.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
