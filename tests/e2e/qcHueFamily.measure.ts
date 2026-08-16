/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §2/§3 — ONE HUE FAMILY, AND NO ACCENT SURFACES.
 *
 * ⚠️ THE TWO CLAIMS PALETTE A ACTUALLY MAKES, per Nick's correction: not a wider lightness range
 * (the measurement said 12 points across the surfaces, not 6, so widening was never the goal) but
 * HUE UNIFICATION and FEWER ACCENT SURFACES. Both are measured on the running page.
 *
 * ⚠️ THE STATUS COMPONENTS ARE EXCLUDED BY CONSTRUCTION, NOT BY EXCEPTION. StatusDots and the
 * timeline's marks are the one place pink and sage are supposed to live — they are the reason the
 * furniture had to stop wearing them. A sweep that flagged them would assert the opposite of §3.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const survey = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const oklch = (rgb: string) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.5) return null;   /* a wash takes its ground's hue */
    const s = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const [r, g, b] = [s(+m[1]), s(+m[2]), s(+m[3])];
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const ss = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const A = 1.9779984951 * l - 2.4285922050 * mm + 0.4505937099 * ss;
    const B = 0.0259040371 * l + 0.7827717662 * mm - 0.8086757660 * ss;
    const Lp = 0.2104542553 * l + 0.7936177850 * mm - 0.0040720468 * ss;
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return { L: Lp, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360,
             Lstar: Math.round(((Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : Y * 903.3)) * 10) / 10 };
  };
  const root = document.querySelector(".f12-root") as HTMLElement;
  /* the status components: the row's dot slot, and the timeline's marks */
  /**
   * ⚠️ THE DOT IS IDENTIFIED BY ITS LOCKED GEOMETRY, WHICH IS THE ONE STABLE THING ABOUT IT.
   * `StatusDot` takes its className from the caller and this page passes none, so there is no class
   * to key on — but the dot's shape IS locked (a circle, never below 12px, drawn only through the
   * component). A square element with a 50% radius in that size band is a dot; nothing else on this
   * page is one, once §3 has taken the sage tick off that shape.
   */
  const isStatus = (e: Element) => {
    const r = e.getBoundingClientRect();
    const round = getComputedStyle(e as HTMLElement).borderRadius.startsWith("50%");
    return round && Math.abs(r.width - r.height) < 1 && r.width <= 30;
  };
  /* ⚠️ NAMED CARVE-OUT, REPORTED RATHER THAN SILENT: the Pro badge is a cross-app brand element
     (`--pro`, also on Manuscripts, Packages and Discover). Neither §2 nor §3 names it, and
     repointing it here would make Pro look different on this page than everywhere else. */
  const isBrand = (e: Element) => getComputedStyle(e as HTMLElement).backgroundColor === "rgb(106, 137, 167)";
  const out: Array<{ c: string; H: number; C: number; Lstar: number; n: number; sample: string; status: boolean }> = [];
  const seen = new Map<string, { n: number; sample: string; status: boolean }>();
  for (const e of Array.from(root.querySelectorAll("*")) as HTMLElement[]) {
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const bg = getComputedStyle(e).backgroundColor;
    const v = oklch(bg);
    if (!v) continue;
    const cur = seen.get(bg) ?? { n: 0, sample: (e.className || e.tagName).toString().slice(0, 40), status: true };
    cur.n++;
    if (!isStatus(e) && !isBrand(e)) cur.status = false;
    seen.set(bg, cur);
  }
  for (const [c, v] of seen) { const k = oklch(c)!; out.push({ c, H: Math.round(k.H * 10) / 10, C: Math.round(k.C * 10000) / 10000, Lstar: k.Lstar, n: v.n, sample: v.sample, status: v.status }); }
  return out.sort((a, b) => b.Lstar - a.Lstar);
});

test("§2 — every non-white surface on the page belongs to one hue family", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const all = await survey(page);
  const furniture = all.filter((s) => !s.status && s.C > 0.002);   /* white and true greys have no hue */
  console.log("\nSURFACES (furniture only — status components excluded)");
  for (const s of all) console.log(`  ${s.status ? "status " : "       "} ${s.c.padEnd(26)} H ${String(s.H).padStart(5)}  C ${s.C.toFixed(4)}  L* ${String(s.Lstar).padStart(5)}  ×${s.n}  ${s.sample}`);

  expect(furniture.length, "no coloured furniture found — the survey is measuring nothing").toBeGreaterThan(3);
  const hues = furniture.map((s) => s.H);
  const spread = Math.max(...hues) - Math.min(...hues);
  const Ls = all.filter((s) => !s.status).map((s) => s.Lstar);
  console.log(`\nhue spread across furniture: ${spread.toFixed(1)}°  (${Math.min(...hues).toFixed(1)}–${Math.max(...hues).toFixed(1)})`);
  console.log(`surface lightness range: L* ${Math.min(...Ls)} → ${Math.max(...Ls)}`);
  /* ⚠️ A FAMILY, NOT A VALUE. The assertion is that they are all the SAME hue as each other — a
     tolerance against a constant would pass a page that had drifted together onto a wrong one. */
  expect(spread, `the page paints ${furniture.length} coloured surfaces spanning ${spread.toFixed(1)}° of hue — that is not one family`).toBeLessThanOrEqual(12);
});

test("§3 — no pink or sage background outside the status components", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const all = await survey(page);
  /* pink sits around H 20–60, sage around H 120–150 in OKLCH; the page's own family is ~78 */
  const offending = all.filter((s) => !s.status && s.C > 0.004 && (s.H < 70 || s.H > 88));
  console.log("\nnon-status surfaces outside the warm family:");
  for (const s of offending) console.log(`  ${s.c}  H ${s.H}  C ${s.C}  ×${s.n}  ${s.sample}`);
  expect(offending.map((s) => `${s.c} (${s.sample})`), "a pink or sage surface survives outside the status components").toEqual([]);
});
