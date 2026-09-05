/**
 * CALENDAR v65 §D — the drawer (ref timeline-v65.html's `.drawer`).
 *
 * Open › on the card slides 420px from the right; View / Actions tabs; the LANDING TAB is
 * decided by urgency and is asserted on BOTH classes — a rule that only ever sees one class is
 * a rule nobody has watched work. Every action row opens its sheet (§E fills the seam; until
 * then the seam's one call site is asserted, not its outcome).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

/** open the card over a bar, then its drawer; returns the drawer's readings */
async function openDrawerOn(page: import("@playwright/test").Page, pickUrgent: boolean) {
  const seg = await page.evaluate((wantUrgent) => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    /* ⚠️ URGENCY IS THE BOARD'S OWN PARTITION, NOT THE ROW'S `.owes` CLASS. `.owes` is
       `some(sg.owed)` — a writer-owed date that has passed — while the board (and the drawer)
       read `owed || quiet`, the two arms of `calSectionOf`'s isUrgent. Picking by `.owes` handed
       the calm case a row the board itself calls Urgent, and the failure read as a landing-tab
       bug. The Urgent GROUP is what the reader sees, so it is what the case asks. */
    const rows = [...g.querySelectorAll<HTMLElement>(".tl-rrow")];
    for (const r of rows) {
      const grp = r.closest<HTMLElement>(".tl-grp");
      const urgent = grp?.dataset.sec === "over";
      if (urgent !== wantUrgent) continue;
      const bar = r.querySelector<HTMLElement>(".tl-p[data-seg]");
      if (bar && bar.getBoundingClientRect().width > 40) return bar.dataset.seg ?? null;
    }
    return null;
  }, pickUrgent);
  if (!seg) return null;
  await page.locator(`.tl-p[data-seg="${seg}"]`).evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(180);
  const opened = await page.locator(".tl-cc .tl-ccopen").count();
  if (!opened) return null;
  await page.locator(".tl-cc .tl-ccopen").evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(280);
  return page.evaluate(() => {
    const dw = document.querySelector<HTMLElement>("body > .tl-dw");
    if (!dw) return null;
    const b = dw.getBoundingClientRect();
    return {
      width: +b.width.toFixed(1), right: +(innerWidth - b.right).toFixed(1),
      card: document.querySelectorAll(".tl-cc").length,
      status: dw.querySelector(".tl-dwsw")?.textContent ?? "",
      tab: dw.querySelector<HTMLElement>(".tl-dwtabs .on")?.firstChild?.textContent ?? "",
      badge: dw.querySelector(".tl-dwtabs b")?.textContent ?? null,
      rows: [...dw.querySelectorAll(".tl-dwar .at")].map((e) => e.textContent ?? ""),
      pri: dw.querySelector(".tl-dwar.pri .at")?.textContent ?? null,
      priCv: dw.querySelector(".tl-dwar.pri .cv")?.textContent ?? null,
      footer: dw.querySelector(".tl-dwf a")?.textContent ?? null,
      z: getComputedStyle(dw).zIndex,
    };
  });
}

test("⚠️ (§D) 420px from the right; opening it CLOSES the card; it outranks the board's own rail", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const d = await openDrawerOn(page, true);
  expect(d, "no drawer opened").not.toBeNull();
  expect(d!.width, "the drawer is not 420 wide").toBe(420);
  expect(d!.right, "the drawer is not flush right").toBeLessThanOrEqual(1);
  expect(d!.card, "the card survived the drawer opening — two read surfaces at once").toBe(0);
  expect(d!.footer, "no Query Centre footer").toContain("Open in Query Centre");
  /* ⚠️ THE RAIL IS z50 INSIDE THE BOARD, so the board must ISOLATE or it paints over the drawer.
     Measured before the fix: the date row and the group bars bled across the drawer's left edge. */
  const hit = await page.evaluate(() => {
    const dw = document.querySelector<HTMLElement>("body > .tl-dw")!;
    const rail = document.querySelector<HTMLElement>(".tl-rail")!.getBoundingClientRect();
    const b = dw.getBoundingClientRect();
    const top = document.elementsFromPoint(b.left + 40, rail.top + rail.height / 2)[0] as HTMLElement;
    return dw.contains(top) ? "drawer" : String(top?.className).slice(0, 30);
  });
  expect(hit, "the board's rail paints over the drawer").toBe("drawer");
});

