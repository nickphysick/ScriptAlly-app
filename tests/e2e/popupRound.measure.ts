/**
 * THE POPUP ROUND — the pane's primaries commit, and nothing opens over the page.
 *
 * ⚠️ NO BACKTICKS AND NO BACKSLASH ESCAPES INSIDE ANY page.evaluate TEMPLATE. A backtick inside one
 * — even in a comment — terminates the string and the file fails to COLLECT: Playwright reports
 * "No tests found" while the previous run's report sits on disk looking current.
 *
 * ⚠️ THE REPORT IS UNLINKED AT MODULE SCOPE, so a run that dies in SETUP leaves no stale file to be
 * read as this run's answer.
 *
 * ⚠️ EACH JOURNEY IS MEASURED ONCE AND CONSUMES ITS SUBJECT. A primary that commits removes the
 * card, so the same row cannot be pressed twice — which is why every case reads the list fresh
 * rather than trusting an index taken at the start.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_PR_OUT ?? "run-artifacts/popup-round.txt";
rmSync(OUT, { force: true });
mkdirSync("reports/popup-round", { recursive: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

/** every surface that would count as "something opened over the page" */
const DLG = `[role=dialog],[role=alertdialog],[aria-modal=true],.tdb-ff,.dlg`;

const READ = `(() => {
  const vis = ${VIS};
  const all = (s) => [...document.querySelectorAll(s)].filter(vis);
  const rows = all(".tlc .row");
  const pane = all(".tpn .pane")[0];
  const deed = all(".tpn .deed")[0];
  return {
    rows: rows.length,
    texts: rows.map((r) => (r.textContent || "").replace(/\\s+/g, " ").trim()),
    dialogs: all(${JSON.stringify(DLG)}).map((e) => String(e.className || e.getAttribute("role"))),
    /* the pane's own heading identifies WHICH task is docked — the advance is read off this */
    /* ⚠️ THE SELECTED ROW IDENTIFIES THE DOCKED TASK, NOT THE PANE HEADING. Two chase cards share
       the deed "Worth a nudge", so a heading comparison reported "the pane did not move" about a
       pane that had moved to a different query. The row carries the agent and the query. */
    docked: all(".tlc .row.sel")[0]
      ? (all(".tlc .row.sel")[0].textContent || "").replace(/\\s+/g, " ").trim().slice(0, 70)
      : (pane ? "open-no-row" : null),
    deed: pane ? ((deed ? deed.textContent : "") || "").replace(/\\s+/g, " ").trim().slice(0, 46) : null,
    empty: all(".tdw-none").length > 0,
    primary: (all(".tpn .ab.go")[0] || {}).textContent || null,
    /* ⚠️ THE RECEIPT IS THE HONEST SIGNAL. A derived board can drop a card, keep it in a "done"
       group, or replace it with another that surfaced — three outcomes that look the same from a
       row count. The toast says whether a WRITE landed, and its Undo says it is reversible. */
    /* the To-do pages share their OWN toast (useTodoToast); the app-wide ToastProvider is a
       different host, and probing it reported "no receipt at all" about journeys that had just
       written and said so on screen */
    toast: all(".tdb-toast").map((t) => (t.textContent || "").replace(/\\s+/g, " ").trim()).join(" | "),
    undo: all(".tdb-toast-act").length,
  };
})()`;

/**
 * ⚠️ ONE ROW, BY INDEX, AND THE CALLER CHECKS WHETHER IT DOCKED. dockQueue excludes dateless notes
 * deliberately, so clicking one leaves the pane on whatever it already held — and a probe that
 * assumed the click landed went on to press ANOTHER card's primary and reported the result as this
 * journey's. The verification cannot happen in here: React has not re-rendered the selected row by
 * the time this expression returns.
 */
