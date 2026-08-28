/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ILLUSTRATED MASTHEAD — A TRIAL ON TWO PAGES, LOCKED AS TWO PAGES.
 *
 * ⚠️ THE POINT OF EVERY CASE HERE IS THE POPULATION. A trial that quietly becomes two pages is no
 * longer a trial, and a treatment that quietly stops applying is a revert nobody decided. Both
 * directions are asserted: the two named pages have artwork, the other eight do not, and the SET
 * is exact — not the count, so moving the trial to a different page fails as loudly as spreading it.
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
/**
 * ⚠️ TWO PAGES NOW, AND THE NUMBER IS THE GATE. The trial began on Submission packages and Query
 * Centre joined it deliberately. The SET is asserted rather than a count, so neither moving the
 * artwork to a different page nor a third page joining can pass — someone has to edit this list and
 * read this paragraph.
 *
 * ⚠️ AND THE TWO ARE DIFFERENT HEADER TYPES, which is why the behaviour case below compares each
 * against its OWN peers rather than against one another: Packages is Type A and its band is sticky,
 * Query Centre is Type B and its band is static.
 */
const TRIAL = ["Submission packages", "Query Centre"];

const readBand = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const ch = g.querySelector(".wpg-chrome") as HTMLElement;
  const cs = getComputedStyle(ch);
  /**
   * ⚠️ THE ARTWORK IS LOOKED FOR ON EITHER HOST, because it has now lived on both. It began on the
   * slab and moved into the MEASURE — the box the text lives in — so that the ground and the
   * illustration share a coordinate space with the title. A lock that named one element would have
   * reported "no page carries artwork" after a move that changed nothing about the claim.
   */
  const mastEl = g.querySelector(".wpg-mast") as HTMLElement;
  const slabAfter = getComputedStyle(ch, "::after");
  const mastAfter = getComputedStyle(mastEl, "::after");
  const af = /url\(/.test(mastAfter.backgroundImage) ? mastAfter : slabAfter;
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
  expect(withArt.slice().sort(), "masthead artwork is not on exactly the trial pages").toEqual(TRIAL.slice().sort());
});

const TRIAL_ROUTES: { name: string; route: string; cls: string }[] = [
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg" },
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg"   },
];

