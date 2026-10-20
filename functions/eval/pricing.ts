/**
 * Pricing for the Smart Import evaluation harness — the ONE place cost figures live.
 *
 * ⚠️ NICK: CHECK THESE AGAINST ANTHROPIC'S CURRENT PRICING PAGE BEFORE TRUSTING A COST
 * (https://www.anthropic.com/pricing — the API section). They were taken on 19 Oct 2026 from the
 * claude-api skill's cached model table (cached 2026-10-06): Sonnet 4.6 at $3 input / $15 output per
 * million tokens, with a 5-minute cache write at 1.25× input and a cache read at 0.1× input. A run's
 * reported cost is only as good as this block.
 *
 * `input_tokens` in the API's usage EXCLUDES cached tokens, so the four are added, never overlapping.
 */
import type { MapUsage } from "../src/smartImportCore";

export interface ModelPrice {
  /** USD per million tokens. */
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

export const PRICING_USD_PER_MTOK: Record<string, ModelPrice> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
};

/** A run whose estimate exceeds this refuses to start without --confirm-spend. */
export const SPEND_CEILING_USD = 5;

export function priceFor(model: string): ModelPrice {
  const p = PRICING_USD_PER_MTOK[model];
  if (!p) throw new Error(`No price for model "${model}" in functions/eval/pricing.ts — add it before running.`);
  return p;
}

export function costUsd(model: string, u: MapUsage): number {
  const p = priceFor(model);
  return (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheWriteTokens * p.cacheWrite + u.cacheReadTokens * p.cacheRead) / 1_000_000;
}
