/**
 * IP1 — shared helpers for the Import page's locks (onboarding v5, part 3).
 * Kept apart from the measure file so nothing has to import a file that declares tests.
 */
import { type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const OUT = resolve(process.cwd(), "reports/onb-v5-import-page");
export const FIX = resolve(process.cwd(), "tests/e2e/fixtures/onbV5ImportPage");
export const MUTATE = process.env.IP1_MUTATE ?? "";
export const SHOTS = !!process.env.IP1_SHOTS;

export const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }] as const;
export const vpName = (vp: { width: number; height: number }) => `${vp.width}x${vp.height}`;

export function record(lock: string, vp: string, name: string, value: unknown) {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(resolve(OUT, `readings${MUTATE ? `-mutated-${MUTATE}` : ""}.jsonl`), JSON.stringify({ lock, vp, name, value }) + "\n");
}

/** Open a lab screen. The lab reads its query once, at mount, so a changed query needs a reload. */
export async function lab(page: Page, q: string, opts: { reduced?: boolean; wait?: string } = {}) {
  if (opts.reduced !== false) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/#/onb-lab?${q}`, { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(opts.wait ?? "[data-setup-frame]", { timeout: 20_000 });
  await page.evaluate(() => (document as Document).fonts.ready);
}

/** A screen's rendered markup and main boxes, read from inside `root`. */
export async function capture(page: Page, root: string, mode: "full" | "skeleton") {
  return page.evaluate(({ root, mode }) => {
    const host = document.querySelector(root);
    if (!host) return null;
    const clone = host.cloneNode(true) as HTMLElement;
    // values a run cannot hold still: generated ids and the inline styles animation writes
    for (const el of [clone, ...Array.from(clone.querySelectorAll("*"))] as HTMLElement[]) {
      for (const a of ["id", "for", "aria-labelledby", "aria-describedby", "aria-controls"]) {
        const v = el.getAttribute(a);
        if (v && /^(:r|«r|_r_)/.test(v)) el.setAttribute(a, "·");
      }
      if (mode === "skeleton") { el.removeAttribute("style"); for (const n of Array.from(el.childNodes)) if (n.nodeType === 3) n.textContent = ""; }
    }
    const r0 = host.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 2) / 2;
    const boxes = Array.from(host.querySelectorAll("[data-im],[data-sf],[data-screen],[data-act],h1,button")).slice(0, 400).map((e) => {
      const r = e.getBoundingClientRect();
      const tag = e.getAttribute("data-im") ?? e.getAttribute("data-sf") ?? e.getAttribute("data-screen") ?? e.getAttribute("data-act") ?? e.tagName.toLowerCase();
      return [tag, round(r.left - r0.left), round(r.top - r0.top), round(r.width), round(r.height)];
    });
    return { html: clone.innerHTML, boxes };
  }, { root, mode });
}
