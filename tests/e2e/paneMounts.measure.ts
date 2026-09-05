/**
 * ⚠️ CLICKING A CARD OF EVERY JOURNEY TYPE MOUNTS THE PANE, WITH A CLEAN CONSOLE.
 *
 * This is the check that would have caught both crashes this pane has had, and neither was
 * catchable any other way:
 *
 *   · the `paneWill` TDZ (26 Aug) — a `const` IIFE reading two `const`s declared two hundred lines
 *     below it. `tsc` cannot see through an IIFE, so it compiled clean, 6,995 unit tests passed,
 *     the production build was clean, and every docked card threw
 *     `ReferenceError: Cannot access 'Rr' before initialization` into the error boundary. It
 *     reached `main` AND dev that way.
 *   · the earlier `AllManuscripts` shape, which reached dev the same way.
 *
 * ⚠️ IT ASSERTS THE ABSENCE OF ERRORS, WHICH IS THE HALF EVERY OTHER CHECK SKIPS. A pane that
 * mounts is not the claim; a pane that mounts WITHOUT the console saying anything is. A crash of
 * this class leaves the workspace visually empty and the rest of the page perfectly healthy, so
 * nothing short of reading the console distinguishes it from a card with nothing to show.
 *
 * ⚠️ AND IT ASSERTS ITS OWN POPULATION FIRST. An empty board mounts no panes and logs no errors,
 * which satisfies every claim below while measuring nothing — the vacuous shape this repo keeps
 * paying for. The board's rows are waited for, not slept on, and their count is asserted.
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, comments included — one terminates the string
 * and the file fails to COLLECT, which reads as "No tests found".
 *
 * Read-only: it clicks rows and reads. It presses no primary and writes nothing.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_PM_OUT ?? "run-artifacts/pane-mounts.txt";
rmSync(OUT, { force: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

test("every journey type mounts its pane with a clean console", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  /* ⚠️ CAPTURED FOR THE WHOLE RUN AND CLEARED PER CARD, so an error raised by one journey cannot be
     attributed to the next — and a listener attached later than the click would miss it entirely. */
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR " + (e.stack ? String(e.stack).slice(0, 500) : String(e))));
  page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text().slice(0, 300)); });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  /** the board's own rows, waited for rather than slept on — a fixed wait is a guess about a machine */
  const boardReady = async (): Promise<number> => {
    await page.goto("/todo");
    await page.waitForFunction(
      "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
    await liftMotionSuppression(page);
    return page.evaluate("document.querySelectorAll('.tlc .row').length") as Promise<number>;
  };

  const rows = await boardReady();
  add("P0 · the board rendered, so there is something to click",
      rows > 0, "rows on screen = " + rows);

  const kinds = await page.evaluate(`(() => {
    const vis = ${VIS};
    return [...new Set([...document.querySelectorAll(".tlc .row")].filter(vis)
      .map((r) => (((r.querySelector(".pill") || {}).textContent) || "").trim()).filter(Boolean))];
  })()`) as string[];

  /* ⚠️ THE POPULATION, ASSERTED BEFORE THE CLAIM. Two is the floor rather than six: the board is
     derived, so which journey types exist depends on the account's own data on the day. What must
     never pass silently is a run that covered NOTHING. */
  add("P0b · at least two journey types were on the board to cover",
      kinds.length >= 2, "kinds = " + JSON.stringify(kinds));

  for (const kind of kinds) {
    await boardReady();
    errs.length = 0;
    const clicked = await page.evaluate(`(() => {
      const vis = ${VIS};
      const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
        .find((r) => (((r.querySelector(".pill") || {}).textContent) || "").trim() === ${JSON.stringify(kind)});
      if (!row) return false;
      row.click();
      return true;
    })()`);
    /* the pane is React state, so wait for it rather than for the clock — and a crash means it
       never comes, which is what the timeout then reports */
    /* ⚠️ THE WAIT AND THE CLAIM MUST BE THE SAME PREDICATE (drawer round, Phase 2). This waited on
       HEIGHT and then asserted `VIS`, which is width AND height. That was indistinguishable while
       the pane appeared at full width in one frame; with the drawer's 380ms motion the pane has
       height immediately and width only as the track opens, so the wait was satisfied at the first
       frame of the transition and the assertion read a 0-wide pane. Five of six journeys reported
       `pane=false` with their content demonstrably present (`workChars` 164–523) — a green canary
       turning red on a working page, which is the most expensive kind of false alarm there is. */
    await page.waitForFunction(
      "[...document.querySelectorAll('.tpn .pane')].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })",
      null, { timeout: 8_000 }).catch(() => {});
    const state = await page.evaluate(`(() => {
      const vis = ${VIS};
      const pane = [...document.querySelectorAll(".tpn .pane")].filter(vis)[0];
      const work = document.querySelector(".tdw-work");
      return {
        pane: !!pane,
        /* the workspace emptying is this crash's own signature: the page stays healthy and the
           pane's slot simply goes blank */
        workChars: work ? (work.textContent || "").trim().length : 0,
      };
    })()`) as any;

    add("· " + kind + " — clicking it mounts the pane",
        clicked && state.pane && state.workChars > 20,
        "clicked=" + clicked + " pane=" + state.pane + " workspace chars=" + state.workChars);
    add("· " + kind + " — and the console says nothing",
        errs.length === 0,
        errs.length ? errs[0].replace(/\n/g, " | ") : "no console errors, no page errors");
  }

  const red = out.filter((r) => !r.ok);
  const lines = ["── pane mounts · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green", ""];
  for (const r of out) lines.push("  " + (r.ok ? "green" : "RED  ") + "  " + r.id + "\n           " + r.note);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, red.length + " red").toHaveLength(0);
});
