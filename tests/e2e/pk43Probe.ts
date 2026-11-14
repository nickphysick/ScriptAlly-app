/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 — the probes the pk43 locks share: the shared navy header (`.qc1531-hd`) and the collapsed
 * bar (`.qc156-slim`) on any page, read off the VISIBLE page root (every workspace page stays mounted, so `document`
 * reaches hidden copies too). `before.json` (Step 0 item 4) and lock P2 are both these readings.
 */
import { expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

export const W1440 = { width: 1440, height: 900 };
export const W1717 = { width: 1717, height: 1000 };
export const SIZES = [W1440, W1717] as const;
export const MS = "pk40-ms";

/** The four pages whose header and bar this page borrows, and must not move (P2). */
export const OTHERS = [
  { name: "Query Centre", route: "/queries", root: '[data-qc151="page"]' },
  { name: "Contact list", route: "/agents", root: ".clv-group.cl27" },
  { name: "To-do", route: "/todo", root: '[data-tws="page"]' },
  { name: "Query letters", route: "/materials/letters", root: '[data-ql="page"]' },
] as const;
export const PK = { name: "Submission packages", route: "/queries/packages", root: '[data-pk41="page"]' } as const;

export async function openPage(page: Page, route: string, root: string, size: { width: number; height: number }, ms = MS) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id as string); } catch { /* */ } }, ms);
  await openRoute(page, route, size);
  await expect(page.locator(root).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}

/** The visible scroller holding `root`, scrolled to `y`. */
export async function scrollPage(page: Page, root: string, y: number) {
  await page.evaluate(([root, y]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    const sc = r?.closest<HTMLElement>(".wpg-scroll");
    if (sc) sc.scrollTop = y as number;
  }, [root, y] as const);
  await page.waitForTimeout(450);
}

const PROPS = ["display", "grid-template-columns", "gap", "padding", "margin", "border-radius", "background-color", "box-shadow", "color",
  "font-size", "font-family", "font-weight", "line-height", "height", "width", "opacity", "visibility"];

/** The header: its box, look, title and buttons, and a computed-style walk of every element in it. */
export async function headerSnap(page: Page, root: string) {
  return page.evaluate(([root, PROPS]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    const hd = r?.querySelector<HTMLElement>(".qc1531-hd");
    if (!r || !hd) return null;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const box = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { left: r1(b.left), right: r1(b.right), top: r1(b.top), height: r1(b.height), width: r1(b.width) }; };
    const c = getComputedStyle(hd);
    const t = hd.querySelector<HTMLElement>("h1.qc1531-t");
    const btns = [...hd.querySelectorAll<HTMLElement>(".qc1531-acts .qc1531-b")].map((b) => r1(b.getBoundingClientRect().height));
    const walk = (e: Element, path: string): Record<string, unknown>[] => {
      const s = getComputedStyle(e);
      const out: Record<string, unknown>[] = [{ path, tag: e.tagName, cls: e.getAttribute("class"), ...Object.fromEntries((PROPS as string[]).map((p) => [p, s.getPropertyValue(p)])) }];
      [...e.children].forEach((k, i) => out.push(...walk(k, `${path}/${i}`)));
      return out;
    };
    return {
      box: box(hd), radius: c.borderTopLeftRadius, bg: c.backgroundColor, shadow: c.boxShadow,
      title: { left: t ? r1(t.getBoundingClientRect().left) : null, size: t ? getComputedStyle(t).fontSize : null, text: t?.textContent ?? null },
      buttons: btns, walk: walk(hd, "hd"),
    };
  }, [root, PROPS] as const);
}

/** The collapsed bar, as it stands now: shown or not, inert, its box, its ground's reach, its title and button. */
export async function slimSnap(page: Page, root: string) {
  return page.evaluate(([root, PROPS]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    const s = r?.querySelector<HTMLElement>(":scope > .qc156-slim");
    if (!r || !s) return null;
    const sc = r.closest<HTMLElement>(".wpg-scroll")!;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const b = s.getBoundingClientRect(), scb = sc.getBoundingClientRect();
    const g = getComputedStyle(s, "::before");
    const tb = s.querySelector<HTMLElement>(".qc156-st b"), btn = s.querySelector<HTMLElement>(".qc156-sb");
    const walk = (e: Element, path: string): Record<string, unknown>[] => {
      const st = getComputedStyle(e);
      const out: Record<string, unknown>[] = [{ path, tag: e.tagName, cls: e.getAttribute("class"), ...Object.fromEntries((PROPS as string[]).map((p) => [p, st.getPropertyValue(p)])) }];
      [...e.children].forEach((k, i) => out.push(...walk(k, `${path}/${i}`)));
      return out;
    };
    return {
      shown: s.hasAttribute("data-shown"), inert: s.hasAttribute("inert"), ariaHidden: s.getAttribute("aria-hidden"),
      box: { left: r1(b.left), right: r1(b.right), top: r1(b.top - scb.top), height: r1(b.height) },
      ground: { left: r1(b.left + parseFloat(g.left)), right: r1(b.right - parseFloat(g.right)), sheetLeft: r1(scb.left), sheetRight: r1(scb.left + sc.clientWidth), bg: g.backgroundColor },
      title: tb ? { size: getComputedStyle(tb).fontSize, text: tb.textContent } : null,
      button: btn ? { height: r1(btn.getBoundingClientRect().height), text: btn.textContent, bg: getComputedStyle(btn).backgroundColor } : null,
      walk: walk(s, "slim"),
    };
  }, [root, PROPS] as const);
}

/** Drop the parts of a reading that move with the data or the page's own content, keeping geometry and look. */
export const stable = (x: unknown) => JSON.parse(JSON.stringify(x, (k, v) => (k === "text" ? undefined : v)));
