import type { Money } from './types';

export function formatTk(value: Money | null | undefined): string {
  const n = Number(value ?? 0);
  return `৳${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function toNumber(value: Money | null | undefined): number {
  return Number(value ?? 0);
}
