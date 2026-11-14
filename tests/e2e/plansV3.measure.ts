/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plans v3 — measured (design-refs/plans-v3.html). The unit locks (src/components/plans/plansPageV3.test.tsx) read the
 * render; these read the PAINTED page: which card is visually first, which one is rotated, which ones stepped back,
 * whether 390 scrolls sideways.
 *
 * Two surfaces:
 *  - the real route `/plans` as the e2e account sees it (a founding writer — today's only real viewer), at 1440;
 *  - `#/plans-lab` (non-production) for the three after-launch viewers, the selling test flag, and 390. ⚠️ AT 390 THE
 *    ROUTE DRAWS THE PHONE'S OWN PLAN PAGE (`PlansRoute` → `PlanPhone`, phone shell, untouched), so this page is only
 *    reachable at that width through the lab.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

type Viewer = "founding" | "trial" | "free" | "pro";
const EXPECT: Record<Viewer, { order: string[]; lead: string; pill: string }> = {
  founding: { order: ["free", "founding", "pro"], lead: "founding", pill: "Open now" },
  trial: { order: ["free", "pro", "founding"], lead: "pro", pill: "Open" },
  free: { order: ["free", "pro", "founding"], lead: "pro", pill: "Open" },
  pro: { order: ["free", "pro", "founding"], lead: "pro", pill: "Open" },
};

async function openLab(page: Page, q: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/#/plans-lab?${q}`);
  await expect(page.locator(".pl-page .pl3 [data-plan]").first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

/** Everything the locks need, read from the painted page. Visual order = by top, then left. */
async function read(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll(".pl-page")].find((e) => (e as HTMLElement).offsetParent !== null) as HTMLElement;
    const cards = [...root.querySelectorAll(".pl3 > [data-plan]")] as HTMLElement[];
    const rotated = (t: string) => {
      if (t === "none") return false;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (!m) return false;
      const [, b] = m[1].split(",").map(Number);
      return Math.abs(b) > 1e-4;
    };
    const geo = cards.map((c) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return { id: c.dataset.plan!, lead: c.classList.contains("is-lead"), top: Math.round(r.top), left: Math.round(r.left),
        transform: cs.transform, rotated: rotated(cs.transform), opacity: Number(cs.opacity),
        pill: (c.querySelector(".pl3-pill") as HTMLElement).innerText.replace("✨", "").trim() };
    });
    const sparkles = [...root.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.includes("✨")));
    const choose = [...root.querySelectorAll("button, a, span")].filter((e) => e.children.length === 0 && e.textContent!.trim() === "Choose Pro");
    return {
      order: [...geo].sort((a, b) => (Math.abs(a.top - b.top) > 40 ? a.top - b.top : a.left - b.left)).map((g) => g.id),
      geo,
      sparkleCount: (root.innerText.match(/✨/g) ?? []).length,
      sparkleHidden: sparkles.map((e) => !!e.closest("[aria-hidden='true']")),
      chooseIn: choose.map((e) => (e.closest("[data-plan]") as HTMLElement | null)?.dataset.plan ?? "outside"),
      scrollW: document.documentElement.scrollWidth,
      vw: window.innerWidth,
      /* ⚠️ THE DOCUMENT CANNOT SCROLL SIDEWAYS WHILE THE PLANE CLIPS (overflow-y:auto turns a visible x into auto), so
         the document check alone is satisfied by construction — the E3 break left it green. The plane is the page's
         own scroll region, and it must not scroll sideways either. */
      planeSW: (root.querySelector(".acct-plane") as HTMLElement).scrollWidth,
      planeCW: (root.querySelector(".acct-plane") as HTMLElement).clientWidth,
    };
  });
}

/** Below 900px the cards stack and the lead card comes first; the others keep their order. */
const narrowOrder = (v: Viewer) => [EXPECT[v].lead, ...EXPECT[v].order.filter((id) => id !== EXPECT[v].lead)];

function assertCards(r: Awaited<ReturnType<typeof read>>, v: Viewer, label: string, narrow = false) {
  console.log(label, JSON.stringify({ order: r.order, geo: r.geo.map((g) => [g.id, g.lead, g.rotated, g.opacity, g.pill]) }));
  expect(r.order, `${label}: visual card order`).toEqual(narrow ? narrowOrder(v) : EXPECT[v].order);
  const leads = r.geo.filter((g) => g.lead);
  expect(leads.map((g) => g.id), `${label}: exactly one lead`).toEqual([EXPECT[v].lead]);
  expect(leads[0].pill, `${label}: the lead's pill`).toBe(EXPECT[v].pill);
  /* the lead's computed transform is a rotation, and no other card's is */
  expect(r.geo.filter((g) => g.rotated).map((g) => g.id), `${label}: rotated cards`).toEqual([EXPECT[v].lead]);
  /* stepped-back cards are below full opacity; the lead is at 1 */
  expect(leads[0].opacity, `${label}: lead opacity`).toBe(1);
  const back = r.geo.filter((g) => !g.lead && (v === "founding" || g.id === "founding"));
  expect(back.length, `${label}: stepped-back cards`).toBeGreaterThan(0);
  for (const g of back) expect(g.opacity, `${label}: ${g.id} steps back`).toBeLessThan(1);
  /* exactly one ✨, aria-hidden */
  expect(r.sparkleCount, `${label}: ✨ count`).toBe(1);
  expect(r.sparkleHidden, `${label}: ✨ aria-hidden`).toEqual([true]);
}

