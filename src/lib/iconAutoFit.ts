/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Icon auto-fit sizing — the algorithm used by the Agents stat card's icon row
 * (`AgentGlyphRow` in components/dashboard/StatCards.tsx, ~lines 460-472), extracted so other
 * icon clusters can reuse the same scaling rather than a bespoke tiered lookup.
 *
 * Given the available width and the number of icons, return the icon size (clamped to [min, max])
 * and the inter-icon gap (size × gapRatio). Once the size hits the floor the caller decides what to
 * do with any overflow (wrap, cap, clip, or a "+N" label) — this helper only sizes.
 *
 * StatCards keeps its own inline copy (it is out of scope to modify); this is the shared form.
 */
export interface IconFit {
  size: number;
  gap: number;
}

export const fitIconSize = (
  avail: number,
  count: number,
  { max, min, gapRatio = 0.4 }: { max: number; min: number; gapRatio?: number }
): IconFit => {
  if (avail <= 0 || count <= 0) return { size: max, gap: Math.round(max * gapRatio) };
  const raw = Math.floor(avail / (count * (1 + gapRatio)));
  const size = Math.max(min, Math.min(max, raw));
  return { size, gap: Math.round(size * gapRatio) };
};
