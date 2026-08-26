/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PACK B PHASE 2 — THE SESSION STILL BEHAVES, ON A RENDERED PAGE ═══════════════════════════
 *
 * ⚠️ THE MOVE'S ACCEPTANCE IS PARITY, NOT THE DIFF. `useTaskPaneSession` took the pane's four
 * states, its facts, its timeline, its gate and its primary out of `ToDoPage`. Every unit lock
 * covering that code reads SOURCE, so all of them would pass on a hook that never ran — which is
 * exactly the gap this file exists to close.
 *
 * ⚠️ AND IT CARRIES ONE CLAIM NO SOURCE LOCK CAN: the dock cursor resolves against the board as it
 * WAS. Before the move that was statement order — `nextKey` computed before the `await`. It is now
 * closure capture: `paneHost.advance` reads the `dockable` of the render in which the primary was
 * pressed. `paneCommit.test.ts` names it and hands it here rather than pretending to assert it.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** dock a card by the words on its row — the same chooser Phase 1 needed, and for the same reason:
 *  the pane opens on whatever happens to be docked, which on this account is a NOTE. */
async function dock(page: import("@playwright/test").Page, match: RegExp) {
  const pt = await page.evaluate((src) => {
    const re = new RegExp(src, "i");
    const row = Array.from(document.querySelectorAll(".row"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
      .find((e) => re.test((e.textContent ?? "").replace(/\s+/g, " "))) as HTMLElement | undefined;
    if (!row) return null;
    row.scrollIntoView({ block: "center" });
    const r = row.getBoundingClientRect();
    if (r.height < 2 || r.bottom > window.innerHeight || r.top < 0) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, match.source);
  if (!pt) return false;
  await page.waitForTimeout(250);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(500);
  return true;
}

/** the visible pane — never the document, because every workspace page stays mounted */
const paneState = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const pane = Array.from(document.querySelectorAll(".tpn"))
    .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement | undefined;
  if (!pane) return null;
  const seg = pane.querySelector("#s-when .seg");
  return {
    deed: (pane.querySelector(".deed")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    band: (pane.querySelector(".band")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    whenOn: seg ? Array.from(seg.querySelectorAll("button")).filter((b) => b.className === "on").map((b) => b.textContent) : [],
    whenCount: seg ? seg.querySelectorAll("button").length : 0,
    also: (pane.querySelector("textarea.note-in") as HTMLTextAreaElement | null)?.value ?? null,
    primary: (pane.querySelector("button.ab.go, button.fk")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    primDisabled: (pane.querySelector("button.ab.go, button.fk") as HTMLButtonElement | null)?.disabled ?? null,
    navIndex: (pane.querySelector(".tpn-nav")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30),
  };
});

test("Pack B Phase 2 — the pane's session behaves as it did before the move", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await openRoute(page, "/todo", { width: 1440, height: 900 });

  /* ══ M1 · the pane renders at all — the hook runs ═══════════════════════════════════════════ */
  const docked = await dock(page, /Send your (full|partial)/);
  expect(docked, "no Send card on this account — the rest of this file would measure nothing").toBe(true);
  const first = await paneState(page);
  expect(first, "no visible pane — the session did not produce a journey").not.toBeNull();
  console.log("M1 pane on a Send card:", JSON.stringify(first));
  expect(first!.whenCount, "the When segment did not render — the form is not being built").toBeGreaterThan(1);
  expect(first!.primary.length, "the primary has no label — `dockPrimary`'s journey is empty").toBeGreaterThan(0);

  /* ══ M2 · an answer STAGES, and survives an ordinary re-render ══════════════════════════════
     ⚠️ THIS IS THE ONE THE MOVE COULD MOST EASILY HAVE BROKEN. The seeds are read through a ref
     precisely so a Firestore snapshot does not re-run the reset effect and wipe the form under the
     writer — a bug found by measurement, invisible to every source lock. Listing `queries`/`agents`
     as deps would reintroduce it, and the hook is where those arrays now arrive. */
  await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement;
    const btns = Array.from(pane.querySelectorAll("#s-when .seg button")) as HTMLButtonElement[];
    btns[0]?.click();
  });
  await page.waitForTimeout(300);
  const staged = await paneState(page);
  console.log("M2 after choosing the first When:", JSON.stringify(staged!.whenOn));
  expect(staged!.whenOn.length, "choosing a When did not stage — the form's state is not held").toBe(1);

  await page.waitForTimeout(3200);                      // ordinary re-renders arrive in here
  const survived = await paneState(page);
  expect(survived!.whenOn, "the staged answer was WIPED by an ordinary re-render — the ref-based seed did not survive the move")
    .toEqual(staged!.whenOn);
  console.log("M2 after 3.2s of live snapshots:", JSON.stringify(survived!.whenOn));

  /* ══ M3 · the answers RESET with the card, and do not follow it ═════════════════════════════ */
  const moved = await dock(page, /imported queries are missing their material/);
  expect(moved, "no cohort card to switch to").toBe(true);
  const other = await paneState(page);
  expect(other!.deed, "switching cards did not change the pane").not.toBe(first!.deed);

  await dock(page, /Send your (full|partial)/);
  const back = await paneState(page);
  console.log("M3 back on the Send card:", JSON.stringify(back!.whenOn));
  expect(back!.deed, "the pane did not return to the Send card").toBe(first!.deed);
  expect(back!.whenOn, "the staged answer followed the writer to another card and back — the reset is gone")
    .toEqual([]);

  /* ══ M4 · console clean ════════════════════════════════════════════════════════════════════ */
  console.log("M4 console errors:", errs.length ? JSON.stringify(errs.slice(0, 5)) : "none");
  expect(errs, "the session threw on a rendered page").toEqual([]);
});
