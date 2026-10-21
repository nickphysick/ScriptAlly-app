/**
 * About page v1 — the public /about page as built from design-refs/about-page-v1/about-page-v1.html.
 * Locks A1–A6, each read on the rendered page at 1512×900, 1280×800 and 390×844.
 *
 *   A1  the headline is three spans, each one line tall at desktop; inside the viewport at 390
 *   A2  the skills-gap band is --mk-navy and spans the sheet
 *   A3  the bands alternate at 1512; at 390 every band's copy is above its plate
 *   A4  in the founder's note and the closing card no text overlaps text or a plate
 *   A5  no horizontal page overflow at any width
 *   A6  four plates, each with a non-empty data-brief and a visible caption
 *
 * The page needs no sign-in, so it is opened directly (`waitUntil: "load"`, never `networkidle`).
 *
 *   ABOUT_MUTATE=<lock>  inject that lock's named break into the page, to prove the lock goes red.
 *                        The break is a stylesheet added at runtime: no source file is edited.
 *
 * Every reading states its population first, and the run must reach MIN_ASSERTIONS or it fails:
 * a sweep over nothing passes, and says nothing.
 */
import { test, expect, Page } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const VPS = {
  w1512: { width: 1512, height: 900 },
  w1280: { width: 1280, height: 800 },
  w390: { width: 390, height: 844 },
};
const MUTATE = process.env.ABOUT_MUTATE ?? "";

/** Each lock's named break. */
const MUTATIONS: Record<string, string> = {
  A1: ".mk-astl{white-space:normal!important}.mk-scope .mk-ast{font-size:120px!important}",
  A2: ".mk-agap{background:#ffffff!important}",
  A3: ".mk-band--copyfirst .mk-aplate{order:0!important}",
  A4: ".mk-note{position:relative!important}.mk-noteart{position:absolute!important;top:0!important}",
  A5: ".mk-band{min-width:1700px!important}",
  A5b: "html:has(.mk-scope),body:has(.mk-scope){overflow-x:visible!important}" +
       ".mk-sheet{overflow:visible!important}.mk-band{min-width:1700px!important}",
  A6: ".mk-aplatetag{display:none!important}",
};

/** The run's floor. Counted per test and summed in afterAll. */
const MIN_ASSERTIONS = 60;
let assertions = 0;
function check(cond: boolean, msg: string) {
  assertions++;
  expect(cond, msg).toBe(true);
}

/* A public page: no session, so no saved sign-in is read (the project's default storageState). */
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeAll(async () => { await assertLocalBundleIsDev(); });