for (const width of [1280, 1440, 1920, 2560]) {
 for (const trial of TRIAL_ROUTES) {
  test(`⚠️ NO TEXT SITS ON PAINTED ARTWORK — ${trial.name} — ${width}`, async ({ page }) => {
    await openRoute(page, trial.route, { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(900);
    const lines: string[] = [];
    for (const posture of ["rest", "settled"] as const) {
      if (posture === "settled") {
        const moved = await page.evaluate(async (c) => {
          const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
          const sc = g.querySelector(".wpg-scroll") as HTMLElement;
          if (sc.scrollHeight - sc.clientHeight < 120) return false;
          for (let t = 0; t <= 400; t += 20) { sc.scrollTop = t; await new Promise((r) => requestAnimationFrame(r)); }
          return true;
        }, trial.cls);
        if (!moved) { lines.push(`  ${posture}: the page cannot scroll here — posture not exercised`); continue; }
        await page.waitForTimeout(800);
      }
      const geo = await page.evaluate((c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
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
      }, trial.cls);
      /**
       * ⚠️ THE BAND PHOTOGRAPHED WITH THE ARTWORK OFF AND ON, NOT AGAINST ONE "GROUND" COLOUR — and
       * the single-colour form broke the moment a page's ground became a GRADIENT. It sampled the
       * far left as "the ground" and compared the text's surroundings to it; with a two-colour
       * ground those are different colours by design, so it reported artwork over the title on a
       * band where the mask was working perfectly.
       *
       * Switching the pseudo-element's opacity to 0 and back gives the ground exactly as painted at
       * every x, with no modelling of the gradient and nothing assumed about what the band is filled
       * with. The claim becomes what it always meant: at the text, the band looks the same whether
       * the artwork is there or not.
       */
      const clip = { x: geo.band.x, y: geo.band.y, width: geo.band.w, height: geo.band.h };
      await page.addStyleTag({ content: `.wpg .wpg-chrome::after { opacity: 0 !important; }` });
      await page.waitForTimeout(120);
      const bare = readPng(await page.screenshot({ clip }));
      await page.locator("style").last().evaluate((e) => e.remove());
      await page.waitForTimeout(160);
      const png = readPng(await page.screenshot({ clip }));
      const at = (ax: number, ay: number) => png.at(Math.min(Math.max(ax - geo.band.x, 0), png.width - 1), Math.min(Math.max(ay - geo.band.y, 0), png.height - 1)).join(",");
      const bareAt = (ax: number, ay: number) => bare.at(Math.min(Math.max(ax - geo.band.x, 0), png.width - 1), Math.min(Math.max(ay - geo.band.y, 0), png.height - 1)).join(",");
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
        const ground = bareAt(k.right + 3, k.y);
        lines.push(`  ${posture.padEnd(7)} ${what.padEnd(11)} last glyph x${k.right} → ${painted} (ground there ${ground})`);
        /**
         * ⚠️ THE GROUND EXACTLY, NOT "CLOSE TO IT". The mask's job is that the artwork is FULLY
         * transparent where text sits — a pixel a few units off the ground is artwork showing
         * through faintly, which is precisely the state this is written to forbid.
         */
        expect(painted, `${posture}: painted artwork reaches the ${what}'s last glyph — the band differs there with the artwork on`).toBe(ground);
      }
    }
    console.log(`\n══ TEXT CLEARS THE ARTWORK — ${trial.name} — ${width}\n` + lines.join("\n"));
    expect(lines.filter((l) => l.includes("last glyph")).length, "no glyph was sampled").toBeGreaterThan(1);
  });
 }
}

test("⚠️ THE TRIAL CHANGES NO BEHAVIOUR — Packages answers like every other Type A page", async ({ page }) => {
  const rows: { name: string; sticky: string; type: string | null; settleOn: string | null; toolband: string | null }[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await readBand(page, cls))!;
    rows.push({ name, sticky: r.sticky, type: r.type, settleOn: r.settleOn, toolband: r.toolbandBg });
  }
  const trials = rows.filter((r) => TRIAL.includes(r.name));
  console.log("\n══ BEHAVIOUR (1440)\n" + rows.map((r) => `${r.name.padEnd(21)} ${String(r.type).padEnd(7)} · ${r.sticky} · settles on ${r.settleOn}`).join("\n"));
  /**
   * ⚠️ EACH TRIAL PAGE AGAINST ITS OWN TYPE'S PEERS, never against the other trial page. The two
   * are deliberately different header types — Packages pins and settles, Query Centre is static —
   * so a comparison between them would assert that a Type B page behaves like a Type A one, which
   * is a claim nobody wants and which the header contract forbids.
   */
  expect(trials.length, "a trial page did not render").toBe(TRIAL.length);
  for (const t of trials) {
    /**
     * ⚠️ THE TYPE'S CONTRACT, NOT A PEER — and the peer form broke the day Manuscripts changed type.
     * It compared each treated page against an untreated page of the same type, which is fine until
     * a type has only one page: Query Centre is now the ONLY Type B page (Manuscripts reads `pinned`
     * where it used to read `static`, by another stream's change), so treating it left nothing to
     * compare against and the case failed for want of a sample rather than for a fault.
     *
     * The contract needs no sample. Type A pins; Type B sits in flow and does not. That is the
     * canonical rule, and asserting it directly is both stronger and immune to the census shifting.
     */
    if (t.type === "pinned") {
      expect(t.sticky, `${t.name} is Type A and its band is not sticky — the trial changed its behaviour`).toBe("sticky");
      expect(t.settleOn, `${t.name} is Type A and names no primary scroller`).toBeTruthy();
    } else {
      expect(t.sticky, `${t.name} is Type B and its band went sticky — the trial changed its behaviour`).not.toBe("sticky");
      expect(t.settleOn, `${t.name} is Type B and has acquired a settle binding`).toBeFalsy();
    }
    /* and where untreated peers of the same type DO exist, the treated page still matches them */
    const peers = rows.filter((r) => r.type === t.type && !TRIAL.includes(r.name));
    if (peers.length) {
      expect(t.sticky, `${t.name}: its band's positioning differs from untreated pages of the same type`).toBe(peers[0].sticky);
      expect(t.settleOn, `${t.name}: its settle is bound differently from untreated pages of the same type`).toBe(peers[0].settleOn);
    }
  }
});


