/**
 * THE JOURNEY ROUND — Phases 1–3, measured on the running page.
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, INCLUDING IN COMMENTS. One terminates the
 * string and the file fails to COLLECT, which reads as "No tests found" while the previous run's
 * report sits on disk looking current. That happened in the workspace round; the sweep that catches
 * it is line-based and is run before every commit of this file.
 *
 * ⚠️ THE REPORT IS UNLINKED AT MODULE SCOPE, because a run that dies in SETUP never reaches the body.
 *
 * ⚠️ AND THIS SPEC WRITES. One snooze and one mute are performed through the fork, then UNDONE
 * through the app's own undo — so the account is left as it was found. Every write case asserts the
 * restoration as well as the effect; a run that dies between them leaves one snoozed card, which is
 * recoverable from the snoozed filter.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };

/** the report, in one shape, so an early exit and a full run cannot format differently */
function lines0(out: R[], notes: string[]): string {
  const red = out.filter((r) => !r.ok);
  const ls = [
    "── journey round · Phases 1–5 · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green",
    "",
    ...notes,
    "",
  ];
  for (const r of out) ls.push("  " + (r.ok ? "green" : "RED  ") + "  " + r.id + "\n           " + r.note);
  return ls.join("\n");
}
const OUT = process.env.SA_JR_OUT ?? "run-artifacts/journey-round.txt";
const SHOTS = "run-artifacts/journey-round";
rmSync(OUT, { force: true });
mkdirSync(SHOTS, { recursive: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false;
  row.click();
  return true;
})()`;

/** the pane as it stands — fork or ledger, and everything the two phases claim about it */
const READ = `(() => {
  const vis = ${VIS};
  const all = (s) => [...document.querySelectorAll(s)].filter(vis);
  const one = (s) => all(s)[0] || null;
  const txt = (e) => (e ? (e.textContent || "").trim() : "");
  const pane = one(".tpn .pane");
  if (!pane) return null;
  const fork = one(".tpn .fork");
  return {
    paneCls: pane.className,
    deed: txt(one(".tpn .deed")),
    forkLabel: txt(one(".tpn .forklbl")),
    forkOpts: fork ? [...fork.querySelectorAll(".fk")].map((b) => ({
      t: txt(b.querySelector(".t")), s: txt(b.querySelector(".s")), x: txt(b.querySelector(".x")),
    })) : [],
    forkSquare: one(".tpn .forklbl .sqm") ? getComputedStyle(one(".tpn .forklbl .sqm")).visibility : "none",
    receipt: one(".tpn .receipt") ? txt(one(".tpn .receipt")) : null,
    receiptLink: one(".tpn .receipt .rlink") ? txt(one(".tpn .receipt .rlink")) : null,
    cleared: !!one(".tpn .cleared"),
    flowInfo: txt(one(".tpn .flowinfo")),
    rows: all(".tpn .q").map((q) => ({
      id: q.id, open: q.classList.contains("open"), done: q.classList.contains("done"),
      label: txt(q.querySelector(".ql")),
      opts: [...q.querySelectorAll(".body .seg button")].map((b) => txt(b)),
      hint: txt(q.querySelector(".body .hint")),
    })),
    primary: one(".tpn .actbar .ab.go") ? txt(one(".tpn .actbar .ab.go")) : null,
    barVerbs: all(".tpn .actbar .ab.quiet").map((b) => txt(b)),
    strip: txt(one(".tpn .willrec")).replace(/^This records/, "").trim(),
  };
})()`;

test("journey round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const notes: string[] = [];

  /**
   * ⚠️ WAIT FOR THE BOARD, NOT FOR A DURATION — and assert it arrived before measuring anything.
   *
   * This spec used `waitForTimeout(7000)`. Under a load average of 14, with three other sessions
   * building in the same checkout, seven seconds was not enough: the run opened a page whose list
   * had not rendered and every one of 32 assertions read `-`. It reported that as 32 RED, which
   * looks exactly like a total regression and is not — the same page probed moments later held 27
   * rows and logged no console error.
   *
   * A fixed wait is a guess about a machine. `boardReady` is the condition itself, and the
   * population assertion below turns "the board never came" into ONE honest failure that says so,
   * rather than into a wall of red about a page nobody looked at.
   */
  const boardReady = async (): Promise<number> => {
    try {
      await page.waitForFunction(
        "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 });
    } catch { /* the count below reports it; the assertion is what fails, not this */ }
    return page.evaluate("document.querySelectorAll('.tlc .row').length") as Promise<number>;
  };

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  const rowsAtStart = await boardReady();
  await liftMotionSuppression(page);
  /* ⚠️ THE PRECONDITION, ASSERTED FIRST. Every claim below is about a docked card; with no rows
     there is nothing to dock and each would fail for a reason that has nothing to do with its own
     subject. */
  add("P0 · the board rendered before anything was measured",
      rowsAtStart > 0, "rows on screen at start = " + rowsAtStart);
  if (rowsAtStart === 0) {
    notes.push("THE BOARD NEVER RENDERED — every assertion below is vacuous and is not reported");
    const report0 = lines0(out, notes);
    writeFileSync(OUT, report0);
    console.log("\n" + report0 + "\n");
    expect(rowsAtStart, "the board never rendered — nothing was measured").toBeGreaterThan(0);
    return;
  }

  /**
   * ⚠️ THE ACCOUNT IS CLEANED BEFORE ANYTHING IS MEASURED, because the first run of this spec died
   * between its write and its undo and left a card snoozed. A measurement that cannot be re-run from
   * a known state is one whose second run measures the first one's residue. This walks the snoozed
   * band and unsnoozes through the app's OWN control — the ⋯ menu's `unsnooze` — rather than
   * touching storage, so it exercises the same path a writer would.
   */
  const clearSnoozed = async (): Promise<number> => {
    let cleared = 0;
    for (let i = 0; i < 6; i++) {
      const did = await page.evaluate(`(() => {
        const vis = ${VIS};
        const band = [...document.querySelectorAll(".tdg-snoozed, [data-snoozed-band]")].filter(vis)[0];
        if (!band) return false;
        const row = [...band.querySelectorAll(".row")].filter(vis)[0];
        if (!row) return false;
        const kebab = row.querySelector("[aria-haspopup], .r-more, .tlc-more");
        if (!kebab) return false;
        kebab.click();
        return true;
      })()`);
      if (!did) break;
      await page.waitForTimeout(600);
      const hit = await page.evaluate(`(() => {
        const vis = ${VIS};
        const item = [...document.querySelectorAll("[role=menuitem], .pm-item")].filter(vis)
          .find((e) => /unsnooze|wake|put back/i.test(e.textContent || ""));
        if (!item) return false; item.click(); return true;
      })()`);
      await page.waitForTimeout(1000);
      if (!hit) break;
      cleared++;
    }
    return cleared;
  };
  const preCleared = await clearSnoozed();
  if (preCleared) notes.push("cleaned up " + preCleared + " snoozed card(s) left by an earlier run");

  const read = () => page.evaluate(READ) as Promise<any>;
  const openCard = async (kind: string) => {
    const ok = await page.evaluate(kind === "__any" ? "true" : OPEN(kind));
    await page.waitForTimeout(1200);
    return ok;
  };
  /** press a fork option by its title */
  const choose = async (title: string) => {
    const hit = await page.evaluate(`(() => {
      const vis = ${VIS};
      const b = [...document.querySelectorAll(".tpn .fk")].filter(vis)
        .find((x) => ((x.querySelector(".t") || {}).textContent || "").trim() === ${JSON.stringify("__T__")});
      if (!b) return false; b.click(); return true;
    })()`.replace("__T__", title));
    await page.waitForTimeout(900);
    return hit;
  };
  const clickIn = async (sel: string) => {
    const hit = await page.evaluate(`(() => {
      const vis = ${VIS};
      const e = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(vis)[0];
      if (!e) return false; e.click(); return true;
    })()`);
    await page.waitForTimeout(900);
    return hit;
  };

  /* ══ PHASE 2 · the fork ═══════════════════════════════════════════════════════════════════ */
  await openCard("Send");
  const fork = await read();
  notes.push("SEND fork: " + JSON.stringify(fork?.forkOpts));

  add("P2.1 · the pane opens on the fork, with its label and its options",
      !!fork && fork.forkOpts.length === 3 && fork.forkLabel.length > 0,
      fork ? "label=" + JSON.stringify(fork.forkLabel) + " options=" + fork.forkOpts.length : "-");
  add("P2.2 · NO primary is rendered until an intent is chosen",
      !!fork && fork.primary === null,
      fork ? "primary=" + JSON.stringify(fork.primary) : "-");
  add("P2.3 · Snooze and Dismiss remain — both are honest answers to “not now”",
      !!fork && fork.barVerbs.includes("Snooze") && fork.barVerbs.includes("Dismiss"),
      fork ? JSON.stringify(fork.barVerbs) : "-");
  add("P2.4 · the steer square marks the fork itself",
      !!fork && fork.forkSquare === "visible", fork ? "sqm=" + fork.forkSquare : "-");
  add("P2.5 · every option states a title and a subtitle; the crossover says so first",
      !!fork && fork.forkOpts.every((o: any) => o.t && o.s)
        && fork.forkOpts.filter((o: any) => o.x).length === 1
        && /crosses to close/.test(fork.forkOpts.find((o: any) => o.x)?.x ?? ""),
      fork ? JSON.stringify(fork.forkOpts.map((o: any) => o.t + (o.x ? " [" + o.x + "]" : ""))) : "-");
  add("P2.6 · no ledger row is rendered while the fork is showing",
      !!fork && fork.rows.length === 0, fork ? "rows=" + fork.rows.length : "-");

  /* choose the first intent */
  await choose("I’ve sent it");
  const chosen = await read();
  add("P2.7 · choosing collapses the fork to a receipt and opens question 1",
      !!chosen && chosen.forkOpts.length === 0 && /You chose/.test(chosen.receipt ?? "")
        && chosen.rows.length > 0 && chosen.rows.filter((r: any) => r.open).length === 1,
      chosen ? "receipt=" + JSON.stringify(chosen.receipt) + " rows=" + chosen.rows.length
        + " open=" + JSON.stringify(chosen.rows.filter((r: any) => r.open).map((r: any) => r.id)) : "-");
  add("P2.8 · the primary is the FLOW's, and it is there now",
      !!chosen && chosen.primary !== null && /Log as sent/.test(chosen.primary),
      chosen ? "primary=" + JSON.stringify(chosen.primary) : "-");
  add("P2.9 · Snooze has LEFT the bar once an intent is chosen (Phase 3)",
      !!chosen && !chosen.barVerbs.includes("Snooze") && chosen.barVerbs.includes("Dismiss"),
      chosen ? JSON.stringify(chosen.barVerbs) : "-");

  /* answer one question, then Change — the answers must go */
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
    const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);
  const answered = await read();
  await clickIn(".tpn .receipt .rlink");
  const changed = await read();
  add("P2.10 · Change returns to the fork",
      !!changed && changed.forkOpts.length === 3 && changed.primary === null && !changed.receipt,
      changed ? "options=" + changed.forkOpts.length + " primary=" + JSON.stringify(changed.primary) : "-");
  add("P2.11 · and the answers given under the old intent are cleared, and the pane says so",
      !!changed && changed.cleared && !!answered
        && answered.rows.some((r: any) => r.done),
      "before=" + JSON.stringify(answered?.rows.filter((r: any) => r.done).map((r: any) => r.id))
        + " clearedLine=" + changed?.cleared);

  /* the crossover — band, deed and primary together */
  const before = await read();
  await choose("I’m not going to send it");
  const crossedTo = await read();
  add("P2.12 · a crossover changes the band, the deed and the fork together",
      !!crossedTo && !!before && crossedTo.paneCls !== before.paneCls
        && crossedTo.deed !== before.deed && crossedTo.forkOpts.length > 0,
      "band " + before?.paneCls + " -> " + crossedTo?.paneCls
        + " · deed " + JSON.stringify((before?.deed ?? "").slice(0, 26)) + " -> " + JSON.stringify((crossedTo?.deed ?? "").slice(0, 26)));
  add("P2.13 · and its receipt names where it came from, with the way back",
      !!crossedTo && /Crossed from/.test(crossedTo.receipt ?? "") && crossedTo.receiptLink === "Go back",
      crossedTo ? "receipt=" + JSON.stringify(crossedTo.receipt) : "-");
  await clickIn(".tpn .receipt .rlink");
  const backAgain = await read();
  add("P2.14 · Go back restores the origin journey and its fork",
      !!backAgain && !!before && backAgain.paneCls === before.paneCls
        && backAgain.deed === before.deed && backAgain.forkOpts.length === 3 && !backAgain.receipt,
      backAgain ? "band=" + backAgain.paneCls + " options=" + backAgain.forkOpts.length : "-");

  /* ══ PHASE 3 · delay is snooze ════════════════════════════════════════════════════════════ */
  await choose("Not yet — hold me to it");
  const delay = await read();
  add("P3.1 · the delay intent opens ONE question, with its flow's own options",
      !!delay && delay.rows.length === 1 && delay.rows[0].opts.length === 4
        && delay.rows[0].label === "Hold me to when?",
      delay ? "label=" + JSON.stringify(delay.rows[0]?.label) + " opts=" + JSON.stringify(delay.rows[0]?.opts) : "-");
  add("P3.2 · and it says nothing is recorded on the query",
      !!delay && /nothing is recorded on the query/i.test(delay.rows[0]?.hint ?? ""),
      delay ? "hint=" + JSON.stringify(delay.rows[0]?.hint) : "-");
  add("P3.3 · its primary is the flow's, not the send's",
      !!delay && /Set the reminder/.test(delay.primary ?? ""),
      delay ? "primary=" + JSON.stringify(delay.primary) : "-");

  /* the close journey's leave-it-open — the mute's home */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  const gotClose = await openCard("Close");
  if (gotClose) {
    const closeFork = await read();
    notes.push("CLOSE fork: " + JSON.stringify(closeFork?.forkOpts));
    add("P3.4 · the close fork names the honourable alternatives first",
        !!closeFork && closeFork.forkOpts.length === 3
          && /nudge/i.test(closeFork.forkOpts[1]?.t ?? ""),
        closeFork ? JSON.stringify(closeFork.forkOpts.map((o: any) => o.t)) : "-");
    await choose("Leave it open for now");
    const leave = await read();
    add("P3.5 · leave-it-open offers the mute as one of its own answers",
        !!leave && leave.rows[0]?.opts.some((o: string) => /stop asking about this one/i.test(o)),
        leave ? JSON.stringify(leave.rows[0]?.opts) : "-");
    add("P3.6 · and the hint states what the mute does NOT touch",
        !!leave && /this query only/i.test(leave.rows[0]?.hint ?? "")
          && /deletes nothing/i.test(leave.rows[0]?.hint ?? "")
          && /every other task/i.test(leave.rows[0]?.hint ?? ""),
        leave ? "hint=" + JSON.stringify(leave.rows[0]?.hint) : "-");
  } else {
    notes.push("no Close card on this account — P3.4–P3.6 not measured");
  }

  /* ⚠️ THE ONE WRITE, AND IT IS UNDONE. A delay must reach the SAME snooze the action bar uses —
     observable as the app's own snooze toast and the card leaving the list — and the undo must put
     it back, which is what leaves the account as it was found. */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  await openCard("Send");
  const rowsBefore = await page.evaluate(`(() => {
    const vis = ${VIS};
    return [...document.querySelectorAll(".tlc .row")].filter(vis).length;
  })()`) as number;
  await choose("Not yet — hold me to it");
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
    const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
    if (b) b.click();
  })()`);
  await page.waitForTimeout(700);
  await clickIn(".tpn .actbar .ab.go");
  await page.waitForTimeout(1600);
  /* ⚠️ THE TO-DO PAGE HAS ITS OWN TOAST, AND THE FIRST RUN OF THIS SPEC LOOKED FOR THE OTHER ONE.
     `.sa-toast-undo` is `ToastProvider`'s, uppercased; `/todo` renders `.tdb-toast` with
     `.tdb-toast-act`, label "Undo" in sentence case. The reading said "no undo was offered" about a
     button that was on screen — the same shape as the correction round's case-sensitive probe, and
     it left one card snoozed because the restore never ran. Both selectors are accepted here, so
     the case cannot be defeated by which host happens to be on screen. */
  const UNDO_SEL = ".tdb-toast-act, .sa-toast-undo";
  const afterSnooze = await page.evaluate(`(() => {
    const vis = ${VIS};
    const toast = [...document.querySelectorAll(".tdb-toast, .sa-toast")].filter(vis)[0];
    return {
      toast: toast ? (toast.textContent || "").trim() : "",
      rows: [...document.querySelectorAll(".tlc .row")].filter(vis).length,
      undo: !!document.querySelector(${JSON.stringify(UNDO_SEL)}),
    };
  })()`) as any;
  add("P3.7 · a delay writes through the app's own snooze — its toast, its undo, and the card leaves",
      /snoozed until/i.test(afterSnooze.toast) && afterSnooze.rows < rowsBefore && afterSnooze.undo,
      "toast=" + JSON.stringify(afterSnooze.toast.slice(0, 60))
        + " rows " + rowsBefore + " -> " + afterSnooze.rows + " · undo offered=" + afterSnooze.undo);

  /* ⚠️ AND IT IS PUT BACK. A measurement that leaves the account changed is one nobody can re-run. */
  const undone = await page.evaluate(`(() => {
    const u = document.querySelector(${JSON.stringify(UNDO_SEL)});
    if (!u) return false; u.click(); return true;
  })()`) as boolean;
  await page.waitForTimeout(2500);
  const restored = await page.evaluate(`(() => {
    const vis = ${VIS};
    return [...document.querySelectorAll(".tlc .row")].filter(vis).length;
  })()`) as number;
  add("P3.8 · and the undo restores it — this spec leaves the account as it found it",
      undone && restored === rowsBefore,
      "undo pressed=" + undone + " · rows " + afterSnooze.rows + " -> " + restored + " (was " + rowsBefore + ")");

  /* ══ PHASE 4 · the send journey ═══════════════════════════════════════════════════════════ */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  await openCard("Send");
  await choose("I\u2019ve sent it");

  /* ⚠️ THE SEEDED NUMBER IS NOT AN ANSWER — the bug that was live on dev. Open the parcel row,
     press a unit, and read the gate WITHOUT touching the amount. */
  const unitProbe = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const row = all(".tpn .q").find((q) => q.id.indexOf("s-unit") >= 0);
    if (!row) return { skipped: "no parcel row on this card" };
    if (!row.classList.contains("open")) (row.querySelector(".head")).click();
    return { opened: true };
  })()`) as any;
  await page.waitForTimeout(600);
  const beforeUnit = await read();
  const pressedUnit = await page.evaluate(`(() => {
    const vis = ${VIS};
    const row = [...document.querySelectorAll(".tpn .q")].filter(vis).find((q) => q.id.indexOf("s-unit") >= 0);
    const pill = row ? [...row.querySelectorAll(".ssp-units button, .upill")].filter(vis)[0] : null;
    if (!pill) return null;
    pill.click();
    return true;
  })()`) as any;
  await page.waitForTimeout(700);
  const afterUnit = await read();
  const seedState = await page.evaluate(`(() => {
    const vis = ${VIS};
    const inp = [...document.querySelectorAll(".tpn .q .qty input")].filter(vis)[0];
    const a = document.activeElement;
    return inp ? {
      value: inp.value,
      focused: a === inp,
      /* the whole value selected, so the first keystroke REPLACES the seed */
      selected: inp.selectionStart === 0 && inp.selectionEnd === String(inp.value).length && String(inp.value).length > 0,
    } : null;
  })()`) as any;
  const unitRowAfter = (afterUnit?.rows ?? []).find((r: any) => r.id.indexOf("s-unit") >= 0);
  add("P4.1 · choosing a unit does NOT mark the parcel answered",
      !!pressedUnit && !!unitRowAfter && !unitRowAfter.done,
      unitProbe?.skipped ? unitProbe.skipped
        : "pressed=" + !!pressedUnit + " row.done=" + unitRowAfter?.done
          + " (was " + ((beforeUnit?.rows ?? []).find((r: any) => r.id.indexOf("s-unit") >= 0)?.done) + ")");
  add("P4.2 · and the seed is focused AND selected, so typing replaces it",
      !!seedState && seedState.focused && seedState.selected,
      seedState ? "value=" + JSON.stringify(seedState.value) + " focused=" + seedState.focused
        + " selected=" + seedState.selected : "no amount input on screen");

  /* type over the seed and commit — no keystroke may be lost */
  await page.keyboard.type("7");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const typed = await page.evaluate(`(() => {
    const vis = ${VIS};
    const inp = [...document.querySelectorAll(".tpn .q .qty input")].filter(vis)[0];
    const row = [...document.querySelectorAll(".tpn .q")].filter(vis).find((q) => q.id.indexOf("s-unit") >= 0);
    return { value: inp ? inp.value : null, done: row ? row.classList.contains("done") : null };
  })()`) as any;
  add("P4.3 · typing replaces the seed without a keystroke being lost, and THEN it is answered",
      typed.value === "7" && typed.done === true,
      "value=" + JSON.stringify(typed.value) + " (7 expected, not 37) · answered=" + typed.done);

  /* the crossover to close — its verb and its strip */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  await openCard("Send");
  await choose("I\u2019m not going to send it");
  const crossed = await read();
  add("P4.4 · the crossed close arrives under the contract's own verb",
      /Close the query/.test(crossed?.primary ?? "") || crossed?.primary === null,
      "primary=" + JSON.stringify(crossed?.primary));
  await choose("Close it now");
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
    const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
    if (b) b.click();
  })()`);
  await page.waitForTimeout(800);
  const wStrip = await read();
  add("P4.5 · and its strip says WITHDRAWN, not no-response",
      /withdrawn/i.test(wStrip?.strip ?? "") && !/no response/i.test(wStrip?.strip ?? ""),
      "strip=" + JSON.stringify(wStrip?.strip));

  /* ══ PHASE 5 · the nudge journey ═══════════════════════════════════════════════════════════ */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  const gotNudge = await openCard("Chase");
  if (gotNudge) {
    const nf = await read();
    notes.push("NUDGE fork: " + JSON.stringify(nf?.forkOpts?.map((o: any) => o.t)));
    add("P5.1 · the nudge fork offers record, wait, and the crossover to close",
        !!nf && nf.forkOpts.length === 3 && /close/i.test(nf.forkOpts[2]?.x ?? ""),
        nf ? JSON.stringify(nf.forkOpts.map((o: any) => o.t)) : "-");
    await choose("I\u2019ve nudged them");
    const nudged = await read();
    add("P5.2 · logging a nudge REQUIRES its own clock — the question is on the ledger",
        !!nudged && nudged.rows.some((r: any) => /if nothing comes back/i.test(r.label)),
        nudged ? JSON.stringify(nudged.rows.map((r: any) => r.label)) : "-");
    const checkinRow = (nudged?.rows ?? []).find((r: any) => /if nothing comes back/i.test(r.label));
    add("P5.3 · and Don\u2019t ask again is one of its answers",
        !!checkinRow && (checkinRow.opts ?? []).some((o: string) => /don.t ask again/i.test(o)),
        checkinRow ? JSON.stringify(checkinRow.opts) : "(row not open)");
    add("P5.4 · the primary is absent until the clock is answered",
        !!nudged && /to answer/.test(nudged.primary ?? ""),
        "primary=" + JSON.stringify(nudged?.primary));
  } else {
    notes.push("no Chase card on this account — P5.1\u2013P5.4 not measured");
  }

  /* ⚠️ THE JOURNEY REPORTS, IT DOES NOT JUDGE. Read the RENDERED pane rather than the source, so a
     task-type identifier cannot satisfy a claim about copy. */
  const verdicts = await page.evaluate(`(() => {
    const vis = ${VIS};
    const pane = [...document.querySelectorAll(".tpn .pane")].filter(vis)[0];
    if (!pane) return null;
    const t = (pane.textContent || "");
    return { overdue: /overdue/i.test(t), late: /\blate\b/i.test(t), len: t.length };
  })()`) as any;
  add("P5.5 · the pane calls nobody overdue or late",
      !!verdicts && !verdicts.overdue && !verdicts.late && verdicts.len > 100,
      verdicts ? "overdue=" + verdicts.overdue + " late=" + verdicts.late + " (chars scanned " + verdicts.len + ")" : "-");

  /* ══ SCREENSHOTS ══════════════════════════════════════════════════════════════════════════ */
  const shoot = async (name: string, kind: string, steps?: () => Promise<void>) => {
    await page.goto("/todo");
    await boardReady();
    await liftMotionSuppression(page);
    if (!(await page.evaluate(OPEN(kind)))) { notes.push("shot " + name + ": no " + kind + " card"); return; }
    await page.waitForTimeout(1200);
    if (steps) await steps();
    await page.screenshot({ path: SHOTS + "/" + name + ".png" });
  };
  await shoot("fork-send", "Send");
  await shoot("fork-send-sent", "Send", async () => { await choose("I’ve sent it"); });
  await shoot("fork-send-later", "Send", async () => { await choose("Not yet — hold me to it"); });
  await shoot("fork-send-crossed", "Send", async () => { await choose("I’m not going to send it"); });
  await shoot("fork-close", "Close");
  await shoot("fork-close-leave", "Close", async () => { await choose("Leave it open for now"); });
  await shoot("fork-nudge", "Chase");
  await shoot("fork-note", "Note");
  await shoot("send-crossed-close", "Send", async () => {
    await choose("I\u2019m not going to send it"); await choose("Close it now");
  });
  await shoot("nudge-nudged", "Chase", async () => { await choose("I\u2019ve nudged them"); });
  await shoot("fillin-fork", "Fix");

  const red = out.filter((r) => !r.ok);
  const lines = [
    "── journey round · Phases 1–5 · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green",
    "",
    ...notes,
    "",
  ];
  for (const r of out) lines.push("  " + (r.ok ? "green" : "RED  ") + "  " + r.id + "\n           " + r.note);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, red.length + " red").toHaveLength(0);
});
