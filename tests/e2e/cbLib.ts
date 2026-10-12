/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v1 (design-refs/corkboard-v4/corkboard-v4.html) — what the CB1 locks share. A plain module:
 * importing it runs no cases.
 *
 * ⚠️ THE FIXTURE IS A PREFIX, NOT THE ACCOUNT. The harness account is shared and other sessions seed it, so a
 *    lock about "8 notes" cannot be a claim about whatever the account holds today. `seedCorkboard.mjs` writes
 *    `cbseed-*` documents, and `window.__SA_CB_ONLY = "cbseed-"` (lib/corkboardReviewAid, dev builds only) hands
 *    the page's OWN derivations just those — input narrowed, nothing fabricated. `only("zz-none-")` is zero notes.
 *
 * ⚠️ EVERY CHECK IS A LEDGER ROW AND A CASE ASSERTS AT ITS END, with a floor: a probe that finds no subject has
 *    failed, not skipped.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const DIR = "reports/corkboard-v1";
/** `CB_ROUTE=/todo/noteboard` points the locks at the page's OLD address, for the red-first run on the build
 *  without the pack — where `/todo/corkboard` is not a route at all and every probe would only crash. */
export const ROUTE = process.env.CB_ROUTE ?? "/todo/corkboard";
export const OLD_ROUTE = "/todo/noteboard";
export const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
export const sz = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
export const PREFIX = "cbseed-";

type Row = { lock: string; where: string; ok: boolean; detail: string };
export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  write() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${process.env.CB_MUTATE ? `.${process.env.CB_MUTATE}` : ""}${process.env.CB_TAG ? `.${process.env.CB_TAG}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
  }
  done(floor: number) {
    this.write();
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
export const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/** Narrow the page to one id prefix (the review aid), set before any script runs. Also quiets the page guides. */
export async function only(page: Page, prefix: string | null, extra: Record<string, unknown> = {}) {
  await page.addInitScript(({ prefix, extra }) => {
    const w = window as unknown as Record<string, unknown>;
    if (prefix !== null) w.__SA_CB_ONLY = prefix;
    for (const [k, v] of Object.entries(extra)) w[k] = v;
  }, { prefix, extra });
}

export async function open(page: Page, route: string, vp: { width: number; height: number }) {
  /* a probe that finds no subject must say so in seconds, not wait out the test's seven minutes */
  page.setDefaultTimeout(12_000);
  await openRoute(page, route, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
}

/** The visible Corkboard page root (every workspace page stays mounted). Throws on none or two. */
export const ROOT_FN = `(() => {
  const all = [...document.querySelectorAll(".nb-scope.tdb-wrap")].filter((e) => e.getBoundingClientRect().height > 0);
  if (all.length !== 1) throw new Error("visible corkboard roots: " + all.length);
  return all[0];
})()`;

/** The seeder, run from node: `seed`, `clean`, `snap` (prefs → file), `restore` (file → prefs), `prefs` (print). */
export function seeder(...args: string[]): string {
  return execFileSync("node", ["tests/e2e/seedCorkboard.mjs", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** The words a writer can read in the visible shell and page: text, placeholders, labels and titles. */
export async function readableText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const out: string[] = [];
    const seen = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (!seen(el)) continue;
      for (const n of Array.from(el.childNodes)) if (n.nodeType === 3 && n.textContent && n.textContent.trim()) out.push(n.textContent);
      for (const a of ["placeholder", "aria-label", "title", "alt"]) { const v = el.getAttribute(a); if (v) out.push(v); }
    }
    out.push(document.title);
    return out.join(" \n ");
  });
}

/** The page root, then a selector inside it — every probe is scoped to the page a reader can see. */
export const inPage = (sel: string) => `.nb-scope.tdb-wrap:visible ${sel}`;

/**
 * What the app WROTE to Firestore while `fn` ran: the bodies of the write channel's requests. Firestore's web
 * client sends writes on `.../Write/channel`; listens go to `.../Listen/channel` and are not counted.
 * ⚠️ THE INSTRUMENT IS PROVED BY C3, which requires exactly one write and reads `layout` out of it — so a
 *    "wrote nothing" here is a reading, not a probe that cannot see.
 */
export async function writesDuring(page: Page, fn: () => Promise<void>, settleMs = 1500): Promise<string[]> {
  const seen: string[] = [];
  const on = (req: import("@playwright/test").Request) => {
    if (req.method() !== "POST" || !/\/Write\/channel/.test(req.url())) return;
    const body = req.postData() ?? "";
    if (/writes/.test(decodeURIComponent(body))) seen.push(decodeURIComponent(body));
  };
  page.on("request", on);
  try { await fn(); await page.waitForTimeout(settleMs); } finally { page.off("request", on); }
  return seen;
}

/** The header as a reader meets it. */
export async function readHeader(page: Page) {
  return page.evaluate((ROOT) => {
    const root = (0, eval)(ROOT) as HTMLElement;
    const h = root.querySelector<HTMLElement>("header.hp3, header.ph");
    if (!h) return null;
    const r = h.getBoundingClientRect();
    const txt = (sel: string) => (h.querySelector<HTMLElement>(sel)?.textContent ?? "").trim();
    return {
      box: { x: r.x, y: r.y, w: r.width, h: r.height },
      bg: getComputedStyle(h).backgroundColor,
      kind: h.getAttribute("data-hp3"), living: h.getAttribute("data-living"), loading: h.hasAttribute("data-loading"),
      number: txt('[data-hp3-part="number"]:not(.hp3-blank)'), words: txt('[data-hp3-part="words"]:not(.hp3-blank)'),
      name: h.querySelector("h1")?.getAttribute("aria-label") ?? "", sub: txt('[data-hp3-part="sub"]'),
      buttons: h.querySelectorAll("button, a[href]").length,
      art: h.querySelector("[data-art]")?.getAttribute("data-art") ?? null,
    };
  }, ROOT_FN);
}

/** Every note on the board: id, box, opacity, and whether it is in the document. */
export async function readNotes(page: Page) {
  return page.evaluate((ROOT) => {
    const root = (0, eval)(ROOT) as HTMLElement;
    return [...root.querySelectorAll<HTMLElement>("[data-note]")].map((el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { id: el.getAttribute("data-note")!, x: r.x, y: r.y, w: r.width, h: r.height, opacity: Number(cs.opacity), text: (el.querySelector(".nb-body")?.textContent ?? "").trim() };
    });
  }, ROOT_FN);
}