/**
 * ══ THE TINT FADES, IT DOES NOT STEP ══════════════════════════════════════════════════════════
 *
 * ⚠️ A NON-MONOTONIC PAIR OF GRADIENT STOPS IS NOT AN ERROR — CSS CLAMPS THE LATER ONE UP TO ITS
 * PREDECESSOR, and the result is a hard vertical line where a fade was written. It happened here:
 * the two stops arrived transposed, both resolved to 458, and the band painted solid 242,228,221 to
 * offset 450 and 253,249,246 at 458. Every declaration was valid, the build was green, and the only
 * way to see it was to look.
 *
 * ⚠️ SO THE CLAIM IS THE SHAPE OF THE TRANSITION, NOT THE STOP VALUES. Sampling the row across the
 * tint's own range, the biggest single step between adjacent samples must be a small fraction of
 * the whole change — a fade spreads its difference over its length, a clamped pair delivers all of
 * it between two neighbouring pixels. Asserting the token values instead would pass on exactly the
 * fault, because the values were right and their ORDER was not.
 */
/* ⚠️ THE PAGES THAT HAVE A TINT — Packages took a plain ground with its accent bar, so it has no
   fade to check and asserting one there would fail on a correct page. Named rather than skipped,
   and its length asserted below, so the day the trial's grounds converge again someone has to
   edit this and read the sentence. */
const TINTED = ["Query Centre"];

for (const width of [1280, 2560]) {
 for (const trial of TRIAL_ROUTES.filter((t) => TINTED.includes(t.name))) {
  test(`⚠️ THE TINT FADES RATHER THAN STEPPING — ${trial.name} — ${width}`, async ({ page }) => {
    await openRoute(page, trial.route, { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(700);
    const geo = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const ch = g.querySelector(".wpg-chrome") as HTMLElement;
      const b = ch.getBoundingClientRect();
      /* the tint's own two stops, resolved through a probe — `getPropertyValue` on a `calc()`
         hands back its TEXT, which parses to NaN */
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:0";
      ch.appendChild(probe);
      const px = (v: string) => { probe.style.width = v; return probe.getBoundingClientRect().width; };
      const gndB = px("var(--illo-gnd-b)"), gndA = px("var(--illo-gnd-a)");
      probe.remove();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), gndB, gndA };
    }, trial.cls);

    /* ⚠️ MONOTONIC FIRST — the precondition, asserted before the shape, because a transposed pair
       makes the whole range zero-length and every sample identical, which a "gradual" test passes. */
    expect(geo.gndA, `${trial.name}: the tint's stops are not in ascending order (gnd-b ${geo.gndB} → gnd-a ${geo.gndA}) — CSS will clamp them into one hard edge`).toBeGreaterThan(geo.gndB + 20);

    /* the artwork off, so this is a question about the GROUND alone */
    await page.addStyleTag({ content: `.wpg .wpg-chrome::after { opacity: 0 !important; }` });
    await page.waitForTimeout(140);
    const png = readPng(await page.screenshot({ clip: { x: geo.x, y: geo.y, width: geo.w, height: geo.h } }));
    await page.locator("style").last().evaluate((e) => e.remove());

    /* a row clear of the window's corner arc and clear of the text's own line */
    const row = Math.min(png.height - 3, 6);
    const red = (px: number) => png.at(Math.min(Math.max(px, 0), png.width - 1), row)[0];
    const from = Math.round(geo.gndB), to = Math.round(geo.gndA);
    const samples: number[] = [];
    const step = Math.max(2, Math.round((to - from) / 40));
    for (let x = from; x <= to; x += step) samples.push(red(x));
    const total = Math.abs(samples[0] - samples[samples.length - 1]);
    let biggest = 0, atX = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const d = Math.abs(samples[i] - samples[i - 1]);
      if (d > biggest) { biggest = d; atX = from + i * step; }
    }
    console.log(`\n══ TINT FADE — ${trial.name} — ${width}\n   stops ${from} → ${to} · ${samples.length} samples · total change ${total} · biggest single step ${biggest} at x${atX}`);
    expect(total, `${trial.name}: the tint does not change across its own range — there is no fade to check`).toBeGreaterThan(6);
    expect(biggest, `${trial.name}: the tint changes by ${biggest} of its total ${total} between two adjacent samples at x${atX} — that is a step, not a fade`).toBeLessThan(Math.max(3, total / 3));
  });
 }
}

/**
 * ══ THE 47px TITLE'S LINE BOX ═════════════════════════════════════════════════════════════════
 *
 * ⚠️ NOT `scrollHeight === clientHeight`, AND THAT IS A CORRECTION RATHER THAN A SHORTCUT. On an
 * `overflow: visible` box `scrollHeight` reports the union of the content box and anything spilling
 * out of it, and Playfair's ascent plus descent exceed the line box at any leading below ~1.15 —
 * measured here, the title reads 62 against 61 at a leading of 1.30 with nothing clipped anywhere.
 * That reading is a false red on a correct page, and taking it at face value would have "fixed" a
 * fault that does not exist.
 *
 * ⚠️ THE INSTRUMENT THAT IS ALWAYS RIGHT IS INK AGAINST A CLIPPING ANCESTOR: the union of the
 * element's own text rects, against the box of the first ancestor whose overflow is not visible.
 * `.wpg-mast` really does clip on a Type B page — it is the fold's own animation — so the question
 * is a real one, and this is the only form that answers it.
 */
