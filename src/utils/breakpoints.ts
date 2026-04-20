import { DEFAULT_BREAKPOINTS } from '../core/config.js';

export function parseBreakpoints(raw: string | readonly number[] | undefined): number[] {
  if (raw === undefined) return [...DEFAULT_BREAKPOINTS];

  const values = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((v) => Number(v));

  const cleaned = values
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.round(n));

  if (cleaned.length === 0) {
    throw new Error('No valid breakpoint provided. Expected positive integers, e.g. "320,640,1024".');
  }

  return Array.from(new Set(cleaned)).sort((a, b) => a - b);
}

export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) {
    throw new Error(`Invalid quality "${quality}". Expected a number 0-100.`);
  }
  const q = Math.round(quality);
  if (q < 0 || q > 100) {
    throw new Error(`Quality out of range (${q}). Expected 0-100.`);
  }
  return q;
}