/** Compare every feature: closed on load, then the real PlanTable opens under it. */
async function assertCompare(page: Page, label: string) {
  const closed = await page.evaluate(() => {
    const root = [...document.querySelectorAll(".pl-page")].find((e) => (e as HTMLElement).offsetParent !== null) as HTMLElement;
    return {
      rows: [...root.querySelectorAll(".pl3-more > details")].map((d) => [(d as HTMLElement).dataset.plans, (d as HTMLDetailsElement).open]),
      /* ⚠️ `checkVisibility`, NOT `offsetHeight`: Chromium hides a closed <details> body with content-visibility, and
         the table inside keeps a box — offsetHeight reported it "visible" under a closed row (e2e-2). */
      tableVisible: !!(root.querySelector(".pl3-more .plt") as HTMLElement | null)?.checkVisibility(),
    };
  });
  expect(closed.rows.every(([, open]) => open === false), `${label}: every row closed on load`).toBe(true);
  expect(closed.rows[0]?.[0], `${label}: Compare is the first row`).toBe("compare");
  expect(closed.tableVisible, `${label}: the table is folded away on load`).toBe(false);
  await page.locator(".pl-page .pl3-more > details[data-plans='compare'] > summary").click();
  await page.waitForTimeout(200);
  const open = await page.evaluate(() => {
    const t = document.querySelector(".pl-page .pl3-more .plt") as HTMLElement | null;
    return { h: t?.checkVisibility() ? t.offsetHeight : 0, heading: t?.querySelector(".plt-h")?.textContent, rows: t?.querySelectorAll("tbody tr").length ?? 0 };
  });
  console.log(label, "compare open", JSON.stringify(open));
  expect(open.h, `${label}: the real PlanTable opens`).toBeGreaterThan(100);
  expect(open.heading).toBe("Everything, side by side");
  expect(open.rows).toBeGreaterThan(5);
  return closed.rows.map(([k]) => k);
}

test.describe("plans v3 — the real route, as the e2e account sees it", () => {
  /* ⚠️ THE VIEWER IS READ FROM THE PAGE, NOT ASSUMED. On dev the e2e account is a founding writer; the emulator's
     harness copy is `plan: "Free"` with no founding flag, so there it is the Free viewer. Either way the page must
     hold that viewer's order, lead and pill. */
  test("1440: order, one tilted lead, stepped-back cards, ✨, no Choose Pro; Compare closed then the real PlanTable", async ({ page }) => {
    await openRoute(page, "/plans", { width: 1440, height: 900 });
    await expect(page.locator(".pl-page .pl3 [data-plan]").first()).toBeVisible();
    const v = (await page.locator(".pl-page").getAttribute("data-plans-state")) as Viewer;
    console.log("route viewer:", v);
    expect(Object.keys(EXPECT)).toContain(v);
    const r = await read(page);
    assertCards(r, v, `route 1440 (${v})`);
    expect(r.chooseIn, "selling off: no Choose Pro").toEqual([]);
    const rows = await assertCompare(page, `route (${v})`);
    expect(rows).toEqual(v === "founding" ? ["compare"] : ["compare", "questions"]);
  });
});

test.describe("plans v3 — every viewer, in the lab", () => {
  for (const v of ["founding", "trial", "free", "pro"] as const) {
    test(`${v} at 1440 and 390`, async ({ page }) => {
      await openLab(page, `v=${v}&days=9`, 1440);
      const wide = await read(page);
      assertCards(wide, v, `${v} 1440`);
      expect(wide.chooseIn, `${v}: selling off, no Choose Pro`).toEqual([]);
      await openLab(page, `v=${v}&days=9`, 390);
      const narrow = await read(page);
      assertCards(narrow, v, `${v} 390`, true);
      expect(narrow.scrollW, `${v} 390: no horizontal scroll`).toBe(narrow.vw);
      expect(narrow.planeSW, `${v} 390: the plane does not scroll sideways`).toBeLessThanOrEqual(narrow.planeCW);
      if (v === "founding") {
        await openLab(page, "v=founding", 1440);
        const f = await page.evaluate(() => {
          const root = document.querySelector(".pl-page") as HTMLElement;
          return { picker: root.querySelectorAll(".pl-len").length, questions: root.innerText.includes("Questions"), place: root.innerText.includes("Your founding place") };
        });
        expect(f, "founding: no picker, no Questions, no 'Your founding place'").toEqual({ picker: 0, questions: false, place: false });
        expect(await assertCompare(page, "lab founding")).toEqual(["compare"]);
      }
    });
  }

  test("selling on (test flag): exactly one Choose Pro, in the Pro card; 390 still does not scroll sideways", async ({ page }) => {
    for (const v of ["trial", "free"] as const) {
      await openLab(page, `v=${v}&sell=1`, 1440);
      expect((await read(page)).chooseIn, `${v} sell`).toEqual(["pro"]);
      await openLab(page, `v=${v}&sell=1`, 390);
      const n = await read(page);
      expect(n.chooseIn).toEqual(["pro"]);
      expect(n.scrollW).toBe(n.vw);
      expect(n.planeSW, `${v} sell 390: the plane does not scroll sideways`).toBeLessThanOrEqual(n.planeCW);
    }
    for (const v of ["founding", "pro"] as const) {
      await openLab(page, `v=${v}&sell=1`, 1440);
      expect((await read(page)).chooseIn, `${v} sell: Pro is not offered with a length`).toEqual([]);
    }
  });
});
