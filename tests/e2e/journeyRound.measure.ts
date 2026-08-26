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
    "── journey round · Phases 1–7 · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green",
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
  /** the primary's own facts — the attribute, the classes, and the fill against the button */
  const primaryFacts = async () => page.evaluate(`(() => {
    const vis = ${VIS};
    const t = (e) => (e ? (e.textContent || "").replace(/\\s+/g, " ").trim() : "");
    const btn = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    if (!btn) return null;
    const fill = btn.querySelector(".fill");
    const w = btn.clientWidth;
    return {
      label: t(btn.querySelector(".t")) || t(btn),
      disabled: btn.disabled === true || btn.hasAttribute("disabled"),
      ariaDisabled: btn.getAttribute("aria-disabled"),
      describedBy: btn.getAttribute("aria-describedby"),
      ready: btn.classList.contains("ready"),
      hasFill: !!fill,
      pct: fill && w > 0 ? Math.round((fill.getBoundingClientRect().width / w) * 1000) / 10 : null,
      count: t([...document.querySelectorAll(".tpn .actbar .count")].filter(vis)[0]),
      countId: ([...document.querySelectorAll(".tpn .actbar .count")].filter(vis)[0] || {}).id || null,
      chipInside: !!btn.querySelector(".n"),
    };
  })()`) as any;

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
  /**
   * ⚠️ THE UNIT CLAIM NEEDS A CARD WITH A UNIT TO PICK. The first run of these two measured the
   * harness's FULL-manuscript send, where the parcel requirement is satisfied by the material
   * itself (`wholeThing`) and the row is answered before anything is pressed — so "choosing a unit
   * does not answer it" was being asked of a card that has no unit. The same fault as handing a
   * function an input its callers cannot produce, wearing a fixture's clothes.
   *
   * A PARTIAL is the card that can exercise it. Where the account holds none, this reports itself
   * as unmeasured rather than red: a fixture that cannot pose the question has not answered it.
   */
  const openedPartial = await page.evaluate(`(() => {
    const vis = ${VIS};
    const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Send"
                && /partial/i.test(r.textContent || ""));
    if (!row) return false;
    row.click();
    return true;
  })()`) as boolean;
  await page.waitForTimeout(1200);
  if (openedPartial) await choose("I\u2019ve sent it");

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
  const unitRowBefore = (beforeUnit?.rows ?? []).find((r: any) => r.id.indexOf("s-unit") >= 0);
  /* ⚠️ THE PRECONDITION FIRST: the row must start UNANSWERED, or the claim is unaskable here. */
  const canAskUnit = !!openedPartial && !!unitRowBefore && !unitRowBefore.done;
  add("P4.1 · choosing a unit does NOT mark the parcel answered",
      !canAskUnit || (!!pressedUnit && !!unitRowAfter && !unitRowAfter.done),
      !openedPartial ? "UNMEASURED — no partial send card on this account, so no unit to pick"
        : !canAskUnit ? "UNMEASURED — this card's parcel is a whole manuscript, which has no unit"
        : "pressed=" + !!pressedUnit + " row.done after pressing a unit = " + unitRowAfter?.done);
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
  /* ⚠️ READ THE ANSWER, NOT THE INPUT. Committing closes the row, so the picker unmounts and the
     input is gone by the time this reads — the first run reported `value=null` about a control that
     had correctly stopped existing. The ROW's stated answer is the durable evidence. */
  const typedAnswer = await page.evaluate(`(() => {
    const vis = ${VIS};
    const row = [...document.querySelectorAll(".tpn .q")].filter(vis).find((q) => q.id.indexOf("s-unit") >= 0);
    const ans = row ? row.querySelector(".ans") : null;
    return { ans: ans ? (ans.textContent || "").replace(/\u2713|Edit/g, "").trim() : null,
             done: row ? row.classList.contains("done") : null };
  })()`) as any;
  add("P4.3 · typing replaces the seed without a keystroke being lost, and THEN it is answered",
      !canAskUnit || (/\b7\b/.test(typedAnswer.ans ?? "") && typedAnswer.done === true),
      !canAskUnit ? "UNMEASURED — see P4.1"
        : "answer=" + JSON.stringify(typedAnswer.ans) + " (7 expected, not 37) · answered=" + typedAnswer.done
          + " · input at commit=" + JSON.stringify(typed.value));

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
    /* ⚠️ ONLY THE OPEN ROW RENDERS ITS CONTROL, so the options have to be asked for. The first run
       read a CLOSED row and reported `[]` — an empty reading about a question that renders its
       answers correctly the moment it is opened. */
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const row = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((q) => /if nothing comes back/i.test((q.querySelector(".ql") || {}).textContent || ""));
      if (row && !row.classList.contains("open")) (row.querySelector(".head")).click();
    })()`);
    await page.waitForTimeout(700);
    const opened5 = await read();
    const checkinRow = (opened5?.rows ?? []).find((r: any) => /if nothing comes back/i.test(r.label));
    add("P5.3 · and Don\u2019t ask again is one of its answers",
        !!checkinRow && (checkinRow.opts ?? []).some((o: string) => /don.t ask again/i.test(o)),
        checkinRow ? JSON.stringify(checkinRow.opts) : "(no check-in row on screen)");
    /* ⚠️ RETARGETED, AND THE LAW IS UNCHANGED (Phase 7). This read the words "to answer" out of the
       primary's own text, because the count used to ride ON the button as a chip. Phase 7 moved the
       count OUTSIDE it, so the button now reads "Log the nudge" and the chip is gone — the claim
       being made is the same one, *the primary is not live until the clock is answered*, and its
       expression is now `aria-disabled` plus the count beside it. The case's own NAME was already
       wrong: it said "absent" while measuring a chip on a button that was present throughout. */
    const nudgeBtn = await primaryFacts();
    add("P5.4 · the primary is not live until the clock is answered — and it is not switched off either",
        !!nudgeBtn && nudgeBtn.ariaDisabled === "true" && nudgeBtn.disabled === false
          && /still to answer/i.test(nudgeBtn.count || ""),
        nudgeBtn ? "label=" + JSON.stringify(nudgeBtn.label) + " aria-disabled=" + nudgeBtn.ariaDisabled
                   + " disabled=" + nudgeBtn.disabled + " count=" + JSON.stringify(nudgeBtn.count)
                 : "no primary on screen");
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

  /* ══ PHASE 6 · close, fill-in and note ════════════════════════════════════════════════════ */

  /**
   * ⚠️ THE FIRST RUN OF THIS BLOCK REPORTED SEVEN RED ABOUT A JOURNEY THAT IS NOT ON THIS BOARD.
   *
   * It opened the first card wearing the "Fix" pill and asked the fill-in's questions of it. Three
   * different journeys wear that pill — the single-query fill-in, the cohort, and an agent-record
   * gap, which is the DEFAULT bucket — so "the Fix card" is not a subject. The single fill-in is
   * raised only BELOW three gaps (above it the board shows one cohort card instead) and this
   * account has thirty-two, so it cannot appear here at all.
   *
   * That is the wrong-subject fault this round has now hit three times, and the fix is the same
   * every time: take a CENSUS first, name what is present, and let the absences be reported rather
   * than measured. Seven plausible reds about a page nobody was looking at is worse than one honest
   * "not on this board".
   */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);

  /** which journey a card resolves to, read from the pane rather than guessed from the pill */
  const paneSignature = async () => page.evaluate(`(() => {
    const vis = ${VIS};
    const t = (e) => (e ? (e.textContent || "").replace(/\\s+/g, " ").trim() : "");
    const one = (s) => [...document.querySelectorAll(s)].filter(vis)[0] || null;
    return {
      primary: t(one(".tpn .actbar .ab.go")),
      forkOpts: [...document.querySelectorAll(".tpn .fk")].filter(vis).map((x) => t(x.querySelector(".t"))),
      strip: t(one(".tpn .willrec")).replace(/^This records/, "").trim(),
    };
  })()`) as any;

  const fixCount = await page.evaluate(`(() => {
    const vis = ${VIS};
    return [...document.querySelectorAll(".tlc .row")].filter(vis)
      .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Fix").length;
  })()`) as number;
  const census: string[] = [];
  for (let i = 0; i < fixCount; i++) {
    await page.goto("/todo");
    await boardReady();
    await liftMotionSuppression(page);
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const fx = [...document.querySelectorAll(".tlc .row")].filter(vis)
        .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Fix");
      if (fx[${i}]) fx[${i}].click();
    })()`);
    await page.waitForTimeout(1600);
    const sig = await paneSignature();
    const which = (sig.forkOpts || []).some((t: string) => /remember/i.test(t)) ? "fillin"
      : /Log \d+ queries|Log the queries/.test(sig.primary || "") ? "bulk"
      : /Update the record/.test(sig.primary || "") ? "agentgap"
      : "unrecognised(" + JSON.stringify(sig.primary) + ")";
    census.push(which);
  }
  notes.push("FIX-BUCKET CENSUS: " + (census.length ? census.join(" · ") : "no Fix cards"));
  add("P6.1 · the census recognised every card wearing the Fix pill",
      census.length > 0 && census.every((c) => !c.startsWith("unrecognised")),
      census.length + " card(s): " + census.join(" · "));

  const hasFillin = census.includes("fillin");
  if (!hasFillin) {
    notes.push("NO SINGLE-QUERY FILL-IN ON THIS BOARD — the card is raised only below "
      + "BULK_MATERIALS_THRESHOLD (3) gaps and this account has enough to show the cohort instead. "
      + "Phase 6's fill-in claims are unit-locked in src/lib/journeyFillin.test.ts and are NOT "
      + "measured here. To measure them, an account with one or two unrecorded sends is needed.");
  }

  /* ── the strip grammars, on the flows this board DOES carry ─────────────────────────────── */

  /**
   * ⚠️ THE SEAM THIS PHASE OPENED. `JourneyFlow.strip` declared seven grammars and had no reader,
   * so every flow but the close and the send fell through to the CONSEQUENCES sentence — which
   * reads the expected reply and the nudge reminder, two answers a delay never asks for. Measured
   * before the fix: "Not yet — hold me to it" rendered "This records —".
   */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Send")) {
    await choose("Not yet — hold me to it");
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
      const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
      if (b) b.click();
    })()`);
    await page.waitForTimeout(900);
    const s1 = await paneSignature();
    add("P6.2 · a delay's strip says when the task returns, not a bare dash",
        !!s1.strip && s1.strip !== "—" && /returns/i.test(s1.strip) && /nothing on the query/i.test(s1.strip),
        "strip = " + JSON.stringify(s1.strip));
  } else {
    notes.push("no Send card — P6.2 not measured");
  }

  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Close")) {
    await choose("Leave it open for now");
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
      const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
      if (b) b.click();
    })()`);
    await page.waitForTimeout(900);
    const s2 = await paneSignature();
    add("P6.3 · the close's leave-it-open reads the same grammar, not the send's",
        !!s2.strip && s2.strip !== "—" && /returns/i.test(s2.strip),
        "strip = " + JSON.stringify(s2.strip));

    /* ⚠️ AND THE MUTE IS ONE OF THAT QUESTION'S ANSWERS, so the same grammar must speak for it */
    /* ⚠️ THE REOPEN AND THE PRESS ARE TWO EVALUATES, and the first version made them one — which
       reported "no Stop asking button" about a control that renders perfectly. The row's body is
       rendered only while it is OPEN (never hidden), so the buttons do not exist until React has
       re-rendered, and a synchronous query after the click reads the closed row. */
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((x) => (x.id || "").indexOf("s-again") >= 0);
      if (q && !q.classList.contains("open")) { const h = q.querySelector(".ql"); if (h && h.click) h.click(); }
    })()`);
    await page.waitForTimeout(900);
    const mutePicked = await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((x) => (x.id || "").indexOf("s-again") >= 0);
      if (!q) return false;
      const b = [...q.querySelectorAll(".seg button")]
        .find((x) => /stop asking/i.test((x.textContent || "")));
      if (!b) return false; b.click(); return true;
    })()`) as boolean;
    await page.waitForTimeout(900);
    const s3 = await paneSignature();
    add("P6.4 · and “Stop asking” states that it stops appearing, rather than naming a date",
        mutePicked && !!s3.strip && /stops appearing/i.test(s3.strip),
        "pressed=" + mutePicked + " strip = " + JSON.stringify(s3.strip));
  } else {
    notes.push("no Close card — P6.3 and P6.4 not measured");
  }

  /* ── the two grammars that were already right, kept as regression guards ─────────────────── */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Close")) {
    await choose("Close it now");
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
      const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
      if (b) b.click();
    })()`);
    await page.waitForTimeout(900);
    const s4 = await paneSignature();
    add("P6.5 · the close's own grammar survived the change — it still says WHICH close",
        !!s4.strip && /closed as/i.test(s4.strip) && /no response/i.test(s4.strip),
        "strip = " + JSON.stringify(s4.strip));
  }

  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Send")) {
    await choose("I’ve sent it");
    const s5 = await paneSignature();
    add("P6.6 · and the send still reads the consequences grammar rather than a dash",
        !!s5.strip,
        "strip = " + JSON.stringify(s5.strip) + " (unanswered send: a dash here is correct)");
  }

  /* ── the note journey: no card on this account, and the absence is reported ─────────────── */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Note")) {
    const n0 = await read();
    const nTitles = (n0?.forkOpts ?? []).map((o: any) => o.t);
    add("P6.7 · the note fork offers only the two things the app can add",
        nTitles.length === 2 && /tick it off/i.test(nTitles[0] || "") && /date/i.test(nTitles[1] || ""),
        "fork = " + JSON.stringify(nTitles));
    await choose("Tick it off");
    const tick = await read();
    const hasWhen = (tick?.rows ?? []).some((r: any) => (r.id || "").indexOf("s-when") >= 0);
    add("P6.8 · and ticking it off asks no When — the tick carries its own date",
        !!tick && !hasWhen,
        tick ? "rows = " + JSON.stringify((tick.rows || []).map((r: any) => r.label)) : "-");
  } else {
    notes.push("NO NOTE CARD ON THIS BOARD — the note journey's claims are unit-locked in "
      + "src/lib/journeyFillin.test.ts and are NOT measured here. To measure them, the account "
      + "needs one user-written note.");
  }

  /* ══ PHASE 7 · the filling primary ════════════════════════════════════════════════════════ */

  /**
   * ⚠️ THE ONE ASSERTION THIS PHASE EXISTS FOR. A truly disabled button is a dead end — no click,
   * no focus, nothing for a screen reader to explain, and no route to what is missing. It was set
   * for exactly one journey (the cohort at zero touched rows) and it was preventing the gate's own
   * handler from doing the thing that would have helped.
   */
  const neverDisabled: string[] = [];
  for (const kind of ["Send", "Close", "Chase", "Fix"]) {
    await page.goto("/todo");
    await boardReady();
    await liftMotionSuppression(page);
    if (!(await openCard(kind))) continue;
    let f = await primaryFacts();
    /* a fork is showing on most: choose the first option so a primary exists */
    if (!f || !f.label) {
      await page.evaluate(`(() => {
        const vis = ${VIS};
        const b = [...document.querySelectorAll(".tpn .fk")].filter(vis)[0];
        if (b) b.click();
      })()`);
      await page.waitForTimeout(1100);
      f = await primaryFacts();
    }
    if (!f) continue;
    neverDisabled.push(kind + "=" + (f.disabled ? "DISABLED" : "live") + "/aria:" + f.ariaDisabled);
  }
  add("P7.1 · no journey's primary is ever the `disabled` attribute",
      neverDisabled.length >= 3 && neverDisabled.every((s) => !s.includes("DISABLED")),
      neverDisabled.join(" · ") || "no primaries were reached");

  /* ── the fill, measured against the required list the count reads ── */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Send")) {
    await choose("I’ve sent it");
    const a = await primaryFacts();
    add("P7.2 · the count sits OUTSIDE the button, and the burgundy chip is gone from inside it",
        !!a && !a.chipInside && /still to answer/i.test(a.count || ""),
        a ? "count=" + JSON.stringify(a.count) + " chipInsideButton=" + a.chipInside : "-");

    add("P7.3 · and the button carries the truth for assistive tech without being switched off",
        !!a && a.disabled === false && a.ariaDisabled === "true"
          && !!a.describedBy && a.describedBy === a.countId,
        a ? "disabled=" + a.disabled + " aria-disabled=" + a.ariaDisabled
            + " describedby=" + (a.describedBy === a.countId ? "points at the count" : a.describedBy)
          : "-");

    /* ⚠️ THE FILL IS PROPORTIONAL, and this reads it against the SAME list the count states, so a
       bar that drifted from the sentence beside it could not pass. */
    const need = Number((a?.count || "").match(/^(\d+)/)?.[1] ?? NaN);
    const answered = 4 - need;
    add("P7.4 · the fill's width is answered ÷ required, within 1 point",
        !!a && a.hasFill && Number.isFinite(need) && a.pct !== null
          && Math.abs(a.pct - (answered / 4) * 100) <= 1,
        a ? "count says " + need + " of 4 outstanding → expect " + Math.round((answered / 4) * 100)
            + "% · measured " + a.pct + "%" : "-");

    /* ── answer one, and it advances ── */
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
      const b = q ? [...q.querySelectorAll(".seg button")][0] : null;
      if (b) b.click();
    })()`);
    await page.waitForTimeout(1200);
    const b2 = await primaryFacts();
    add("P7.5 · answering advances it",
        !!b2 && b2.pct !== null && !!a && a.pct !== null && b2.pct > a.pct,
        (a?.pct ?? "-") + "% → " + (b2?.pct ?? "-") + "%");

    /**
     * ⚠️ AND IT RECEDES. A progress indicator that only ever advances is lying about a form you can
     * revise. Reopening the answered day and choosing the picker leaves it revealed and EMPTY,
     * which the gate does not count as an answer — the same path a writer takes to change a date.
     */
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((x) => (x.id || "").indexOf("s-when") >= 0);
      if (q && !q.classList.contains("open")) { const h = q.querySelector(".ql"); if (h && h.click) h.click(); }
    })()`);
    await page.waitForTimeout(900);
    const removed = await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((x) => (x.id || "").indexOf("s-when") >= 0);
      if (!q) return false;
      const b = [...q.querySelectorAll(".seg button")]
        .find((x) => /another date|know the date/i.test((x.textContent || "")));
      if (!b) return false; b.click(); return true;
    })()`) as boolean;
    await page.waitForTimeout(1200);
    const b3 = await primaryFacts();
    add("P7.6 · and it RECEDES when an answer is removed",
        removed && !!b3 && b3.pct !== null && !!b2 && b2.pct !== null && b3.pct < b2.pct,
        "removed=" + removed + " · " + (b2?.pct ?? "-") + "% → " + (b3?.pct ?? "-") + "%");
  } else {
    notes.push("no Send card — P7.2 to P7.6 not measured");
  }

  /**
   * ⚠️ PRESSING IT WHILE FADED OPENS THE FIRST UNANSWERED QUESTION AND FOCUSES IT. This is the
   * route the `disabled` attribute was removing, so it is the assertion that says the removal was
   * worth making rather than merely permitted.
   */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  if (await openCard("Send")) {
    await choose("I’ve sent it");
    /* close whatever is open so the jump has somewhere to go, then press the faded primary */
    await clickIn(".tpn .actbar .ab.go");
    await page.waitForTimeout(1100);
    const jumped = await page.evaluate(`(() => {
      const vis = ${VIS};
      const open = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
      const miss = [...document.querySelectorAll(".tpn .miss")].filter(vis)[0];
      const act = document.activeElement;
      const inOpen = !!(open && act && open.contains(act));
      return {
        openId: open ? open.id : null,
        missing: miss ? (miss.textContent || "").replace(/\\s+/g, " ").trim() : "",
        focusInsideOpenRow: inOpen,
        activeTag: act ? act.tagName.toLowerCase() : "none",
      };
    })()`) as any;
    add("P7.7 · pressing it while faded opens the first unanswered question and names what is left",
        !!jumped && !!jumped.openId && /still to answer/i.test(jumped.missing),
        jumped ? "opened " + jumped.openId + " · line = " + JSON.stringify(jumped.missing.slice(0, 70))
          + " · focus in the row = " + jumped.focusInsideOpenRow + " (" + jumped.activeTag + ")" : "-");
  }

  /* ── the cohort's exception: faded, empty, and saying so in words ── */
  await page.goto("/todo");
  await boardReady();
  await liftMotionSuppression(page);
  const bulkOpened = await page.evaluate(`(() => {
    const vis = ${VIS};
    const rows = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Fix");
    for (const r of rows) { r.click(); return true; }
    return false;
  })()`) as boolean;
  if (bulkOpened) {
    /* the census above named which card is which; find the cohort by its counted label */
    for (let i = 0; i < census.length; i++) {
      if (census[i] !== "bulk") continue;
      await page.goto("/todo");
      await boardReady();
      await liftMotionSuppression(page);
      await page.evaluate(`(() => {
        const vis = ${VIS};
        const fx = [...document.querySelectorAll(".tlc .row")].filter(vis)
          .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Fix");
        if (fx[${i}]) fx[${i}].click();
      })()`);
      await page.waitForTimeout(1600);
      const bf = await primaryFacts();
      add("P7.8 · an untouched cohort is faded with an empty fill, and says so in words",
          !!bf && bf.disabled === false && bf.pct === 0 && /no queries filled in yet/i.test(bf.count || ""),
          bf ? "label=" + JSON.stringify(bf.label) + " disabled=" + bf.disabled
               + " fill=" + bf.pct + "% count=" + JSON.stringify(bf.count) : "-");
      break;
    }
  }

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
    "── journey round · Phases 1–7 · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green",
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
