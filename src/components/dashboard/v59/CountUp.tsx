/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v59 — the first paint's count-up.
 *
 * ⚠️ THE REAL NUMBER IS ALWAYS THE TEXT. The figure is rendered as itself; during the first paint a
 * CSS counter laid OVER it counts 0 → the figure (dash59.css `.d59-n`), with the text's own glyphs
 * made transparent underneath. So screen readers, `textContent` and every lock that reads a title
 * get the true figure at every moment, the box never changes width, and React never has a text node
 * mutated behind its back.
 *
 * ⚠️ IT IS A `<data>` ELEMENT, NOT A `<span>`. brand.tsx names a face on every bare span at runtime,
 * and `.d58-tile span` is the tile's LABEL rule: a span here re-set the figure itself in the label's
 * 13.5px serif, at rest as well as while counting.
 */
import React from "react";

/** The figure, counted up from 0 during the first paint. */
export const CountUp: React.FC<{ n: number; text?: string }> = ({ n, text }) => (
  <data className="d59-n" data-d58="count" value={String(n)} style={{ ["--d59-to" as string]: Math.max(0, Math.round(n)) } as React.CSSProperties}>{text ?? String(n)}</data>
);

/** A sentence that opens on a figure ("39 active queries"): the figure counts, the rest is text. */
export function countable(s: string): React.ReactNode {
  const m = /^(\d[\d,]*)(\D[\s\S]*)?$/.exec(s);
  if (!m) return s;
  return <><CountUp n={Number(m[1].replace(/,/g, ""))} text={m[1]} />{m[2] ?? ""}</>;
}
