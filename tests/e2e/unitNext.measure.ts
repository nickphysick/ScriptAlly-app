/**
 * ⚠️ THE UNIT ROW'S NEXT — drawer round, Phase 4.
 *
 * THE RULE UNDER TEST, in the brief's words: a question that can be EDITED rather than merely
 * picked needs its own commit gesture and must never silently accept an unconfirmed value. The
 * unit question is the pane's one editable; everything else is a pill.
 *
 * ⚠️ RUN AGAINST HEAD FIRST, BY INSTRUCTION. The claims that are red on the pre-Phase-4 build are
 * the phase's whole case: a stepper press ADVANCES today (commit and advance are one callback), a
 * blur advances the same way, there is no Next pill, and neither the count nor the record moves
 * until a commit. The one that is green today — choosing a unit does not advance — is proved red
 * by mutation instead (wiring the pill's own click to advance), because a claim nobody has watched
 * fail is unproved.
 *
 * ⚠️ NO BACKTICKS OR REGEX LITERALS INSIDE ANY page.evaluate TEMPLATE — one backtick fails the
 * COLLECT and "No tests found" greps as zero reds, which counterfeited three mutation results in
 * Phase 3. Comments with backticks stay OUTSIDE the templates.
 *
 * ⚠️ IT NAVIGATES TO A SEND CARD AND ANSWERS NOTHING PERMANENT — it presses no primary and writes
 * nothing; every interaction is inside the pane's own unsaved draft, which walking away discards.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_UN_OUT ?? "run-artifacts/unit-next.txt";
rmSync(OUT, { force: true });

const SETTLED = "document.querySelector('.tdw-split').getAnimations().length === 0";

test("the unit row commits on its own gesture, and only Enter or Next moves the flow", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);

  /* ── reach a unit row: a Send card, then the "I've sent it" intent ─────────────────────── */
  /* ⚠️ A PARTIAL, NOT THE FIRST SEND. A full manuscript has no unit to pick — the gate's own
     `wholeThing` branch — so the first Send row (a full) opened a journey whose first question is
     "When", and the run reported the unit machinery missing from a card that never has any. The
     fixture must produce the input the claim is about: the row whose DEED says partial. */
  const opened = await page.evaluate(`(() => {
    const rows = [...document.querySelectorAll(".tlc .row")];
    const r = rows.find((x) =>
      (((x.querySelector(".pill") || {}).textContent) || "").trim() === "Send"
      && (((x.querySelector(".r-deed") || {}).textContent) || "").toLowerCase().indexOf("partial") > -1);
    if (!r) return false;
    r.click();
    return true;
  })()`) as boolean;
  add("P4.0 · a PARTIAL Send is on the board and opens — the journey that has a unit", opened,
      "clicked a partial Send row = " + opened);
  await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});

  const forked = await page.evaluate(`(() => {
    const fks = [...document.querySelectorAll(".tpn .fk")];
    const sent = fks.find((f) => ((f.querySelector(".t") || {}).textContent || "").indexOf("sent it") > -1);
    if (!sent) return false;
    sent.click();
    return true;
  })()`) as boolean;
  add("P4.1 · the fork offers the sent intent and it opens the ledger", forked, "chose the intent = " + forked);
  await page.waitForTimeout(250);

  /** the open row's label, the foot's count, and the parcel the record will keep */
  const state = () => page.evaluate(`(() => {
    const open = document.querySelector(".tpn .q.open .ql");
    const count = document.querySelector(".tpn .count");
    const wr = document.querySelector(".tpn .wr");
    const input = document.querySelector(".tpn .upill.on .qty input");
    return {
      open: open ? open.textContent.trim() : null,
      count: count ? count.textContent.trim() : null,
      wr: wr ? wr.textContent.trim() : null,
      amount: input ? input.value : null,
      unitAns: (() => {
        const qs = [...document.querySelectorAll(".tpn .q")];
        const u = qs.find((x) => (((x.querySelector(".ql") || {}).textContent) || "").toLowerCase().indexOf("what you sent") > -1);
        const a = u && u.querySelector(".ans");
        return a ? a.textContent.trim() : null;
      })(),
      nextb: (() => { const n = document.querySelector(".tpn .nextb");
        if (!n) return "absent";
        const r = n.getBoundingClientRect(); return r.width > 0 ? "shown" : "hidden"; })(),
    };
  })()`) as Promise<any>;

  const before = await state();
  /* the row's label is the app's own — read off the page during the red run, not guessed */
  add("P4.2 · the unit row is the first open question",
      (before.open || "").toLowerCase().indexOf("what you sent") > -1,
      "open row = " + JSON.stringify(before.open) + " · count = " + JSON.stringify(before.count));

  /* ── choose a unit, press NOTHING ──────────────────────────────────────────────────────── */
  await page.evaluate(`(() => {
    const pills = [...document.querySelectorAll(".tpn .upill")];
    const ch = pills.find((p) => (p.textContent || "").indexOf("Chapters") > -1);
    if (ch) ch.click();
  })()`);
  await page.waitForTimeout(150);
  const chose = await state();

  add("P4.3 · choosing a unit opens the picker focused and text-selected",
      await page.evaluate(`(() => {
        const el = document.activeElement;
        if (!el || el.tagName !== "INPUT") return false;
        return el.selectionEnd - el.selectionStart === el.value.length && el.value.length > 0;
      })()`) as boolean,
      "amount " + JSON.stringify(chose.amount) + " · focused input with all text selected");

  /* ⚠️ THE BRIEF'S OWN FIRST ASSERTION: choose a unit, press nothing — the next question does NOT
     open. Green on HEAD too (choosing never advanced); its red is proved by mutation. */
  add("P4.4 · after choosing, no other question opens until Enter or Next",
      chose.open === before.open,
      "open row " + JSON.stringify(before.open) + " → " + JSON.stringify(chose.open));

  /* ⚠️ THE QUESTION COUNTS AS ANSWERED FROM THE MOMENT A UNIT IS CHOSEN — the Phase 4 amendment to
     the journey round's commit gate, owner's call, stated in the brief in as many words. The count
     ticks with no commit gesture having happened. */
  add("P4.5 · the count ticks the moment the unit is chosen — no commit needed",
      !!chose.count && chose.count !== before.count,
      "count " + JSON.stringify(before.count) + " → " + JSON.stringify(chose.count));

  /* ⚠️ "SHOWN" WAS NOT ENOUGH — the pill spent a build wrapped onto a line of its own, below the
     units, and this passed: a wrapped element still has a box. The cause was an ORPHANED
     `.tpn .unitrow { flex-wrap: wrap }` from a retired sample-spec cell, seven hundred lines from
     the symptom, which reached the new element the moment one wandered under its selector — the
     rule-with-no-subject fault in its second direction. Caught by screenshot; held here by
     geometry: ON the row's first line, INSIDE the rim. */
  const pillGeo = await page.evaluate(`(() => {
    const rim = document.querySelector(".tpn .sheet .rim");
    const row = document.querySelector(".tpn .unitrow");
    const n = document.querySelector(".tpn .nextb");
    if (!rim || !row || !n) return null;
    const nb = n.getBoundingClientRect();
    return { onRow: Math.abs(nb.top - row.getBoundingClientRect().top) < 6,
             inRim: nb.right <= rim.getBoundingClientRect().right + 1,
             top: Math.round(nb.top), rowTop: Math.round(row.getBoundingClientRect().top) };
  })()`) as any;
  add("P4.6 · the Next pill sits ON the unit row, inside the rim",
      chose.nextb === "shown" && !!pillGeo && pillGeo.onRow && pillGeo.inRim,
      "the pill is " + chose.nextb + (pillGeo ? " · on the row's line = " + pillGeo.onRow
        + " (pill top " + pillGeo.top + " / row top " + pillGeo.rowTop + ") · inside the rim = " + pillGeo.inRim : ""));

  /* ── the count and the fill follow the keys LIVE ───────────────────────────────────────── */
  /* ⚠️ THE WILL-RECORD STRIP IS NOT THE OBSERVABLE HERE — it yields to the missing line while
     questions are unanswered (its own documented rule), so mid-flow it is absent by design and a
     first form of this read `wr: null` off a correct page. What IS observable live is the COUNT:
     emptying the field un-answers the question (an empty amount is not a parcel), typing an amount
     re-answers it — with no commit gesture anywhere in between. */
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(120);
  const emptied = await state();
  await page.keyboard.type("12");
  await page.waitForTimeout(120);
  const typed = await state();
  add("P4.7 · the count follows the keys live — empty un-answers, typing re-answers, no commit",
      !!emptied.count && emptied.count !== chose.count && typed.count === chose.count && typed.amount === "12",
      "count " + JSON.stringify(chose.count) + " → emptied " + JSON.stringify(emptied.count)
      + " → typed " + JSON.stringify(typed.count) + " · amount " + JSON.stringify(typed.amount));
  add("P4.8 · …and the flow still has not moved",
      typed.open === before.open, "open row = " + JSON.stringify(typed.open));

  /* ── a stepper press adjusts and NEVER advances ─────────────────────────────────────────── */
  await page.evaluate(`(() => {
    const b = [...document.querySelectorAll(".tpn .upill.on .qty button")]
      .find((x) => (x.getAttribute("aria-label") || "").indexOf("More") > -1);
    if (b) b.click();
  })()`);
  await page.waitForTimeout(150);
  const stepped = await state();
  add("P4.9 · a stepper press adjusts the amount (12 → 13)",
      stepped.amount === "13", "amount = " + JSON.stringify(stepped.amount));
  add("P4.10 · a stepper press leaves the unit row open — nudging − + is still deciding",
      stepped.open === before.open,
      "open row " + JSON.stringify(before.open) + " → " + JSON.stringify(stepped.open));

  /* ── blur commits, and does not advance either ──────────────────────────────────────────── */
  await page.evaluate(`(() => {
    const el = document.querySelector(".tpn .upill.on .qty input");
    if (el) { el.focus(); el.blur(); }
  })()`);
  await page.waitForTimeout(150);
  const blurred = await state();
  add("P4.11 · a blur commits the value and stays on the row",
      blurred.open === before.open && blurred.amount === "13",
      /* the step above took 12 to 13; blur must keep 13 and must not move the flow */
      "open row = " + JSON.stringify(blurred.open) + " · amount = " + JSON.stringify(blurred.amount));

  /* ── Enter with a typed value records THAT value and opens the next question ────────────── */
  await page.evaluate(`(() => {
    const el = document.querySelector(".tpn .upill.on .qty input");
    if (el) { el.focus(); el.select(); }
  })()`);
  await page.keyboard.type("5");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const entered = await state();
  /* ⚠️ THE RECORDED VALUE IS READ OFF THE CLOSED ROW'S OWN ANSWER, because advancing unmounts the
     input — a probe reading `input.value` after Enter measures an element that is not there and
     reports null about a correct page. The ledger's closed row states what it holds; that is the
     record the writer sees, and the record the assertion is about. */
  add("P4.12 · Enter with 5 typed records 5, not the seed",
      (entered.unitAns || "").indexOf("5") > -1 && (entered.unitAns || "").indexOf("13") === -1,
      "the closed row says: " + JSON.stringify(entered.unitAns));
  add("P4.13 · …and Enter is what opens the next unanswered question",
      !!entered.open && entered.open !== before.open,
      "open row " + JSON.stringify(before.open) + " → " + JSON.stringify(entered.open));

  /* ── the Next pill does the same, from the pill ─────────────────────────────────────────── */
  /* back onto the unit row, change the amount, press Next instead of Enter */
  await page.evaluate(`(() => {
    const heads = [...document.querySelectorAll(".tpn .q .head")];
    const unit = heads.find((h) =>
      (h.textContent || "").toLowerCase().indexOf("what you sent") > -1);
    if (unit) unit.click();
  })()`);
  await page.waitForTimeout(150);
  await page.evaluate(`(() => {
    const el = document.querySelector(".tpn .upill.on .qty input");
    if (el) { el.focus(); el.select(); }
  })()`);
  await page.keyboard.type("8");
  await page.waitForTimeout(120);
  /* ⚠️ THE PRECONDITION: the 8 actually reached the field before Next is pressed. Without this a
     focus that missed (the row still re-rendering, the evaluate racing React) makes the case
     report "Next lost the value" about a keystroke that never landed anywhere. */
  const preNext = await state();
  add("P4.14a · the reopened row took the typed 8", preNext.amount === "8",
      "amount before Next = " + JSON.stringify(preNext.amount) + " · open row = " + JSON.stringify(preNext.open));
  await page.evaluate(`(() => { const n = document.querySelector(".tpn .nextb"); if (n) n.click(); })()`);
  await page.waitForTimeout(200);
  const nexted = await state();
  add("P4.14 · the Next pill commits the typed 8 and moves on, exactly as Enter does",
      (nexted.unitAns || "").indexOf("8") > -1 && !!nexted.open && nexted.open !== before.open,
      "the closed row says: " + JSON.stringify(nexted.unitAns) + " · open row = " + JSON.stringify(nexted.open));

  writeFileSync(OUT, out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log("\n" + out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n"));
  const bad = out.filter((r) => !r.ok);
  expect(bad.map((r) => r.id + " — " + r.note).join("\n"), "unitNext").toEqual("");
});
