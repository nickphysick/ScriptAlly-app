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

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);
  await liftMotionSuppression(page);

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
  await page.waitForTimeout(6000);
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
  await page.waitForTimeout(6000);
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

  /* ══ SCREENSHOTS ══════════════════════════════════════════════════════════════════════════ */
  const shoot = async (name: string, kind: string, steps?: () => Promise<void>) => {
    await page.goto("/todo");
    await page.waitForTimeout(5500);
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

  const red = out.filter((r) => !r.ok);
  const lines = [
    "── journey round · Phases 1–3 · " + out.length + " assertions · " + red.length + " RED · " + (out.length - red.length) + " green",
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