const OPEN = (pill: string, match: string, nth: number) => `(() => {
  const vis = ${VIS};
  const rows = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(pill)});
  const want = ${JSON.stringify(match)};
  const cands = want ? rows.filter((r) => (r.textContent || "").indexOf(want) > -1) : rows;
  const row = cands[${nth}];
  if (!row) return null;
  row.click();
  return (row.textContent || "").replace(/\\s+/g, " ").trim();
})()`;

/** click a button inside a required section by its exact label */
const PICK = (sect: string, label: string) => `(() => {
  const vis = ${VIS};
  const sec = document.querySelector(".tpn #" + ${JSON.stringify(sect)});
  if (!sec) return false;
  const b = [...sec.querySelectorAll("button")].filter(vis)
    .find((x) => (x.textContent || "").trim() === ${JSON.stringify(label)});
  if (!b) return false;
  b.click();
  return true;
})()`;

/** the sample amount — a unit and a number, which is what the gate calls an answered parcel */
const AMOUNT = `(() => {
  const vis = ${VIS};
  const sec = document.querySelector(".tpn #s-unit");
  if (!sec) return false;
  /* ⚠️ THE STEPPER, NOT THE TEXT BOX. The only <input> in this section is "Anything else going
     with it?"; the amount lives inside SampleSpecPicker behind aria-labelled steppers. Typing into
     the first input answered a different question entirely and left the gate correctly shut. */
  const more = [...sec.querySelectorAll("button")].filter(vis)
    .find((b) => /^More /.test(b.getAttribute("aria-label") || ""));
  if (!more) return false;
  more.click();
  return true;
})()`;

/** the cohort table — tick one row, which is the whole of what bulk requires */
const TICK_BULK = `(() => {
  const vis = ${VIS};
  const t = [...document.querySelectorAll(".tpn .bulk")].filter(vis)[0];
  if (!t) return false;
  const b = [...t.querySelectorAll("button.tick")].filter(vis)[0];
  if (!b) return false;
  b.click();
  return true;
})()`;

/** what the two stuck sections contain when the gate refuses — read, never guessed at */
const DIAG = `(() => {
  const vis = ${VIS};
  const sec = document.querySelector(".tpn #s-unit");
  const tbl = document.querySelector(".tpn .bulk");
  return {
    unit: sec ? [...sec.querySelectorAll("button")].filter(vis)
      .map((b) => ((b.textContent || "").trim() || "-") + "/" + (b.getAttribute("aria-label") || "-")) : null,
    unitInputs: sec ? [...sec.querySelectorAll("input")].filter(vis)
      .map((i) => (i.getAttribute("aria-label") || i.className) + "=" + i.value) : null,
    bulk: !!tbl,
    ticks: tbl ? [...tbl.querySelectorAll("button.tick")].length : 0,
    paneTables: [...document.querySelectorAll(".tpn table")].map((t) => t.className),
  };
})()`;

const PRESS = `(() => {
  const vis = ${VIS};
  const b = [...document.querySelectorAll(".tpn .ab.go")].filter(vis)[0];
  if (!b) return false;
  b.click();
  return true;
})()`;