for (const posture of ["rest", "settled"] as const) {
 for (const trial of TRIAL_ROUTES) {
  test(`⚠️ THE TITLE'S INK IS NOT CLIPPED — ${trial.name} — ${posture}`, async ({ page }) => {
    await openRoute(page, trial.route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(700);
    if (posture === "settled") {
      const moved = await page.evaluate(async (c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        const sc = g.querySelector(".wpg-scroll") as HTMLElement;
        if (sc.scrollHeight - sc.clientHeight < 120) return false;
        for (let t = 0; t <= 400; t += 20) { sc.scrollTop = t; await new Promise((r) => requestAnimationFrame(r)); }
        return true;
      }, trial.cls);
      if (!moved) { console.log(`   ${trial.name}: cannot settle — Type B, posture not exercised`); return; }
      await page.waitForTimeout(700);
    }
    const out = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const wsh = g.querySelector(".wsh") as HTMLElement;
      return [".wsh-title", ".wsh-sub"].map((sel) => {
        const el = wsh.querySelector(sel) as HTMLElement | null;
        if (!el || !el.getBoundingClientRect().height) return { sel, absent: true } as any;
        let top = Infinity, bot = -Infinity;
        const walk = (n: Node) => {
          if (n.nodeType === 3 && (n.textContent || "").trim()) {
            const rg = document.createRange(); rg.selectNodeContents(n);
            for (const r of rg.getClientRects()) if (r.height > 0) { top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); }
          }
          n.childNodes.forEach(walk);
        };
        walk(el);
        let anc: HTMLElement | null = el.parentElement, clip: any = null;
        while (anc) {
          const cs = getComputedStyle(anc);
          if (!/^visible/.test(cs.overflowY) || !/^visible/.test(cs.overflowX)) {
            const b = anc.getBoundingClientRect();
            clip = { cls: String(anc.className).slice(0, 30), top: b.top, bot: b.bottom };
            break;
          }
          anc = anc.parentElement;
        }
        const own = getComputedStyle(el);
        return { sel, fs: own.fontSize, lh: own.lineHeight, ink: { top, bot }, clip,
                 over: clip ? Math.max(0, +(clip.top - top).toFixed(1), +(bot - clip.bot).toFixed(1)) : 0 };
      });
    }, trial.cls);
    console.log(`\n══ TITLE INK vs CLIPPER — ${trial.name} — ${posture}\n` +
      out.map((o: any) => o.absent ? `   ${o.sel}: absent` :
        `   ${o.sel.padEnd(11)} ${o.fs}/${o.lh} · ink ${o.ink.top.toFixed(1)}→${o.ink.bot.toFixed(1)} · clipper ${o.clip ? `${o.clip.cls} ${o.clip.top.toFixed(1)}→${o.clip.bot.toFixed(1)}` : "none"} · over ${o.over}`).join("\n"));
    const present = out.filter((o: any) => !o.absent);
    expect(present.length, "neither the title nor the description rendered — nothing was checked").toBeGreaterThan(0);
    for (const o of present as any[]) {
      expect(o.over, `${trial.name} ${posture}: ${o.sel}'s ink overflows its clipping ancestor (${o.clip?.cls}) by ${o.over}px at ${o.fs}/${o.lh}`).toBeLessThanOrEqual(0.5);
    }
  });
 }
}


test("⚠️ THE TINTED SET IS ONE PAGE — Packages carries an accent bar and a plain ground instead", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(600);
  expect(TINTED, "the number of trial pages carrying a horizontal tint has changed").toHaveLength(1);
  expect(TINTED.every((n) => TRIAL.includes(n)), "a tinted page is not on the trial list at all").toBe(true);
  /* ⚠️ AND THE UNTINTED ONE IS ASSERTED TO BE UNTINTED, or the list above is a claim about nothing.
     A horizontal gradient is what the accent bar replaced; the shared wash's vertical one is a
     different thing and only ever appears when the band is settled. */
  const img = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.pkgw-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    return getComputedStyle(g.querySelector(".wpg-chrome") as HTMLElement).backgroundImage;
  });
  expect(img, `Submission packages' resting band still paints a gradient (${img}) — the tint was meant to go with the accent bar`).toBe("none");
});
