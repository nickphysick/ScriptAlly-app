/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v77 — the DB77 locks, measured on the rendered page (ref design-refs/dashboard-v77/).
 *
 * A1 the chart's row on a tall window · A2 the task card never changes height as it cycles · A3 the
 * columns' bottoms line up and the founding card fills the rest · A4 the width cap · (A5 is the DB71
 * suite, run at the laptop sizes) · C1–C6 the founding writer card · D1 "us", not "Nick".
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB77_MUTATE=<name>` applies a lock's named break in the page.
 *
 * ⚠️ NO REGEX INSIDE `page.evaluate`: strings come back to Node and are matched here.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { FIXTURE_ROWS, Ledger, MUT as MUT77, driveFw, mockSend, openDash, tag, type FwState, type VP } from "./db77Lib";

/* ⚠️ RE-POINTED (Dashboard v116): the founding card is tilted −1.8° at rest, and a rotated element's bounding rect is
   its axis-aligned box — ~6px taller and ~9px wider than the card. These checks are about LAYOUT (bottoms in line,
   heights, spacing above the tab), which a rotation never moves, so they read the card straight. Over the Activity
   feed tab the tilt only helps: rotate(-1.8deg) lifts the card's right-hand edge, which is the edge above the tab. */
const STRAIGHT = `.d58 .d105-fw.d116-tilt { rotate: none !important; transition: none !important; }`;


const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
}, sel);

const TALL: VP[] = [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }, { width: 1680, height: 1050 }];

/* ── A1 — the chart's row on a tall window ────────────────────────────────────────────────────── */

test("DB77 A1 — the chart's row is clamp(300, 31% of the window, 540)", async ({ page }) => {
  const L = new Ledger("a1");
  for (const vp of TALL) {
    await openDash(page, vp);
    const r = await page.evaluate(() => {
      const body = document.querySelector<HTMLElement>('[data-d58="body"]');
      const chart = document.querySelector<HTMLElement>('[data-d58="active"]');
      if (!body || !chart) return null;
      const cs = getComputedStyle(body);
      const bodyW = body.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      return { bodyW, chartH: chart.getBoundingClientRect().height };
    });
    const w = tag(vp);
    L.check("A1", `${w} population: the body and the chart`, !!r && r.bodyW > 0 && r.chartH > 0, JSON.stringify(r));
    if (!r) continue;
    /* ⚠️ 31% OF THE WINDOW: the ref's `31cqw` has no container above it, so it is the viewport (measured in
       the ref: 540 at 1920 and 2560, 521 at 1680). The pack's "31% of the body" was a false premise. */
    const want = Math.min(540, Math.max(300, 0.31 * vp.width));
    L.check("A1", `${w} chart height = clamp(300, 0.31 × ${vp.width}, 540) = ${want.toFixed(1)} (±2)`, Math.abs(r.chartH - want) <= 2, `chart ${r.chartH.toFixed(1)} (body ${r.bodyW.toFixed(1)})`);
  }
  L.done(6);
});

/* ── A2 — the task card never changes height as it cycles ─────────────────────────────────────── */

test("DB77 A2 — the task card is one height for every item", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const vp = { width: 1920, height: 1080 };
  await openDash(page, vp);
  const read = () => page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('[data-d71="task"][data-loading="0"]');
    return c ? { h: c.getBoundingClientRect().height, kind: c.dataset.kind ?? "", index: Number(c.dataset.index ?? -1), pos: c.querySelector('[data-d71="pos-text"]')?.textContent ?? "1 OF 1" } : null;
  });
  const first = await read();
  const n = first ? Number(first.pos.split(" OF ")[1] ?? 1) : 0;
  L.check("A2", "population: the task card holds more than one item", !!first && n > 1, JSON.stringify(first));
  const hs: number[] = [];
  const kinds = new Set<string>();
  for (let i = 0; i < n; i++) {
    const r = await read();
    if (r) { hs.push(r.h); kinds.add(r.kind); }
    await page.locator('[data-d71="next"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(80);
  }
  L.check("A2", "every item of one full cycle was read", hs.length === n, `${hs.length} of ${n}`);
  L.check("A2", "at least two kinds were visited", kinds.size >= 2, [...kinds].join(","));
  const spread = hs.length ? Math.max(...hs) - Math.min(...hs) : Infinity;
  L.check("A2", "the card's height is identical (±1) across the cycle", spread <= 1, `${Math.min(...hs).toFixed(1)}–${Math.max(...hs).toFixed(1)} (spread ${spread.toFixed(1)})`);
  L.done(4);
});

/* ── A3 · A4 — the bottoms line up, the founding card fills the rest, the width cap ──────────── */

test("DB77 A3 · A4 — bottoms in line, founding card ≥194, the content capped", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a3a4");
  for (const vp of [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
    await openDash(page, vp); await page.addStyleTag({ content: STRAIGHT });
    const left = await box(page, '[data-d60="hoops"]');
    const fw = await box(page, '[data-d58="panel"]');
    const body = await box(page, '[data-d58="body"]');
    const head = await box(page, '[data-d58="header"]');
    const tab = await box(page, '[data-d58="tab"]');
    const w = tag(vp);
    L.check("A3", `${w} population: the hoops, the founding card, the body`, !!left && !!fw && !!body && !!head, JSON.stringify({ left: !!left, fw: !!fw, body: !!body }));
    if (left && fw) {
      L.check("A3", `${w} the left and right columns end together (±1)`, Math.abs(left.b - fw.b) <= 1, `hoops ${left.b.toFixed(1)} · founding ${fw.b.toFixed(1)}`);
      L.check("A3", `${w} the founding card is at least 194px`, fw.h >= 193.5, `${fw.h.toFixed(1)}`);
    }
    const cap = vp.width >= 2200 ? 1680 : 1440;
    if (body && head) L.check("A4", `${w} the body and the header are ≤ ${cap}px wide`, body.w <= cap + 0.5 && head.w <= cap + 0.5, `body ${body.w.toFixed(1)} · header ${head.w.toFixed(1)}`);
    L.check("A5", `${w} the Activity feed tab is on screen`, !!tab && tab.l >= 0 && tab.r <= vp.width && tab.b <= vp.height + 0.5 && tab.t >= 0, JSON.stringify(tab));
  }
  L.done(10);
});

/* ── C1–C6 — RETIRED (Dashboard v93): v77's feedback card is replaced by "Your contributions" (DB93 C1–C7). ── */

/* ── D1 — "us", not "Nick", where a writer gives feedback ─────────────────────────────────────── */

test("DB77 D1 — the dock, the help receipt and the help home say us, never Nick", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("d1");
  await mockSend(page, true);
  const vp = { width: 1440, height: 900 };
  const vis = (sel: string) => page.locator(sel).filter({ visible: true }).first();
  const textOf = (sel: string) => page.evaluate((s) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
    /* what a person can see or hear: the text, and the attributes a screen reader or a tooltip speaks (never a data-* hook) */
    const SPOKEN = ["aria-label", "title", "alt", "placeholder"];
    return e ? `${e.innerText} ${[...e.querySelectorAll("*")].flatMap((x) => SPOKEN.map((k) => x.getAttribute(k) ?? "")).join(" ")}` : null;
  }, sel);
  const nick = (t: string | null) => !!t && t.toLowerCase().includes("nick");
  /* the dock, open and then sent */
  await openDash(page, vp);
  await vis(".ws-fbtn, .ws-fbb, .ws-fbi").click();
  await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 }).catch(() => {});
  if (MUT77 === "D1-nick") await page.evaluate(() => { const p = document.querySelector("[data-fb='panel'] p"); if (p) p.textContent = "Every message reaches Nick, the founder."; });
  const open = await textOf("[data-fb='panel']");
  L.check("D1", "population: the dock is open", !!open && open.includes("Tell us what you found"), String(open?.slice(0, 80)));
  L.check("D1", "the open dock names no Nick", !nick(open), String(open?.slice(0, 200)));
  L.check("D1", "the dock says 'Every message reaches our founder.'", !!open && open.includes("Every message reaches our founder."), "");
  await vis("[data-fb='kind'][data-k='An idea']").click();
  await vis("[data-fb='message']").fill("A note from the D1 lock.");
  await vis("[data-fb='send']").click();
  await page.locator("[data-fb='sent']").first().waitFor({ timeout: 8000 }).catch(() => {});
  const done = await textOf("[data-fb='panel']");
  L.check("D1", "population: the dock's sent view", !!done && done.includes("Got it, thank you"), String(done?.slice(0, 80)));
  L.check("D1", "the sent dock names no Nick, and signs as the team", !nick(done) && !!done && done.includes("— The QueryHawk team"), String(done?.slice(0, 200)));
  await page.keyboard.press("Escape");
  /* the help article's receipt */
  await openRoute(page, "/help/list-health", vp);
  await vis("[data-hc='helpful-no']").click();
  await vis("[data-hc='helpful-input']").fill("A worked example would help");
  await vis("[data-hc='helpful-send']").click();
  await vis("[data-hc='helpful-sent']").waitFor({ timeout: 10_000 }).catch(() => {});
  const receipt = await textOf("[data-hc='helpful-sent']");
  L.check("D1", "the help receipt reads 'Thanks. That goes straight to us.'", !!receipt && receipt.trim() === "Thanks. That goes straight to us.", String(receipt));
  /* the help home's no-results line */
  await openRoute(page, "/help", vp);
  const input = vis("[data-hc='search-input']");
  await input.waitFor({ timeout: 15_000 });
  await input.fill("zzqxv");
  await page.waitForTimeout(200);
  const home = await textOf(".ws-window");
  const nores = await textOf("[data-hc='no-results']");
  L.check("D1", "population: the help home and its no-results line", !!home && !!nores, String(nores));
  L.check("D1", "the help home names no Nick", !nick(home) && !nick(nores), String(nores));
  L.done(8);
});