test("popup round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  /* ⚠️ THE PAGE'S OWN ERRORS ARE EVIDENCE. A committer that throws inside an un-awaited callback
     writes nothing and says nothing on screen — the console is the only place it surfaces. */
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errs.push("pageerror: " + String(e.message).slice(0, 160)));

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForSelector(".tlc .row", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const at_rest = await page.evaluate(READ) as { rows: number; dialogs: string[] };
  add("P0.1 nothing is open at rest", at_rest.dialogs.length === 0,
    `${at_rest.rows} rows, dialogs=[${at_rest.dialogs.join(", ")}]`);

  /**
   * ⚠️ ONE JOURNEY, END TO END. Open a row, answer what it requires, press, and read the page —
   * dialogs, the list, and which task the pane is now showing. The three are read in ONE evaluate
   * so they describe the same frame; three separate reads would let the list update between them.
   */
  async function journey(id: string, pill: string, answers: string[], match = "") {
    /* ⚠️ ONE JOURNEY PER PAGE. Every commit reshapes the derived board the NEXT case targets — and
       a pane left open on a card the previous case could not commit is still open when the next
       one presses. Three runs produced results that read like app faults and were cross-talk: a
       Note case that pressed a send card's primary, and a fill-in that inherited the pane before
       it. A reload is the cheapest isolation there is. */
    await page.goto("/todo");
    /* ⚠️ WAIT FOR THE BOARD, NOT FOR A NUMBER. A fixed 7s is ample locally and short against the
       deployed site: the FIRST case looked at a board that had not finished deriving and reported
       "no Close row would dock" while a census taken a minute later found one. A timeout that
       passes on one target and fails on another is not a measurement of either. */
    await page.waitForSelector(".tlc .row", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const before = await page.evaluate(READ) as { rows: number; texts: string[]; docked: string | null };
    /* try each candidate until one actually becomes the selected row */
    let opened: string | null = null;
    for (let n = 0; n < 5; n++) {
      const t = await page.evaluate(OPEN(pill, match, n)) as string | null;
      if (!t) break;
      await page.waitForTimeout(900);
      const cur = await page.evaluate(READ) as { docked: string | null };
      if (cur.docked && t.startsWith(cur.docked.slice(0, 28))) { opened = t; break; }
    }
    if (!opened) { add(id, false, "NOT RUN — no " + pill + " row would dock" + (match ? " (" + match + ")" : "")); return; }
    await page.waitForTimeout(900);

    for (const a of answers) {
      if (a === "when") await page.evaluate(PICK("s-when", "Today"));
      else if (a === "expect") await page.evaluate(PICK("s-expect", "6 weeks"));
      else if (a === "remind") await page.evaluate(PICK("s-remind", "The week before"));
      else if (a === "unit") { await page.evaluate(PICK("s-unit", "Pages")); await page.evaluate(AMOUNT); }
      else if (a === "bulk") await page.evaluate(TICK_BULK);
      await page.waitForTimeout(260);
    }

    const armed = await page.evaluate(READ) as { primary: string | null; docked: string | null };
    if (/to answer|Log 0/.test(String(armed.primary))) {
      const why = await page.evaluate(DIAG);
      add(id + " · DIAGNOSTIC the gate is shut", false, JSON.stringify(why).slice(0, 300));
    }
    const pressed = await page.evaluate(PRESS);
    if (!pressed) { add(id, false, "NOT RUN — no primary rendered"); return; }
    /* ⚠️ THE RECEIPT IS READ FIRST — it expires in about six seconds, and the board needs longer
       than that to settle. Reading the board first would lose the one signal that says a write
       happened at all. */
    await page.waitForTimeout(1400);
    const receipt = await page.evaluate(READ) as { toast: string; undo: number; dialogs: string[] };
    /* the write is a round trip; the board is derived from the listener that follows it */
    await page.waitForTimeout(3600);

    const after = await page.evaluate(READ) as
      { rows: number; texts: string[]; dialogs: string[]; docked: string | null; deed: string | null; empty: boolean };

    await page.screenshot({ path: "reports/popup-round/" + id.split(" ")[0] + "-" + pill.toLowerCase() + ".png" });

    const key = opened.slice(0, 60);
    const gone = !after.texts.some((t) => t.startsWith(key));
    const advanced = after.empty || (after.docked !== null && after.docked !== armed.docked);
    const wrote = /Done|Recorded|Saved|Closed|Logged|Nudge/i.test(receipt.toast);

    add(id + " · no dialog opened", after.dialogs.length === 0 && receipt.dialogs.length === 0,
      after.dialogs.length || receipt.dialogs.length
        ? "opened: " + [...receipt.dialogs, ...after.dialogs].join(", ")
        : "none — before the press, during the receipt, and after");
    add(id + " · it wrote, and said so reversibly", wrote && receipt.undo > 0,
      receipt.toast ? receipt.toast.slice(0, 64) : "no receipt at all — the primary was inert"
        + " (primary read: " + String(armed.primary).slice(0, 34) + ")");
    add(id + " · the task left the list", gone,
      "rows " + before.rows + " to " + after.rows + (gone ? "" : " — the row is still listed"));
    add(id + " · the pane moved on", advanced,
      after.empty ? "empty state" : "now: " + String(after.deed));
  }

  await journey("P1 close", "Close", ["when"]);
  await journey("P2 chase", "Chase", []);
  await journey("P3 send", "Send", ["unit", "when", "expect", "remind"]);
  await journey("P4 note", "Note", []);
  /**
   * ⚠️ P5 IS A HAND-OFF CASE, NOT A COMMIT CASE, AND THAT IS THE APP BEING RIGHT. The only single
   * fill-in this account holds is "agent not specified" — a fix card with no agent to resolve, for
   * which `paneJourneyKind` returns undefined by design ("a journey of zero steps and a footer
   * offering to save nothing"). So the correct outcome is the takeover, exactly as for an offer.
   * A committable single fill-in — one with an agent — does not exist here to press.
   */
  await journey("P6 bulk", "Fix", ["bulk"], "missing their materials");

  /**
   * ⚠️ AND THE TWO DECLARED HAND-OFFS STILL HAND OFF. An offer asks three questions this form does
   * not draw; committing it here would run a writer with nothing to write. This asserts the
   * takeover DOES open — the one case in the round where a dialog is the correct outcome.
   */
  /* the fix card with no resolvable agent — the second declared hand-off */
  const openedFix = await page.evaluate(OPEN("Fix", "agent not specified", 0));
  if (openedFix) {
    await page.waitForTimeout(1400);
    /* ⚠️ ANSWERED FIRST. Pressed unanswered, the gate teaches instead — which is correct, and is a
       measurement of the gate rather than of the hand-off. The claim here is what happens when the
       primary is ARMED and the journey is one the pane cannot commit. */
    await page.evaluate(PICK("s-unit", "Pages"));
    await page.waitForTimeout(300);
    await page.evaluate(PICK("s-when", "Today"));
    await page.waitForTimeout(300);
    await page.evaluate(PRESS);
    await page.waitForTimeout(2200);
    const d = await page.evaluate(READ) as { dialogs: string[] };
    add("P5 a fix card with no agent hands off, as declared", d.dialogs.length > 0,
      d.dialogs.length ? d.dialogs.join(", ") : "nothing opened — the card has no surface at all");
  } else {
    add("P5 a fix card with no agent hands off, as declared", false, "NOT RUN — no such row");
  }

  await page.goto("/todo");
  await page.waitForTimeout(7000);
  const openedOffer = await page.evaluate(OPEN("Decide", "", 0));
  if (openedOffer) {
    await page.waitForTimeout(1200);
    await page.evaluate(PRESS);
    await page.waitForTimeout(2200);
    const d = await page.evaluate(READ) as { dialogs: string[] };
    await page.screenshot({ path: "reports/popup-round/P7-offer-handoff.png" });
    add("P7 the declared hand-off still opens the takeover", d.dialogs.length > 0,
      d.dialogs.length ? d.dialogs.join(", ") : "nothing opened — the offer has no surface at all");
  } else {
    add("P7 the declared hand-off still opens the takeover", false, "NOT RUN — no Decide row");
  }

  if (errs.length) add("P8 the page threw nothing while committing", false, errs.slice(0, 4).join(" ;; "));
  else add("P8 the page threw nothing while committing", true, "console clean across all seven presses");

  const lines = out.map((r) => (r.ok ? "PASS  " : "FAIL  ") + r.id + (r.note ? "   [" + r.note + "]" : ""));
  const pass = out.filter((r) => r.ok).length;
  writeFileSync(OUT, lines.join("\n") + "\n\n" + pass + " / " + out.length + " green\n");
});
