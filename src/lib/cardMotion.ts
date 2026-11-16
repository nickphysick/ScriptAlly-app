/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v1, Phase 6 — THE CARD'S MOTION that CSS alone cannot carry (design-refs/record-a-response-v1/,
 * "Every route and the motion"). Everything else (the slide in, the scrim, the composer's fold and rise, the bubble's
 * pop, the Undo toast) is CSS.
 *
 *   swapCard   "Who replied?" ↔ a query's card: the frame stays; its contents go out 130ms to one side, the new ones come
 *              in 220ms from the other, and the band's colour cross-fades over 300ms
 *   savedCard  after a save: the band cross-fades 420ms, the status pill pops 360ms, the footer swaps in 240ms
 *   leaveGhost the panel and its scrim, closed: a copy slides away 200ms ease-in while the real one is already gone, so
 *              the page behind is live at once and nothing in the app waits on the animation
 *
 * ⚠️ REDUCED MOTION: each of these is a plain cut (the caller's change still happens, at once).
 * ⚠️ WEB ANIMATIONS, NOT KEYFRAMES WITH var(): the values are literals (CLAUDE.md: no var() inside @keyframes).
 */
const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const panelIn = (): HTMLElement | null => document.querySelector<HTMLElement>("[data-qp='panel'] .qc152-in");
const kidsOf = (inEl: HTMLElement) => [...inEl.children].filter((e): e is HTMLElement => e instanceof HTMLElement && !e.classList.contains("qc152-band"));
const bandOf = (inEl: HTMLElement | null) => inEl?.querySelector<HTMLElement>(":scope > .qc152-band") ?? null;

/** lay the band's old colour over the new one and fade it out */
function fadeBand(oldBg: string, ms: number): void {
  const band = bandOf(panelIn());
  if (!band || !oldBg || getComputedStyle(band).backgroundColor === oldBg) return;
  const o = document.createElement("span");
  o.setAttribute("aria-hidden", "true");
  o.className = "qcm-fade";
  o.style.background = oldBg;
  band.prepend(o);
  o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease" }).finished.then(() => o.remove(), () => o.remove());
}

/** the list and a card trade places in one frame; `dir` 1 = forwards (list → card), -1 = back */
export function swapCard(dir: 1 | -1, change: () => void): void {
  const inEl = panelIn();
  if (reduced() || !inEl) { change(); return; }
  const oldBg = bandOf(inEl) ? getComputedStyle(bandOf(inEl)!).backgroundColor : "";
  const outs = kidsOf(inEl).map((e) => e.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-14 * dir}px)` }],
    { duration: 130, easing: "ease-in", fill: "forwards" }).finished);
  void Promise.all(outs).catch(() => {}).then(() => {
    change();
    /* the new contents are drawn on the next frame */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const now = panelIn();
      if (!now) return;
      fadeBand(oldBg, 300);
      for (const e of kidsOf(now)) {
        if (e.matches(".qc1522-cp, .qc1522-toast")) continue;
        e.animate([{ opacity: 0, transform: `translateX(${18 * dir}px)` }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      }
    }));
  });
}

/** read before the save: the band's colour now, to fade from */
export function bandColourNow(): string {
  const b = bandOf(panelIn());
  return b ? getComputedStyle(b).backgroundColor : "";
}
/** after the save has drawn: the band, the pill and the footer settle into the new state */
export function savedCard(oldBg: string): void {
  if (reduced()) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const inEl = panelIn();
    if (!inEl) return;
    fadeBand(oldBg, 420);
    inEl.querySelector<HTMLElement>("[data-qc152='pill']")?.animate(
      [{ transform: "scale(0.88)", opacity: 0.2 }, { transform: "scale(1.05)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }],
      { duration: 360, delay: 140, fill: "backwards" });
    inEl.querySelector<HTMLElement>("[data-qc1522='footer'], [data-qc152='reply']")?.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 240, delay: 180, fill: "backwards" });
  }));
}

/**
 * The closing slide: a copy of the panel (and of its scrim) goes the way it came over 200ms, ease-in, and is removed.
 * The copy is inert, hidden from assistive tech and carries none of the panel's identifying attributes, so nothing
 * that looks for the panel finds it.
 */
export function leaveGhost(panel: HTMLElement | null, scrim: HTMLElement | null): void {
  if (reduced() || !panel || !panel.isConnected) return;
  const r = panel.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return;
  const g = panel.cloneNode(true) as HTMLElement;
  for (const a of ["role", "aria-modal", "aria-label", "data-qp", "data-qp-id", "data-qp-from", "data-side-panel", "id"]) g.removeAttribute(a);
  for (const el of g.querySelectorAll("[id]")) el.removeAttribute("id");
  for (const el of g.querySelectorAll("[role='dialog']")) el.removeAttribute("role");
  g.setAttribute("aria-hidden", "true");
  g.setAttribute("data-ghost", "");
  g.inert = true;
  g.style.cssText += `;position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;right:auto;bottom:auto;margin:0;animation:none;pointer-events:none;`;
  document.body.appendChild(g);
  g.animate([{ transform: "none", opacity: 1 }, { transform: "translateX(calc(100% + 30px))", opacity: 1 }], { duration: 200, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" })
    .finished.then(() => g.remove(), () => g.remove());
  if (scrim && scrim.isConnected && getComputedStyle(scrim).opacity !== "0") {
    const s = document.createElement("div");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("data-ghost", "");
    s.style.cssText = `position:fixed;inset:0;z-index:${getComputedStyle(scrim).zIndex || 65};background:${getComputedStyle(scrim).backgroundColor};pointer-events:none;`;
    document.body.insertBefore(s, g);
    s.animate([{ opacity: Number(getComputedStyle(scrim).opacity) || 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in", fill: "forwards" })
      .finished.then(() => s.remove(), () => s.remove());
  }
}