test("⚠️ (§D) the landing tab follows URGENCY — asserted on both classes", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const urgent = await openDrawerOn(page, true);
  expect(urgent, "no urgent row to open").not.toBeNull();
  expect(urgent!.tab, "an urgent row did not land on Actions").toBe("Actions");
  expect(urgent!.badge, "an urgent row's Actions tab carries no count").toBe("1");
  expect(urgent!.pri, "no primary deed on an urgent row").not.toBeNull();
  expect(urgent!.priCv, "the urgent primary carries no Caveat lateness").not.toBeNull();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  const calm = await openDrawerOn(page, false);
  /* ⚠️ THE OTHER CLASS IS THE POINT. A landing-tab rule watched on one class is a rule nobody
     has seen work; if the fixture holds no calm row the case SAYS so rather than passing. */
  expect(calm, "no calm row on the fixture — the View-landing half is unexercised").not.toBeNull();
  expect(calm!.tab, "a calm row did not land on View").toBe("View");
  expect(calm!.badge, "a calm row's Actions tab carries a count").toBeNull();
});

test("⚠️ (§D) every action row is a real door — each opens the sheet seam, and the set is the pack's", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const d = await openDrawerOn(page, true);
  expect(d, "no drawer").not.toBeNull();
  /* the pack's set for a relationship, primary first */
  const want = ["Log a nudge", "Record a response", "Log sent materials", "Change date", "Add note", "Close query"];
  for (const w of want) {
    if (w === d!.pri) continue;            /* the primary may BE one of these, promoted */
    expect(d!.rows, `the drawer is missing "${w}"`).toContain(w);
  }
  expect(d!.rows[0], "the primary deed is not first").toBe(d!.pri);
  /* every row responds — the seam is called, and nothing writes yet (§E fills it) */
  const rowCount = await page.locator(".tl-dw .tl-dwar").count();
  expect(rowCount, "no action rows").toBeGreaterThan(3);
  for (let i = 0; i < rowCount; i++) {
    await page.locator(".tl-dw .tl-dwar").nth(i).evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(90);
    const toast = await page.locator(".tdb-toast, .tl-acttoast").count();
    expect(toast, `action row ${i} answered nothing`).toBeGreaterThan(0);
  }
});

test("⚠️ (§D) View states the journey ending at now; Esc and click-away close", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const d = await openDrawerOn(page, false) ?? await openDrawerOn(page, true);
  expect(d, "no drawer").not.toBeNull();
  await page.locator(".tl-dwtabs button").first().evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  const v = await page.evaluate(() => {
    const dw = document.querySelector<HTMLElement>("body > .tl-dw")!;
    const jr = [...dw.querySelectorAll(".tl-dwjr")];
    return {
      nm: dw.querySelector(".tl-dwnm")?.textContent ?? "",
      stages: jr.length,
      lastIsNow: jr.length ? jr[jr.length - 1].className.includes("now") : false,
      nowCount: jr.filter((j) => j.className.includes("now")).length,
      note: !!dw.querySelector(".tl-dwnote"),
    };
  });
  expect(v.nm.length, "View states no name").toBeGreaterThan(1);
  expect(v.stages, "the journey is empty").toBeGreaterThan(0);
  expect(v.lastIsNow, "the journey does not end at now").toBe(true);
  expect(v.nowCount, "more than one stage claims to be now").toBe(1);
  expect(v.note, "View states no note").toBe(true);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  expect(await page.locator(".tl-dw").count(), "Escape did not close the drawer").toBe(0);
  /* click-away */
  const again = await openDrawerOn(page, true);
  expect(again, "the drawer did not reopen").not.toBeNull();
  await page.mouse.click(300, 500);
  await page.waitForTimeout(150);
  expect(await page.locator(".tl-dw").count(), "a click away did not close the drawer").toBe(0);
});
