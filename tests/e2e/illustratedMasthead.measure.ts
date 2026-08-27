/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ILLUSTRATED MASTHEAD — A TRIAL ON ONE PAGE, LOCKED AS ONE PAGE.
 *
 * ⚠️ THE POINT OF EVERY CASE HERE IS THE POPULATION. A trial that quietly becomes two pages is no
 * longer a trial, and a treatment that quietly stops applying is a revert nobody decided. Both
 * directions are asserted: Packages has artwork, the other nine do not, and the count is exact.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";

const PAGES: { name: string; route: string; cls: string }[] = [
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg"   },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Discover",            route: "/agents/discover",      cls: "dv-wpg"   },
  { name: "Manuscripts",         route: "/manuscripts",          cls: "msv-wpg"  },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg" },
  { name: "To-do list",          route: "/todo",                 cls: "tpl-wpg"  },
  { name: "Calendar",            route: "/todo/calendar",        cls: "tpl-wpg"  },
  { name: "Noteboard",           route: "/todo/noteboard",       cls: "tpl-wpg"  },
];
const TRIAL = "Submission packages";

const readBand = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const ch = g.querySelector(".wpg-chrome") as HTMLElement;
  const cs = getComputedStyle(ch);
  const af = getComputedStyle(ch, "::after");
  return {
    /* the artwork lives on the pseudo-element; the band's own image is the wash's gradient */
    artwork: af.backgroundImage,
    hasArtwork: /url\(/.test(af.backgroundImage),
    pointerEvents: af.pointerEvents,
    bandBg: cs.backgroundColor,
    bandImg: cs.backgroundImage,
    sticky: cs.position,
    type: g.getAttribute("data-wpg-type"),
    settleOn: g.getAttribute("data-wpg-settle"),
    toolbandBg: (() => { const b = g.querySelector(".wpg-toolband") as HTMLElement | null; return b ? getComputedStyle(b).backgroundColor : null; })(),
    toolbandArt: (() => { const b = g.querySelector(".wpg-toolband") as HTMLElement | null; return b ? getComputedStyle(b, "::after").backgroundImage : null; })(),
  };
}, cls);