test.afterAll(() => {
  console.log(`aboutV1: ${assertions} assertions${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
  if (MUTATE) return;
  expect(assertions, `the run made ${assertions} assertions; it must reach ${MIN_ASSERTIONS}`).toBeGreaterThanOrEqual(MIN_ASSERTIONS);
});

async function open(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.goto("/about", { waitUntil: "load" });
  await page.waitForSelector("h1.mk-ast");
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important;animation:none!important}" +
      "html{scroll-behavior:auto!important}",
  });
  /* An unknown name must not run as an unmutated page and report a clean pass. */
  if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`ABOUT_MUTATE=${MUTATE} names no mutation`);
  if (MUTATE) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
  await page.evaluate(() => (document as Document).fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
}

test("A1 the headline: three spans, one line each at desktop, inside the viewport at 390", async ({ page }) => {
  for (const vp of [VPS.w1512, VPS.w1280]) {
    await open(page, vp);
    const r = await page.evaluate(() => {
      const h1s = [...document.querySelectorAll("h1.mk-ast")];
      const h1 = h1s[0] as HTMLElement | undefined;
      const spans = h1 ? [...h1.querySelectorAll(".mk-astl")] as HTMLElement[] : [];
      return {
        h1Count: h1s.length,
        spans: spans.map((s) => ({
          text: (s.textContent ?? "").trim(),
          h: s.getBoundingClientRect().height,
          lh: parseFloat(getComputedStyle(s).lineHeight),
        })),
      };
    });
    check(r.h1Count === 1, `${vp.width}: expected one h1.mk-ast, found ${r.h1Count}`);
    check(r.spans.length === 3, `${vp.width}: expected three .mk-astl, found ${r.spans.length}`);
    expect(r.spans.map((s) => s.text)).toEqual(["We want to", "get good", "stories told."]);
    assertions++;
    for (const s of r.spans) {
      check(Number.isFinite(s.lh) && s.lh > 0, `${vp.width}: "${s.text}" has no resolvable line-height`);
      check(s.h > 0 && s.h < 1.5 * s.lh, `${vp.width}: "${s.text}" is ${s.h.toFixed(1)}px tall against a ${s.lh.toFixed(1)}px line — it wrapped`);
    }
  }
  await open(page, VPS.w390);
  const m = await page.evaluate(() => {
    const h1 = document.querySelector("h1.mk-ast") as HTMLElement | null;
    const b = h1?.getBoundingClientRect();
    return {
      present: !!h1,
      left: b?.left ?? -1, right: b?.right ?? 1e9, width: b?.width ?? 0,
      sw: h1?.scrollWidth ?? 0, cw: h1?.clientWidth ?? 0, vw: window.innerWidth,
    };
  });
  check(m.present && m.width > 0, "390: the h1 is not rendered");
  check(m.left >= 0 && m.right <= m.vw, `390: the h1 runs outside the viewport (${m.left.toFixed(1)}–${m.right.toFixed(1)} of ${m.vw})`);
  check(m.sw <= m.cw + 1, `390: the h1 overflows its own box (${m.sw} > ${m.cw})`);
});

test("A2 the skills gap sits on --mk-navy across the sheet", async ({ page }) => {
  for (const vp of Object.values(VPS)) {
    await open(page, vp);
    const r = await page.evaluate(() => {
      const band = document.querySelector(".mk-agap") as HTMLElement | null;
      const probe = document.createElement("div");
      const scope = band?.closest(".mk-scope") ?? document.body;
      probe.style.background = "var(--mk-navy)";
      scope.appendChild(probe);
      const navy = getComputedStyle(probe).backgroundColor;
      const token = getComputedStyle(scope).getPropertyValue("--mk-navy").trim();
      probe.remove();
      const sheet = (band?.closest(".mk-sheet") as HTMLElement | null) ?? document.documentElement;
      const bb = band?.getBoundingClientRect();
      const sb = sheet.getBoundingClientRect();
      return {
        present: !!band, token, navy,
        bg: band ? getComputedStyle(band).backgroundColor : "",
        bandL: bb?.left ?? 0, bandW: bb?.width ?? 0,
        sheetL: sb.left, sheetW: sheet === document.documentElement ? sheet.clientWidth : sb.width,
      };
    });
    check(r.present, `${vp.width}: no .mk-agap`);
    check(r.token.length > 0, `${vp.width}: --mk-navy does not resolve`);
    check(r.navy !== "rgba(0, 0, 0, 0)" && r.navy !== "", `${vp.width}: --mk-navy paints nothing (${r.navy})`);
    check(r.bg === r.navy, `${vp.width}: the band is ${r.bg}, not --mk-navy ${r.navy}`);
    check(Math.abs(r.bandL - r.sheetL) <= 1 && Math.abs(r.bandW - r.sheetW) <= 1,
      `${vp.width}: the band is ${r.bandW.toFixed(1)} at x ${r.bandL.toFixed(1)}; the sheet is ${r.sheetW.toFixed(1)} at x ${r.sheetL.toFixed(1)}`);
  }
});

async function bandSides(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll(".mk-band")].map((b) => {
    const plate = b.querySelector(".mk-aplate")?.getBoundingClientRect();
    const copy = b.querySelector(".mk-bandcopy")?.getBoundingClientRect();
    return plate && copy
      ? { ok: true, plateX: plate.left, copyX: copy.left, plateY: plate.top, copyY: copy.top, copyBottom: copy.bottom }
      : { ok: false, plateX: 0, copyX: 0, plateY: 0, copyY: 0, copyBottom: 0 };
  }));
}

test("A3 the bands alternate at desktop and put the copy first when stacked", async ({ page }) => {
  await open(page, VPS.w1512);
  const d = await bandSides(page);
  check(d.length === 3, `1512: expected three vision bands, found ${d.length}`);
  d.forEach((b, i) => {
    check(b.ok, `1512: band ${i + 1} lacks a plate or copy`);
    if (i === 1) check(b.plateX > b.copyX, `1512: band 2's plate (x ${b.plateX.toFixed(1)}) is not right of its copy (x ${b.copyX.toFixed(1)})`);
    else check(b.plateX < b.copyX, `1512: band ${i + 1}'s plate (x ${b.plateX.toFixed(1)}) is not left of its copy (x ${b.copyX.toFixed(1)})`);
  });
  await open(page, VPS.w390);
  const m = await bandSides(page);
  check(m.length === 3, `390: expected three vision bands, found ${m.length}`);
  m.forEach((b, i) => {
    check(b.ok, `390: band ${i + 1} lacks a plate or copy`);
    check(b.copyBottom <= b.plateY + 1, `390: band ${i + 1}'s copy (to ${b.copyBottom.toFixed(1)}) is not above its plate (from ${b.plateY.toFixed(1)})`);
  });
});

