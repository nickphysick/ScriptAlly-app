/**
 * CALENDAR v65 §E (the ruling) — ONE DOOR, AND IT IS HONESTLY EMPTY.
 *
 * The ruling: the desks are the shared component and there is no Action sheet. This page's job is
 * the SEAM — every action door goes through `requestAction`, and until the QC session lands the
 * modal chassis the seam reports the press and writes nothing.
 *
 * ⚠️ THE TWO HALVES ARE BOTH ASSERTED. "Every door answers" alone would pass on a page that had
 * quietly started writing; "nothing was written" alone would pass on a page whose buttons were
 * dead. The claim is: every door answers, AND the record is untouched.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

/** the board's own statement of a row's record: its band words, in order */
const RECORD = `(() => {
  const g = [...document.querySelectorAll(".tl-cal")].find(e => e.getBoundingClientRect().height > 0);
  return [...g.querySelectorAll(".tl-p")].filter(b => b.getBoundingClientRect().height > 1)
    .map(b => (b.querySelector(".tl-sw")?.textContent ?? "") + "/" + (b.querySelector(".tl-sh")?.textContent ?? ""))
    .join("|");
})()`;

test("⚠️ the BAR's action goes through the door: it answers, mounts no desk, and writes nothing", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const before = await page.evaluate(RECORD);
  const seg = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const a = [...g.querySelectorAll<HTMLElement>(".tl-act[data-for]")].find((x) => x.querySelector(".tl-actbtn"));
    return a?.dataset.for ?? null;
  });
  expect(seg, "no bar action to press").not.toBeNull();
  const bar = page.locator(`.tl-p[data-seg="${seg}"]`);
  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + Math.min(60, b.width / 2), b.y + b.height / 2);
  await page.waitForTimeout(250);
  await page.locator(`.tl-act[data-for="${seg}"] .tl-actbtn`).evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(300);
  /* it answered — the door ran (and the press proves the seam is reachable at runtime, which is
     the only thing that can prove a handler declared above its own state binding actually fires) */
  expect(await page.locator(".tl-acttoast").count(), "the bar's action answered nothing").toBe(1);
  /* no desk mounted — the chassis is the QC session's and has not landed */
  const desks = await page.evaluate(() => document.querySelectorAll(".qrd, .qcd-verb").length);
  expect(desks, "a desk mounted — the chassis landed without this lock being retargeted").toBe(0);
  /* and the record is untouched */
  expect(await page.evaluate(RECORD), "the seam wrote to the record").toBe(before);
});

test("⚠️ the CARD's action and EVERY DRAWER ROW go through the same door, and none of them writes", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const before = await page.evaluate(RECORD);

  /* the card's action */
  const bar = page.locator(".tl-cal .tl-p[data-seg]").first();
  await bar.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(200);
  const hasAct = await page.locator(".tl-cc .tl-ccbtn").count();
  if (hasAct) {
    await page.locator(".tl-cc .tl-ccbtn").evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(250);
    expect(await page.locator(".tl-acttoast").count(), "the card's action answered nothing").toBe(1);
  } else {
    console.log("⚠️ the sampled card carries no action — the card branch ran on zero subjects");
  }

  /* every drawer row */
  await bar.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  await bar.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(200);
  await page.locator(".tl-cc .tl-ccopen").evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(300);
  await page.locator(".tl-dwtabs button").nth(1).evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  const rows = await page.locator(".tl-dw .tl-dwar").count();
  expect(rows, "no drawer rows").toBeGreaterThan(3);
  for (let i = 0; i < rows; i++) {
    await page.locator(".tl-dw .tl-dwar").nth(i).evaluate((e) => (e as HTMLElement).click());
    await page.waitForTimeout(80);
    expect(await page.locator(".tl-acttoast").count(), `drawer row ${i} answered nothing`).toBe(1);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  expect(await page.evaluate(RECORD), "a drawer row wrote to the record").toBe(before);
});

test("⚠️ no fifth surface: no Action sheet, and no desk is reimplemented on this page", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const r = await page.evaluate(() => ({
    sheet: document.querySelectorAll(".tl-sheet, .sa-actionsheet, [data-action-sheet]").length,
    scrim: document.querySelectorAll(".tl-scrim").length,
    /* the desks' own class, which must appear only when the QC chassis mounts one */
    desk: document.querySelectorAll(".qrd").length,
  }));
  expect(r, "the calendar grew its own write surface").toEqual({ sheet: 0, scrim: 0, desk: 0 });
});