test("⚠️ EXACTLY ONE PAGE CARRIES MASTHEAD ARTWORK — asserted in both directions", async ({ page }) => {
  const lines: string[] = [];
  const withArt: string[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await readBand(page, cls);
    expect(r, `${name}: no grid`).not.toBeNull();
    if (r!.hasArtwork) withArt.push(name);
    lines.push(`${name.padEnd(21)} ${r!.hasArtwork ? "ARTWORK" : "—      "} · band ${r!.bandBg}${r!.toolbandArt && /url\(/.test(r!.toolbandArt) ? " ⚠️ TOOLBAR ARTWORK" : ""}`);
    /* the toolbar never carries artwork, on any page — the trial is a masthead treatment */
    if (r!.toolbandArt) {
      expect(/url\(/.test(r!.toolbandArt), `${name}: its toolbar band carries artwork — the trial is the masthead's alone`).toBe(false);
    }
  }
  console.log("\n══ MASTHEAD ARTWORK (1440)\n" + lines.join("\n"));
  /* ⚠️ THE EXACT SET, NOT A COUNT. `toHaveLength(1)` would pass the day the artwork moved to a
     different page, which is a decision nobody took and nobody would see. */
  expect(withArt, "masthead artwork is not on exactly the trial page").toEqual([TRIAL]);
});

for (const width of [1280, 1440, 2300]) {
  test(`⚠️ NO TEXT SITS ON PAINTED ARTWORK — both postures — ${width}`, async ({ page }) => {
    await openRoute(page, "/manuscripts/packages", { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(900);
    const lines: string[] = [];
    for (const posture of ["rest", "settled"] as const) {
      if (posture === "settled") {
        const moved = await page.evaluate(async () => {
          const g = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
          const sc = g.querySelector(".wpg-scroll") as HTMLElement;
          if (sc.scrollHeight - sc.clientHeight < 120) return false;
          for (let t = 0; t <= 400; t += 20) { sc.scrollTop = t; await new Promise((r) => requestAnimationFrame(r)); }
          return true;
        });
        if (!moved) { lines.push(`  ${posture}: the page cannot scroll here — posture not exercised`); continue; }
        await page.waitForTimeout(800);
      }
      const geo = await page.evaluate(() => {
        const g = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        const ch = g.querySelector(".wpg-chrome") as HTMLElement;
        const b = ch.getBoundingClientRect();
        const ink = (sel: string) => {
          const el = g.querySelector(sel) as HTMLElement | null;
          if (!el || !el.getBoundingClientRect().height) return null;
          const r = document.createRange(); r.selectNodeContents(el);
          const rects = [...r.getClientRects()];
          if (!rects.length) return null;
          return { right: Math.round(Math.max(...rects.map((x) => x.right))), y: Math.round(rects[0].top + rects[0].height / 2) };
        };
        return { band: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }, title: ink(".wsh-title"), sub: ink(".wsh-sub") };
      });
      const png = readPng(await page.screenshot({ clip: { x: geo.band.x, y: geo.band.y, width: geo.band.w, height: geo.band.h } }));
      const at = (ax: number, ay: number) => png.at(Math.min(Math.max(ax - geo.band.x, 0), png.width - 1), Math.min(Math.max(ay - geo.band.y, 0), png.height - 1)).join(",");
      /* the ground, taken at the far left where the mask is fully transparent by construction */
      const ground = at(geo.band.x + 6, geo.band.y + Math.round(geo.band.h / 2));
      for (const [what, k] of [["title", geo.title], ["description", geo.sub]] as const) {
        if (!k) { lines.push(`  ${posture}: no ${what} rendered`); continue; }
        /**
         * ⚠️ JUST PAST THE LAST GLYPH, NOT ON IT — sampling ON the glyph returns the TEXT'S OWN INK
         * (116,111,109 for the title), so the first version of this compared the title's colour
         * against the band's ground and failed on a page where the mask was working perfectly. The
         * claim is about what is painted BEHIND the text, so the sample is taken immediately beyond
         * where the text ends, on the same line — the strictest point that is still background.
         */
        const painted = at(k.right + 3, k.y);
        lines.push(`  ${posture.padEnd(7)} ${what.padEnd(11)} last glyph x${k.right} → ${painted} (ground ${ground})`);
        /**
         * ⚠️ THE GROUND EXACTLY, NOT "CLOSE TO IT". The mask's job is that the artwork is FULLY
         * transparent where text sits — a pixel a few units off the ground is artwork showing
         * through faintly, which is precisely the state this is written to forbid.
         */
        expect(painted, `${posture}: painted artwork reaches the ${what}'s last glyph — the mask does not clear the text`).toBe(ground);
      }
    }
    console.log(`\n══ TEXT CLEARS THE ARTWORK — ${width}\n` + lines.join("\n"));
    expect(lines.filter((l) => l.includes("last glyph")).length, "no glyph was sampled").toBeGreaterThan(1);
  });
}

test("⚠️ THE TRIAL CHANGES NO BEHAVIOUR — Packages answers like every other Type A page", async ({ page }) => {
  const rows: { name: string; sticky: string; type: string | null; settleOn: string | null; toolband: string | null }[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await readBand(page, cls))!;
    rows.push({ name, sticky: r.sticky, type: r.type, settleOn: r.settleOn, toolband: r.toolbandBg });
  }
  const trial = rows.find((r) => r.name === TRIAL)!;
  const peers = rows.filter((r) => r.type === "pinned" && r.name !== TRIAL);
  console.log("\n══ BEHAVIOUR (1440)\n" + rows.map((r) => `${r.name.padEnd(21)} ${String(r.type).padEnd(7)} · ${r.sticky} · settles on ${r.settleOn}`).join("\n"));
  expect(peers.length, "no peer pinned pages to compare against").toBeGreaterThan(4);
  /* the treatment is paint: the type, the stickiness and the settle binding all read as a peer's */
  expect(trial.type, "the trial page changed header type").toBe("pinned");
  expect(trial.sticky, "the trial page's slab stopped being sticky").toBe(peers[0].sticky);
  expect(trial.settleOn, "the trial page's settle is bound differently from its peers").toBe(peers[0].settleOn);
});
