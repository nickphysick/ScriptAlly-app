/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.1 — one ruler for the reference and the app: the box of each named part relative to the panel's
 * outer box, and the computed styles ref-metrics.json records. Runs in the page (pass the function to evaluate).
 */
export type Metric = { x: number; y: number; w: number; h: number; font: string; size: string; weight: string; style: string;
  lineHeight: string; color: string; bg: string; padding: string; radius: string; outline: string;
  bgImage?: string | null; borderBottom?: string };
/** the reference records a bare "none" for logging and the full triple for editing: compare the style word for a bare value */
export const outlineEq = (ref: string, app: string) => (ref.includes(" ") ? ref === app : ref === app.split(" ")[0]);

/** in-page: measure `sels` (key → selector) against the first match of `panelSel`; a key with no visible match is null */
export function readMetrics(arg: { panelSel: string; sels: Record<string, string>; scope?: string }): Record<string, Metric | null> {
  const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const scopeEl = arg.scope ? [...document.querySelectorAll(arg.scope)].find(vis) ?? document : document;
  const panel = [...scopeEl.querySelectorAll(arg.panelSel)].find(vis) ?? ([...document.querySelectorAll(arg.panelSel)].find(vis) as Element | undefined);
  const out: Record<string, Metric | null> = {};
  if (!panel) return out;
  const pr = panel.getBoundingClientRect();
  const r1 = (n: number) => Math.round(n * 10) / 10;
  for (const [k, sel] of Object.entries(arg.sels)) {
    const el = panel.matches(sel) ? panel : [...panel.querySelectorAll(sel)].find(vis) ?? null;
    if (!el) { out[k] = null; continue; }
    const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
    out[k] = { x: r1(r.left - pr.left), y: r1(r.top - pr.top), w: r1(r.width), h: r1(r.height),
      font: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), size: c.fontSize, weight: c.fontWeight, style: c.fontStyle,
      lineHeight: c.lineHeight, color: c.color, bg: c.backgroundColor, padding: c.padding, radius: c.borderRadius,
      outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`,
      bgImage: c.backgroundImage === "none" ? null : c.backgroundImage, borderBottom: c.borderBottom };
  }
  return out;
}