test("A4 no text overlaps text or a plate in the note and the closing card", async ({ page }) => {
  for (const vp of Object.values(VPS)) {
    await open(page, vp);
    const r = await page.evaluate(() => {
      type Box = { kind: string; label: string; l: number; t: number; r: number; b: number };
      const boxes: Box[] = [];
      for (const sel of [".mk-note", ".mk-aclose"]) {
        const root = document.querySelector(sel);
        if (!root) continue;
        for (const p of root.querySelectorAll(".mk-aplate")) {
          const b = p.getBoundingClientRect();
          if (b.width > 0 && b.height > 0) boxes.push({ kind: "plate", label: sel + " plate", l: b.left, t: b.top, r: b.right, b: b.bottom });
        }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const text = (n.textContent ?? "").trim();
          if (!text) continue;
          const el = n.parentElement;
          if (!el || el.closest(".mk-aplate")) continue; /* a plate's own caption sits on its plate by design */
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const rc of range.getClientRects()) {
            if (rc.width > 0 && rc.height > 0) boxes.push({ kind: "text", label: text.slice(0, 30), l: rc.left, t: rc.top, r: rc.right, b: rc.bottom });
          }
        }
      }
      const hits: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.kind === "plate" && c.kind === "plate") continue;
        const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l);
        const oy = Math.min(a.b, c.b) - Math.max(a.t, c.t);
        if (ox > 1 && oy > 1) hits.push(`"${a.label}" × "${c.label}" (${ox.toFixed(1)}×${oy.toFixed(1)})`);
      }
      return { n: boxes.length, plates: boxes.filter((b) => b.kind === "plate").length, hits };
    });
    check(r.n >= 8, `${vp.width}: only ${r.n} boxes collected`);
    check(r.plates >= 1, `${vp.width}: the founder's plate was not collected`);
    check(r.hits.length === 0, `${vp.width}: ${r.hits.length} overlaps — ${r.hits.slice(0, 4).join("; ")}`);
  }
});

test("A5 no horizontal page overflow", async ({ page }) => {
  for (const vp of Object.values(VPS)) {
    await open(page, vp);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      /* aria-hidden decoration (the plates' brush washes) is left out: spilling past the edge into
         the clip is what the clip is for. Measured: at 390 the founder's wash, rotated and scaled
         1.3x, runs from -8 to 398 and is cut by .mk-sheet, invisibly. */
      const els = ([...document.querySelectorAll("main *")] as HTMLElement[])
        .filter((e) => !e.closest('[aria-hidden="true"]'));
      const out = els.filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.right > vw + 1 || b.left < -1);
      }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${e.getBoundingClientRect().left.toFixed(0)}–${e.getBoundingClientRect().right.toFixed(0)}`);
      return {
        sw: document.documentElement.scrollWidth, iw: window.innerWidth, vw,
        bands: document.querySelectorAll(".mk-band").length, n: els.length, out,
      };
    });
    check(r.bands === 3, `${vp.width}: the page did not render its bands (${r.bands})`);
    check(r.sw <= r.iw, `${vp.width}: the page is ${r.sw}px wide in a ${r.iw}px window`);
    /* ⚠️ THE LINE ABOVE CANNOT GO RED ON ITS OWN HERE. marketing.css sets `overflow-x: clip` on html
       and body for every public page (on purpose: decorations spill off the edge without a scrollbar),
       so a page whose content runs 1,700px wide still reports scrollWidth === innerWidth. Measured
       under ABOUT_MUTATE=A5. The reading that can fail is the ink: no element in <main> reaches past
       the window's edge. ABOUT_MUTATE=A5b lifts both clips (html/body and .mk-sheet's `overflow: clip`) to prove the
       scrollWidth reading too. */
    check(r.n > 20, `${vp.width}: only ${r.n} elements in <main>`);
    check(r.out.length === 0, `${vp.width}: ${r.out.length} elements run past the ${r.vw}px edge — ${r.out.slice(0, 4).join("; ")}`);
  }
});

test("A6 four plates, each with a brief and a visible caption", async ({ page }) => {
  for (const vp of Object.values(VPS)) {
    await open(page, vp);
    const r = await page.evaluate(() => [...document.querySelectorAll(".mk-aplate")].map((p) => {
      const tag = p.querySelector(".mk-aplatetag") as HTMLElement | null;
      const tb = tag?.getBoundingClientRect();
      const cs = tag ? getComputedStyle(tag) : null;
      return {
        slot: p.getAttribute("data-illo") ?? "",
        brief: (p.getAttribute("data-brief") ?? "").trim(),
        caption: (tag?.textContent ?? "").trim(),
        visible: !!tb && tb.width > 0 && tb.height > 0 && cs?.visibility !== "hidden" && Number(cs?.opacity ?? 0) > 0,
      };
    }));
    check(r.length === 4, `${vp.width}: expected four plates, found ${r.length}`);
    for (const p of r) {
      check(p.brief.length > 0, `${vp.width}: plate "${p.slot}" has no data-brief`);
      check(p.caption.length > 0 && p.visible, `${vp.width}: plate "${p.slot}"'s caption is not visible ("${p.caption}")`);
    }
  }
});
