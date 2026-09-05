/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneCommit — the pane's answers reaching the committers, and the takeover no longer opening.
 *
 * ⚠️ THE SEAM, NOT THE SURFACE. What broke here was never a writer: every committer was correct and
 * unreachable, and the primary opened a dialog instead. So these assert the JOIN — that the form's
 * value shape becomes the committers' value shape without losing an answer, and that the entrance
 * routes to a write rather than to a mount.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { paneCommits, paneCommitValues, paneSentYMD, paneExpectISO, paneNudgeISO } from "./paneCommit";
import type { JourneyKind } from "./paneJourney";
import { requiredFor as requiredForGate } from "./paneGate";
import { CLOSE_REASONS } from "./todoJourneys";
import { QueryStatus } from "../types";
import type { SendBodyValues } from "../components/todo/TaskPaneBody";
import { materialRowsFromAgent } from "./agentMaterials";
import { DEFAULT_CHECKBACK_DAYS } from "./todoWalk";

const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
/** ⚠️ comments stripped — this file's prose names every surface it deliberately stopped opening. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(read("../components/todo/ToDoPage.tsx"));
/**
 * ⚠️ THE PANE'S SESSION MOVED OUT OF THE PAGE (Pack B Phase 2) — `dockPrimary`, `gateAnswers`,
 * `dockTimeline`, `paneFacts` and the form's four states now live in `useTaskPaneSession`, so the
 * calendar can mount the same pane. Every law below is the law it was; only the file holding the
 * code changed. `slice` therefore looks in BOTH and says which, so the next relocation fails loudly
 * rather than silently reading nothing.
 */
const hook = decls(read("../components/todo/useTaskPaneSession.tsx"));
/**
 * ⚠️ AND THE COMMITTER LEFT IT TOO (Pack C Phase 1) — `commitFromPane` and its eight arms are
 * `useTaskCommit`'s, so the calendar writes through the same functions `/todo` does. Every law
 * below is the law it was; the search simply spans the three files the pane's code now occupies.
 */
const writer = decls(read("../components/todo/useTaskCommit.tsx"));

function slice(name: string): string {
  const hits = [page, hook, writer].filter((src) => src.includes(`function ${name}`));
  expect(hits.length, `${name} not found in the page, the session or the committer — the anchor moved`).toBe(1);
  const src = hits[0];
  const i = src.indexOf(`function ${name}`);
  const j = src.indexOf("\n  }", i);
  expect(j, `${name} has no end`).toBeGreaterThan(i);
  return src.slice(i, j);
}

const NOW = new Date("2026-08-21T09:00:00");
const body = (over: Partial<SendBodyValues> = {}): SendBodyValues => ({
  rows: materialRowsFromAgent([]), alongside: "", when: null, expect: null, remind: null, also: "",
  hold: null, checkin: null, again: null, ...over,
});

/* every member of the union, listed once — the compiler checks this list is complete */
const KINDS: JourneyKind[] = ["send", "chase", "close", "offer", "note", "fix", "materials"];

describe("⚠️ which journeys the pane commits — declared, never defaulted", () => {
  it("every journey states an answer", () => {
    for (const k of KINDS) expect(typeof paneCommits(k), `${k} has no declaration`).toBe("boolean");
  });

  /**
   * ⚠️ THE TWO FALSE ONES ARE THE POINT. An offer asks for a branch and a decision; an agent-record
   * gap asks for a response window, materials and a wish list. This form draws none of those, so
   * routing them to their committers would run a writer with nothing to write — behind a button
   * that had just told the writer it recorded something.
   */
  it("the two the form cannot answer keep the hand-off, and the other five do not", () => {
    expect(paneCommits("offer")).toBe(false);
    expect(paneCommits("fix")).toBe(false);
    for (const k of ["send", "chase", "close", "materials", "note"] as JourneyKind[]) {
      expect(paneCommits(k), `${k} still hands off`).toBe(true);
    }
  });
});

describe("⚠️ the pane's answers reach the committer's shape", () => {
  it("an unanswered day is null, and a revealed-but-empty date is too", () => {
    expect(paneSentYMD(null, NOW)).toBeNull();
    expect(paneSentYMD({ kind: "date", ymd: "" }, NOW)).toBeNull();
    expect(paneSentYMD({ kind: "today" }, NOW)).toBe("2026-08-21");
    expect(paneSentYMD({ kind: "yesterday" }, NOW)).toBe("2026-08-20");
    expect(paneSentYMD({ kind: "date", ymd: "2026-07-04" }, NOW)).toBe("2026-07-04");
  });

  /**
   * ⚠️ A WINDOW WITH NOTHING TO HANG OFF IS NOT A DATE. The pane requires both answers on a send, so
   * this is the shape of a journey mid-answer — and the honest output is absence, not today.
   */
  it("a window resolves only once there is a send date", () => {
    expect(paneExpectISO({ kind: "weeks", weeks: 6 }, null)).toBeUndefined();
    const iso = paneExpectISO({ kind: "weeks", weeks: 6 }, "2026-08-21");
    expect(iso).toBeTruthy();
    expect(new Date(iso!).getTime()).toBeGreaterThan(new Date("2026-09-25").getTime());
  });

  it("a lead is measured back from the expected reply, and needs one to exist", () => {
    const expectISO = new Date("2026-10-02T12:00:00").toISOString();
    expect(paneNudgeISO({ kind: "lead", days: 7 }, expectISO)!.slice(0, 10)).toBe("2026-09-25");
    /* "on the day" is a real answer and lands on the day, not near it */
    expect(paneNudgeISO({ kind: "lead", days: 0 }, expectISO)).toBe(expectISO);
    expect(paneNudgeISO({ kind: "lead", days: 7 }, undefined)).toBeUndefined();
  });

  /**
   * ⚠️ `No reminder` AND "not asked" BOTH RESOLVE TO ABSENT, and that is correct rather than lossy —
   * the difference between them is a fact about the conversation, not about the query.
   */
  it("declining a reminder writes nothing, and so does not having chosen", () => {
    expect(paneNudgeISO({ kind: "none" }, new Date().toISOString())).toBeUndefined();
    expect(paneNudgeISO(null, new Date().toISOString())).toBeUndefined();
  });

  /**
   * ⚠️ THE ANSWER THE WRITE ROUND RESCUED, ASSERTED AT THE JOIN. The send form REQUIRES an
   * expectation and a reminder; before this round they travelled as a takeover prefill, so the day
   * the primary began committing in place they would have been demanded and then dropped.
   */
  it("a fully answered send carries its expectation and its reminder into the values", () => {
    const v = paneCommitValues({
      kind: "send", now: NOW, queryMethod: "Post",
      body: body({ when: { kind: "today" }, expect: { kind: "weeks", weeks: 6 }, remind: { kind: "lead", days: 7 } }),
    });
    expect(v.sentDate).toBe("2026-08-21");
    expect(v.method).toBe("Post");
    expect(v.writerExpectedDate, "the expectation was dropped at the boundary").toBeTruthy();
    expect(v.nudgeDate, "the reminder was dropped at the boundary").toBeTruthy();
    /* the reminder sits a week before the expectation — one arithmetic, not two */
    expect(new Date(v.writerExpectedDate!).getTime() - new Date(v.nudgeDate!).getTime())
      .toBe(7 * 86400000);
  });

  it("an unanswered pair leaves both keys absent rather than stamping today", () => {
    const v = paneCommitValues({ kind: "send", now: NOW, body: body({ when: { kind: "today" } }) });
    expect("writerExpectedDate" in v && v.writerExpectedDate !== undefined).toBe(false);
    expect("nudgeDate" in v && v.nudgeDate !== undefined).toBe(false);
  });

  /**
   * ⚠️ THE CLOSE'S REASON IS FIXED BECAUSE THE JOURNEY IS. The close bucket is exactly
   * `no_response_close`, and the pane's own strip says "Closed as no response" before the press —
   * so the write agrees with the sentence the writer read. `null` would make the primary do nothing.
   */
  it("a close carries the reason its own strip promised, and nothing else does", () => {
    expect(paneCommitValues({ kind: "close", now: NOW, body: body({ when: { kind: "today" } }) }).reason)
      .toBe("no_reply");
    expect(paneCommitValues({ kind: "send", now: NOW, body: body() }).reason).toBeNull();
  });

  it("the chase carries the shared check-back default, not a second number", () => {
    expect(paneCommitValues({ kind: "chase", now: NOW, body: body() }).checkBackDays)
      .toBe(DEFAULT_CHECKBACK_DAYS);
  });

  /**
   * ⚠️ TWO FREE-TEXT FIELDS, TWO DESTINATIONS, AND SWAPPING THEM IS SILENT. "Anything else going
   * with it?" is part of the PARCEL (the committer appends it to materials); "Anything else?" is
   * the note kept on file. Both are strings, so nothing downstream would notice the exchange.
   */
  it("the parcel's extra and the remembered note do not change places", () => {
    const v = paneCommitValues({ kind: "send", now: NOW, body: body({ alongside: "author bio", also: "posted late" }) });
    expect(v.also).toBe("author bio");
    expect(v.note).toBe("posted late");
  });
});

describe("⚠️ the primary commits, and mounts nothing", () => {
  /**
   * ⚠️ THE SOURCE CLAIM, BOUNDED TO THE FUNCTION. `openFlowCards` still exists and is still right
   * for the two journeys this form cannot answer — so the assertion is not that the call is gone
   * from the file, but that it is GUARDED behind the declaration that names them.
   */
  it("dockPrimary routes to the write, and reaches the takeover only past `paneCommits`", () => {
    const body = slice("dockPrimary");
    /* ⚠️ THE LAW IS UNCHANGED AND STILL WHOLE IN ONE FUNCTION — commit, and reach the takeover only
       past the declaration. Post-move the primary calls the host rather than the page's own
       functions, so the names are `host.commit` and `host.openFlow`; the ORDER is the claim. */
    expect(body, "the primary stopped committing").toContain("host.commit(");
    expect(body, "the primary stopped building the pane's answers").toContain("paneCommitValues(");
    const guard = body.indexOf("paneCommits(");
    expect(guard, "the declaration is not consulted").toBeGreaterThan(-1);
    /* ⚠️ THERE ARE TWO HAND-OFF ROUTES NOW, AND THE LAW COVERS BOTH (journey round, Phase 3). The
       FLOW may declare `hand-off` — the offer and the agent-record gap, which this form does not
       draw — and that branch is reached BEFORE `paneCommits`, deliberately: a flow that says it
       hands off must not be asked whether its journey commits. The older route, past the
       declaration, survives for a card whose journey has no pane flow at all. Both are asserted, so
       neither can quietly disappear. */
    expect(body, "the flow's own hand-off vanished").toContain('w.kind === "hand-off"');
    const mounts = [...body.matchAll(/host\.openFlow\(/g)].map((m) => m.index ?? -1);
    expect(mounts.length, "the hand-off vanished — the two undrawn journeys have nowhere to go")
      .toBeGreaterThan(1);
    expect(mounts.some((i) => i > guard), "no hand-off survives past the declaration").toBe(true);
  });

  /**
   * ⚠️ THE PREFILL WAS THE BRIDGE, AND THE BRIDGE IS GONE FROM THIS PATH. It existed only to carry
   * the pane's answers ACROSS the takeover boundary. `setFlowPrefill` survives elsewhere — the
   * receipt's "Edit details" re-opens the journey with what the quick ✓ logged — so this is bounded
   * to `dockPrimary` rather than swept from the file.
   */
  it("the primary no longer prefills a takeover with answers it could write itself", () => {
    expect(slice("dockPrimary")).not.toContain("setFlowPrefill");
  });

  /**
   * ⚠️ ADVANCING IS GATED ON HAVING WRITTEN. A failed or empty commit that still moved the writer on
   * would report success by moving — the one receipt nobody reads and everybody believes.
   */
  it("it advances only on a commit that wrote", () => {
    const body = slice("dockPrimary");
    /* ⚠️ THIS LAW NOW SPANS THE SEAM, AND THE HALVES ARE ASSERTED SEPARATELY BECAUSE THEY LIVE IN
       TWO FILES. Gating on the write is the session's (below); reading the cursor off the board as
       it WAS is the page's, and it is no longer expressible as statement order — see the note on
       the page half. Saying so beats quietly asserting only the half that still reads whole. */
    /* ⚠️ THE CLAIM IS ABOUT THE COMMIT'S ADVANCE, AND THERE ARE OTHER ADVANCES NOW (journey round,
       Phase 3). A delay and a mute advance too — correctly, and with nothing to gate on, because
       `host.snooze`/`host.mute` are the writers and they have already run. A first-match `indexOf`
       therefore found the DELAY's advance, hundreds of characters before the commit's, and reported
       a law broken that is intact. The law is unchanged: the advance that follows a COMMIT is gated
       on that commit having written. */
    /* ⚠️ RETARGETED (drawer round, Phase 5), LAW UNCHANGED AND STRONGER: nothing moves unless the
       write landed. The failure branch now also STATES the failure (`setCommitFailed(true)`), and
       the success path hands over to `host.completed` — the page's receipt window — with
       `host.advance` as the fallback for hosts without one. The gate is still what separates them,
       and it is still consulted before anything downstream of a commit moves. */
    const wrote = body.indexOf("if (!wrote) { setCommitFailed(true); return; }");
    expect(wrote, "the commit's answer is not consulted before advancing").toBeGreaterThan(-1);
    const advances = [...body.matchAll(/host\.(?:advance|completed)/g)].map((m) => m.index ?? -1);
    expect(advances.some((i) => i > wrote), "the commit advances without consulting the write").toBe(true);
    /* ⚠️ AND THE HAND-OVER FALLS BACK, so a host without the receipt window still advances — a
       completion that goes nowhere on an older host would be a write with no visible consequence */
    expect(body.slice(wrote)).toContain("(host.completed ?? host.advance)(card);");
    /* and every advance BEFORE the gate belongs to a write that cannot fail silently — the delay
       and the mute, whose writers toast their own outcome */
    const beforeGate = body.slice(0, wrote);
    for (const m of beforeGate.matchAll(/host\.advance\(/g)) {
      const line = beforeGate.slice(Math.max(0, (m.index ?? 0) - 200), m.index);
      expect(/host\.(snooze|mute)\?\./.test(line),
        "something advances before the write gate that is not a delay or a mute").toBe(true);
    }

    /* ⚠️ THE PAGE HALF. The cursor is the page's, so the session hands it the CARD and never an
       index — which is what leaves the page free to resolve it against its own board. The
       "before the write" guarantee is now closure capture (the host object is the press-time
       render's, holding that render's `dockable`) rather than statement order, and source cannot
       see that. It is the rendered check's job, not this file's. */
    expect(page, "the page stopped owning the dock cursor").toContain("advance: (c) =>");
    expect(page, "the cursor stopped being resolved against the page's own board")
      .toMatch(/advance: \(c\) => \{[\s\S]{0,400}dockable\.findIndex/);
    expect(body, "the session started computing the cursor itself — that is the page's board")
      .not.toContain("const nextKey");
  });

  /**
   * ⚠️ THE SEND'S TWO ANSWERS REACH THE PAYLOAD. `markSentWriteArgs` has accepted both for a round;
   * what was missing was a committer that passed them. Asserted on the payload, not on the write
   * path, because the write path was never the thing that dropped them.
   */
  it("the send committer carries the expectation and the reminder", () => {
    const body = slice("commitSendFromPane");
    expect(body, "the expectation is dropped again").toContain("v.writerExpectedDate");
    expect(body, "the reminder is dropped again").toContain("v.nudgeDate");
  });

  /**
   * ⚠️ EVERY ARM REPORTS WHETHER IT WROTE. A committer returning `void` would make "did anything
   * happen" unanswerable at the entrance, and the pane would advance on all seven regardless.
   */
  it("the entrance and every arm it routes to return a verdict", () => {
    expect(slice("commitFromPane")).toContain("Promise<boolean>");
    for (const n of ["commitSendFromPane", "commitChaseFromPane", "commitCloseFromPane",
                     "commitMaterialsFromPane", "commitRecordSweep", "commitOfferFromPane",
                     "commitFixFromPane"]) {
      expect(slice(n), `${n} does not say whether it wrote`).toContain("Promise<boolean>");
    }
  });
});

/**
 * ⚠️ WHAT DIED AND WHAT SURVIVED (popup round, Phase 2).
 *
 * The takeover is NOT pane-only, so it does not die: `FocusFlow` is the Calendar's item sheet, the
 * Sunday review's engine and the sweep's. What died is the page's own orphans — functions the pane
 * path was built around, left with no caller when `PaneJourney.tsx` was deleted.
 */
describe("⚠️ the takeover survives; the pane's orphans do not", () => {
  it("FocusFlow keeps a caller that is not the pane, and is named here so no sweep takes it", () => {
    const cal = read("../components/todo/TodoCalendarPage.tsx");
    expect(cal, "the Calendar stopped mounting FocusFlow — it may now look dead").toContain("<FocusFlow");
    expect(cal).toContain('from "./FocusFlow"');
  });

  /**
   * ⚠️ THE PANE STILL REACHES IT, AND MUST — for the two journeys `paneCommits` declares false. A
   * lock forbidding the mount outright would be wrong: it would strand an offer and an agent-record
   * gap with no surface at all.
   */
  it("the pane's hand-off survives for exactly the journeys it is declared for", () => {
    /* ⚠️ THE LAW IS THE SAME AND THE ANCHOR NOW SPANS THE SEAM, so this follows the BEHAVIOUR
       rather than the file: the session must reach for the hand-off, and the page must wire that
       reach to the real `openFlowCards`. Asserting only the session's half would pass on a page
       that had quietly stopped mounting anything — which is the failure this lock exists for. */
    expect(hook, "the pane lost its hand-off entirely").toContain("host.openFlow(card)");
    expect(page, "the page stopped wiring the hand-off to the takeover")
      .toMatch(/openFlow: \(c\) => openFlowCards\(\[c\]\)/);
  });

  it.each(["commitSendMaterials", "commitSweep", "dismissRecordSweep", "leaveMaterialsUnrecorded"])(
    "%s stays deleted", (name) => {
      expect(page, `${name} came back`).not.toMatch(new RegExp(`function\\s+${name}\\s*\\(`));
    });
});

/**
 * ⚠️ THE CHASE'S DAY, AND WHY IT IS THE ONE JOURNEY WITH A FALLBACK (popup round, Phase 3).
 *
 * Found by measurement, not by reading: the chase requires no day, so `sentDate` reached
 * `commitChaseFromPane` empty, and its check-back arithmetic — `new Date("" + "T12:00:00")` —
 * produced an Invalid Date whose `.toISOString()` throws. The throw landed in an async callback
 * nobody awaited: the primary wrote nothing, said nothing, and left the card where it was.
 */
describe("⚠️ the chase commits with a real day", () => {
  it("an unanswered chase takes today — the day the quick rail already stamps", () => {
    const v = paneCommitValues({ kind: "chase", now: NOW, body: body() });
    expect(v.sentDate).toBe("2026-08-21");
  });

  /** the arithmetic the committer performs, run here so an Invalid Date fails at the seam */
  it("its check-back is a real instant, not an Invalid Date", () => {
    const v = paneCommitValues({ kind: "chase", now: NOW, body: body() });
    const check = new Date(new Date(`${v.sentDate}T12:00:00`).getTime() + v.checkBackDays * 86400000);
    expect(Number.isNaN(check.getTime()), "the check-back date is invalid — .toISOString() will throw")
      .toBe(false);
    expect(() => check.toISOString()).not.toThrow();
  });

  it("a writer who names a day is recorded on that day, not on today", () => {
    const v = paneCommitValues({ kind: "chase", now: NOW, body: body({ when: { kind: "yesterday" } }) });
    expect(v.sentDate).toBe("2026-08-20");
  });

  /**
   * ⚠️ AND NO OTHER JOURNEY GAINS ONE. `send`, `close` and `fix` either require a day or never read
   * it, so a fallback there would put a date in the record that nobody chose.
   */
  it("the fallback is the chase's alone", () => {
    for (const k of ["send", "close", "fix", "materials", "note"] as JourneyKind[]) {
      expect(paneCommitValues({ kind: k, now: NOW, body: body() }).sentDate,
        `${k} invented a day nobody chose`).toBe("");
    }
  });
});

/**
 * ⚠️ THE FORM DRAWS WHAT THE GATE REQUIRES (popup round, Phase 3) — found by measurement, and it
 * had made one primary permanently inert.
 *
 * `sample` was `!!sendSpecFor(card)`, which answers "what should go NOW". A materials fill-in is
 * recording what ALREADY went, so that is null — and the parcel section vanished while
 * `requiredFor("fix")` still demanded a parcel. On the page: the primary read "Log as sent · 1 to
 * answer", no unit section existed anywhere, and the jump target `#s-unit` was not in the document.
 * Unsatisfiable, with the gate correct throughout — the form was short a section.
 */
/**
 * ⚠️ THE STRIP SAYS ONLY WHAT THE ROWS CANNOT (workspace round, Phase 6).
 *
 * With the answers visible in the ledger, a strip that opened "Your full — 3 chapters — sent 13
 * August" stated the same three facts a second time, three centimetres below. What is left is the
 * FUTURE: the resolved reply date, and where the nudge lands. A window is an answer; the date it
 * resolves to is a consequence, and the consequence is what gets written.
 *
 * ⚠️ SOURCE, DELIBERATELY, AND ONLY FOR THE RETIREMENTS. "This clause is no longer written" is a
 * claim a source lock makes well. What the strip SAYS is a rendered-page claim and is measured in
 * `tests/e2e/workspaceRound.measure.ts` against the ledger beside it — which is the only form that
 * can catch a value appearing in both.
 */
/**
 * ⚠️ DELAY IS THE EXISTING SNOOZE, AND THE PRIMARY ROUTES ON THE FLOW (journey round, Phase 3).
 *
 * The fork made "Not yet — hold me to it" reachable in Phase 2 while the primary still routed on
 * the CARD's journey — so pressing "Set the reminder" would have run the SEND committer and
 * recorded a send. This asserts the seam: the flow's declared write decides, the delay writes reach
 * the host's snooze/mute rather than a committer, and no second dated-task path exists.
 */
describe("⚠️ a delay writes through the snooze primitive, never through a committer", () => {
  it("the primary reads the flow's declared write before it reaches any committer", () => {
    const body = slice("dockPrimary");
    const w = body.indexOf("const w = activeFlow.writes");
    const commit = body.indexOf("host.commit(");
    expect(w, "the primary no longer reads the flow's write").toBeGreaterThan(-1);
    expect(commit, "the primary no longer commits at all").toBeGreaterThan(-1);
    expect(w, "a committer is reached before the flow's write is consulted").toBeLessThan(commit);
  });

  it("the delay writes reach the host's snooze and mute, not a query writer", () => {
    const body = slice("dockPrimary");
    expect(body).toContain("host.snooze?.(card, days, activeFlow.primary)");
    expect(body).toContain("host.mute?.(card)");
    /* ⚠️ AND NO SECOND DATED-TASK PATH. A delay that wrote its own flag would be the thing Phase 3
       exists to avoid — one outcome, two writers, drifting apart. */
    expect(body, "the pane grew its own snooze write")
      .not.toMatch(/upsertTaskFlag|dismissTask|snoozedUntil/);
  });

  /* ⚠️ THE HOST'S SNOOZE IS THE ACTION BAR'S OWN `snoozeCard` — the same clamp, the same
     `snoozeVia` split, the same toast and the same undo. Asserted at the page, which is where the
     two are joined. */
  it("/todo hands the fork the same writer its action bar uses", () => {
    expect(page).toContain("snooze: (c, days, label) => snoozeCard(c, days, label)");
    /* the mute is the per-QUERY one. `hideType` mutes the RULE for every query and would be the
       wrong affordance under "stop asking about THIS one". */
    expect(page).toContain('dismissTask(c.taskType, c.relatedRecordId, "permanent")');
    /* ⚠️ NOT `slice("paneHost")` — IT IS A `const`, AND THE HELPER SAID SO, LOUDLY. `slice` anchors
       on `function <name>` and named the missing anchor rather than widening to the rest of the
       file, which is the behaviour `sliceBetween`'s own rule asks for. The claim is about one line
       and the page is where it lives. */
    expect(page, "the fork's mute reached the per-TYPE rule mute").not.toContain("mute: (c) => hideType");
  });

  it("Snooze leaves the action bar once an intent is chosen", () => {
    expect(hook).toContain("effectiveIntent === null && !paneVerbs.snooze.disabled");
    /* it is still offered while the fork shows — there it is one of the answers to "not now" */
    expect(hook, "Snooze was removed from the fork as well as from the flow")
      .toContain("onSnooze: (el: HTMLElement) => host.onSnooze?.(el)");
  });
});

describe("⚠️ the strip carries the consequences, not the answers", () => {
  /* ⚠️ NOT `slice("paneWill")` — IT IS A `const`, AND THE HELPER SAID SO. `slice` anchors on
     `function <name>` and failed LOUDLY naming the missing anchor, which is exactly what
     `sliceBetween`'s own rule asks for: a bounded read that cannot find its anchor must not widen
     silently to the rest of the file. The four sentences below are unique in the session, so the
     honest read is the whole file. */
  const will = hook;

  it("the parcel and the send date are no longer restated", () => {
    /* the two identifiers that composed the retired first sentence */
    expect(hook, "the strip is formatting the parcel again").not.toContain("formatSampleSpecs(paneBody.rows");
    expect(hook, "the strip is stating the send date again").not.toMatch(/`Sent \$\{longDay/);
    expect(hook, "the parcel's noun is back in the strip").not.toContain('"Your full" : "Your partial"');
  });

  /* ⚠️ THE LEAD IS NO LONGER ECHOED. "the week before" is the ledger's `Nudge reminder` answer;
     the strip states the DATE it resolves to, which is the thing that gets written. */
  it("the lead phrase is retired with the clause that read it back", () => {
    for (const src of [hook, page, writer]) {
      expect(src, "leadPhrase survives — the strip is echoing the writer's own answer")
        .not.toMatch(/["\s`(]leadPhrase[\s(]/);
    }
  });

  /* ⚠️ AND THE THREE JOURNEYS WITH THEIR OWN GRAMMAR KEEP IT. Close, note and bulk say something a
     row cannot: what closing MEANS, that a note is finished by the tick, and a cohort's count. */
  it("close, note and bulk keep their own sentences", () => {
    expect(will).toContain("Closed as ");
    expect(will).toContain("no response");
    expect(will).toContain("Your note, ticked off today.");
    expect(will).toContain("materials on ");
  });
});

describe("⚠️ a question the gate can require is a question the form asks", () => {
  it("the parcel section is drawn from the declaration, not from what should go next", () => {
    /* ⚠️ THE LAW IS UNCHANGED AND ITS EXPRESSION IS STRONGER (workspace round, Phase 3). This read
       `sample={requiredFor(journeyKind(card)).includes("unit")}` — one boolean per section, which
       is a per-section chance to get it wrong. The form is a LEDGER now and its rows ARE
       `requirementsFor(kind)`, so "the form draws what the gate requires" stopped being something
       the wiring has to remember and became something it cannot express otherwise: there is no
       per-section flag left to disagree with the declaration.

       ⚠️ AND THE `answered` HALF IS ASSERTED TOO. A ledger built from the declaration but ticked
       from a second reading of the values would still drift — so the row's `answered` must come
       from the requirement's own predicate over the gate's own answers. */
    /* ⚠️ RETARGETED, AND THE LAW IS UNCHANGED: the form draws what the gate requires. What moved is
       the LEVEL — the fork made "what does this journey require" a question with no answer, since a
       close's *close it now* needs a day and its *leave it open* needs a return date. The ledger
       reads the FLOW's list now, and while the fork is showing that list is empty, which is why the
       primary is absent rather than counting zero. */
    expect(hook, "the ledger stopped reading the declaration")
      .toContain("requirementsOf(activeFlow?.questions ?? []).map");
    expect(hook, "the open row stopped reading the same list")
      .toContain("unansweredOf(activeFlow?.questions ?? [], gateAnswers(card))");
    expect(hook, "the gate stopped reading the flow it is gating")
      .toContain("firstMissingOf(activeFlow.questions, gateAnswers(card))");
    /* the per-JOURNEY readings are gone from the pane — a survivor would be a second source */
    expect(hook, "a per-journey required list is back beside the flow's")
      .not.toMatch(/requirementsFor\(journeyKind|unanswered\(journeyKind|firstMissing\(kind/);
    expect(hook, "a row's tick stopped reading the gate's own predicate")
      .toContain("answered: r.isAnswered(gateAnswers(card))");
    expect(hook, "`sendSpecFor` decides the parcel section again — a fill-in has none")
      .not.toContain("sample={!!sendSpecFor(card)}");
    /* the retired per-section booleans, asserted GONE — a survivor would be a second table */
    expect(hook, "a per-section flag is back beside the declaration")
      .not.toMatch(/\bsample=\{|\bexpectations=\{|\bnextId=\{/);
  });

  /**
   * ⚠️ AND THE TWO JOURNEYS THAT REQUIRE A PARCEL ARE THE TWO THAT RECORD ONE. Stated as a set so
   * a journey gaining the requirement without gaining the section fails here rather than on a page.
   */
  it("exactly the journeys that require a parcel are send and the fill-in", () => {
    const withUnit = (["send", "chase", "close", "fix", "bulk", "note", "decide"] as const)
      .filter((k) => requiredForGate(k).includes("unit"));
    expect(withUnit).toEqual(["send", "fix"]);
  });
});

/**
 * ⚠️ THE SEND JOURNEY'S THREE TERMINI, AGAINST THE CONTRACT'S GREEN BLOCKS (journey round, Phase 4;
 * `design-refs/todo-two-journeys-full.html`). Each block says exactly what is written; these assert
 * that and — the harder half — that nothing else is.
 */
describe("⚠️ the send journey writes what the contract says, and nothing else", () => {
  /* "On press: materials 5 chapters · sent date 25 Aug · responseDeadline 6 Oct · nudgeDate 29 Sept
      · activity Partial sent → status derives to Partial sent" */
  it("I’ve sent it — the parcel, the day, the expectation and the reminder, all four", () => {
    const v = paneCommitValues({
      kind: "send", now: NOW, queryMethod: "Email",
      body: body({
        rows: [{ key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "5" }],
        when: { kind: "today" }, expect: { kind: "weeks", weeks: 6 }, remind: { kind: "lead", days: 7 },
      }),
    });
    expect(v.sentDate).toBe("2026-08-21");
    expect(v.materials.join(" ").toLowerCase()).toContain("chapters");
    expect(v.writerExpectedDate, "the expectation was dropped").toBeTruthy();
    expect(v.nudgeDate, "the reminder was dropped").toBeTruthy();
    /* ⚠️ AND NOTHING ELSE. A send is not a close, so it carries no reason — a `no_reply` riding
       along here would be a second fact the writer never stated. */
    expect(v.reason, "a send carried a close reason").toBeNull();
  });

  /**
   * ⚠️ "On press: activity Closed — withdrawn · close date 25 Aug → status derives to Closed.
   *    Board: every open task on this query resolves. NO REJECTION IS RECORDED ANYWHERE."
   */
  it("I’m not going to send it — the close records WITHDRAWN, and no rejection", () => {
    const v = paneCommitValues({
      kind: "close", now: NOW, closeReason: "withdrawn", body: body({ when: { kind: "today" } }),
    });
    expect(v.reason, "the withdrawal was recorded as a silence").toBe("withdrawn");
    /* the status the committer will write, read from the ONE table rather than restated here */
    const target = CLOSE_REASONS.find((r) => r.key === v.reason);
    expect(target?.status, "a withdrawal wrote a rejection").toBe(QueryStatus.WITHDRAWN);
    expect(target?.status).not.toBe(QueryStatus.REJECTED);
    expect(v.sentDate, "the close lost its day").toBe("2026-08-21");
  });

  /* and the close TASK's own close is still a silence — the default is unchanged */
  it("the close task itself still records no-response, and a nudge's crossover does too", () => {
    expect(paneCommitValues({ kind: "close", now: NOW, body: body({ when: { kind: "today" } }) }).reason)
      .toBe("no_reply");
    expect(paneCommitValues({ kind: "close", now: NOW, closeReason: "no_reply", body: body({ when: { kind: "today" } }) }).reason)
      .toBe("no_reply");
  });

  /* ⚠️ AND THE THREE REASONS REACH THREE DIFFERENT STATUSES. Asserted together so a future edit
     cannot collapse two of them onto one and leave the third looking correct. */
  it("the three close reasons are three different statuses", () => {
    const statuses = (["no_reply", "off_record", "withdrawn"] as const)
      .map((k) => CLOSE_REASONS.find((r) => r.key === k)?.status);
    expect(new Set(statuses).size, "two reasons write the same status").toBe(3);
    expect(statuses).toEqual([QueryStatus.NO_RESPONSE, QueryStatus.REJECTED, QueryStatus.WITHDRAWN]);
  });

  /**
   * ⚠️ "On press: no query fields, no activity — a dated task only." The delay terminus is asserted
   * at the SEAM in the delay-writes-through-snooze block above; this is its other half — that the
   * pane never builds commit values for it at all, because it never reaches a committer.
   */
  it("Not yet — hold me to it reaches no committer, so it can write no query field", () => {
    const body2 = slice("dockPrimary");
    const snoozeArm = body2.indexOf('w.kind === "snooze"');
    const commit = body2.indexOf("host.commit(");
    expect(snoozeArm, "the delay arm is gone").toBeGreaterThan(-1);
    expect(snoozeArm, "the delay arm is reached after a committer").toBeLessThan(commit);
    /* it returns rather than falling through — a delay that reached the commit below would write
       the send the contract says it must not */
    const arm = body2.slice(snoozeArm, commit);
    expect(arm, "the delay arm falls through to the committer").toContain("return;");
  });
});

/**
 * ⚠️ THE NUDGE JOURNEY (journey round, Phase 5) — against `todo-two-journeys-full.html`'s green
 * blocks: "activity Nudge sent · nudgeDate 25 Sept → status unchanged (a nudge is not a new
 * submission)" and "no query fields, no activity — the task's own return date only".
 */
describe("⚠️ the nudge journey writes a clock the writer chose, and never a status", () => {
  /* ⚠️ THE ROUND'S NAMED BUG. `requiredFor("chase")` was `[]` while this supplied
     `DEFAULT_CHECKBACK_DAYS` — so every nudge from the pane set a follow-up date nobody chose. */
  it("the check-in is the writer's answer, not the shared default", () => {
    const v = paneCommitValues({ kind: "chase", now: NOW, checkBackDays: 30, body: body({ when: { kind: "today" } }) });
    expect(v.checkBackDays, "the writer's clock was replaced by the default").toBe(30);
    expect(v.checkBackDays).not.toBe(DEFAULT_CHECKBACK_DAYS);
  });

  /* the default survives for a caller that supplies none — the quick rail states its own on a
     receipt — and the pane is simply no longer one of them */
  it("a caller that answers nothing still gets the shared default", () => {
    expect(paneCommitValues({ kind: "chase", now: NOW, body: body({ when: { kind: "today" } }) }).checkBackDays)
      .toBe(DEFAULT_CHECKBACK_DAYS);
  });

  /* ⚠️ "Don't ask again" IS AN ANSWER, AND IT TRAVELS AS ITS OWN FLAG. A far-future number would
     reach `logNudge` as a fabricated date on the query — the fault this round keeps closing. */
  it("declining a check-in travels as a flag, never as a sentinel date", () => {
    const v = paneCommitValues({ kind: "chase", now: NOW, noCheckIn: true, body: body({ when: { kind: "today" } }) });
    expect(v.noCheckIn).toBe(true);
    /* and the committer turns that into an ABSENT check-back rather than a distant one */
    expect(writer, "the committer still computes a date when the writer declined one")
      .toContain("...(v.noCheckIn ? {} : {");
  });

  /* ⚠️ A NUDGE IS NOT A NEW SUBMISSION. The activity is non-status by construction, so
     `recomputeQuery` ignores it and the query's own status cannot move. */
  it("a nudge writes a non-status activity, and touches neither status nor responseDeadline", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./logNudge.ts", import.meta.url), "utf8");
    const decls = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(decls, "the nudge gained a resulting status").not.toContain("resultingStatus");
    /* the ONLY query fields it touches, stated as a closed pair */
    const upd = decls.slice(decls.indexOf("queryUpdates:"), decls.indexOf("dismissal:"));
    expect(upd).toContain("lastNudgeSentDate");
    expect(upd, "the nudge started writing a status").not.toContain("status");
    expect(upd, "the nudge started moving the reply deadline").not.toContain("responseDeadline");
  });
});

/**
 * ⚠️ THE JOURNEY REPORTS, IT DOES NOT JUDGE — the register the contract states for the nudge:
 * matter-of-fact, no anxiety, no red. "Overdue" and "late" are verdicts about the AGENT, and this
 * app does not have the standing to make one.
 */
describe("⚠️ no journey calls an agent overdue or late", () => {
  it("the pane's own copy carries neither word", async () => {
    const fs = await import("node:fs");
    const files = [
      "../components/todo/TaskPane.tsx",
      "../components/todo/TaskPaneBody.tsx",
      "./journeys.ts",
    ];
    for (const f of files) {
      const src = fs.readFileSync(new URL(f, import.meta.url), "utf8");
      /* ⚠️ COMMENTS STRIPPED FIRST. This repo's prose names what it retires, and a lock forbidding a
         word will find it in the sentence explaining why it is forbidden. Seven false reds in one
         session came from exactly that. */
      const decls = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      /* ⚠️ AND `nudge_overdue` IS AN IDENTIFIER, NOT A WORD A READER SEES. Bounded so the task
         type cannot satisfy a claim about COPY — the prefix hazard, pointing the other way. */
      const hits = [...decls.matchAll(/[^_a-z](overdue|late)[^_a-z]/gi)].map((m) => m[1]);
      expect(hits, `${f} calls someone ${hits[0] ?? ""}`).toHaveLength(0);
    }
  });
});

/**
 * ⚠️ EVERYTHING A RENDER-TIME EXPRESSION READS IS DECLARED ABOVE IT (journey round, found by
 * measurement after `tsc` and 6,995 unit tests were green).
 *
 * `paneWill` is a `const` whose IIFE runs AT ITS DECLARATION. Phase 4 made it read `activeFlow` and
 * `closeReason` — declared two hundred lines below — and the compiler cannot see a temporal dead
 * zone through an immediately-invoked arrow. It threw at runtime:
 * `ReferenceError: Cannot access 'Rr' before initialization`, inside `useTaskPaneSession`, on every
 * render with a docked card. The whole To-do page fell into its error boundary the moment a task
 * was opened.
 *
 * ⚠️ THE COMPILER-VISIBLE HALF HAD ALREADY FIRED ONCE THIS ROUND — `closeReason` reading
 * `activeFlow` from the same scope was refused with TS2448, and moving one declaration looked like
 * the end of it. The same read from inside an IIFE is invisible to `tsc`, which is what CLAUDE.md
 * says about this bug and how it shipped anyway.
 *
 * ORDER is a source fact, so this is a source lock — the one thing a source lock does better than
 * anything else. A rendered check cannot catch it either: the page simply goes blank.
 */
describe("⚠️ nothing the strip reads is declared below the strip", () => {
  it("the fork's derivations precede `paneWill`, which runs at its declaration", () => {
    const at = (needle: string) => {
      const i = hook.indexOf(needle);
      expect(i, `${needle} is gone — this lock is reading a file that has moved on`).toBeGreaterThan(-1);
      return i;
    };
    const will = at("const paneWill");
    for (const dep of ["const activeId", "const effectiveIntent", "const activeFlow", "const closeReason"]) {
      expect(at(dep), `${dep} is declared BELOW paneWill, which reads it during render`)
        .toBeLessThan(will);
    }
  });

  /* ⚠️ AND THE STRIP REALLY DOES READ THEM, or the ordering claim above is about nothing. Both
     halves, because a lock that only asserts the order passes forever on a strip that stopped
     reading the flow — and that strip would be back to asserting a silence over a withdrawal. */
  /**
   * ⚠️ RETARGETED, AND THE LAW IS UNCHANGED (journey round, Phase 6). This required the strip to
   * read `activeFlow?.writes.kind`; Phase 6 made it read `activeFlow?.strip` instead, because the
   * grammar the flow DECLARES is the thing that should decide the sentence, and `writes.kind` was
   * standing in for it. The law being asserted is the same one — *the strip reads the active flow,
   * so the active flow must be declared above it* — and it survives the move: `activeFlow` is
   * still the identifier, still read during render, still above `paneWill`.
   *
   * ⚠️ AND WITHOUT THIS HALF THE ORDER LOCK IS VACUOUS. An ordering assertion over a consumer that
   * has stopped reading its dependencies passes forever.
   */
  it("and the strip does read them — so the order is load-bearing rather than incidental", () => {
    const will = hook.slice(hook.indexOf("const paneWill"), hook.indexOf("const paneWill") + 4000);
    expect(will, "the strip stopped reading the flow").toContain("activeFlow?.strip");
    expect(will, "the strip stopped reading the close's reason").toContain("closeReason");
  });

  /**
   * ⚠️ THE HOISTED-HELPER SHAPE, WHICH IS THE ONE THAT ACTUALLY CRASHED. A `function` declared
   * below `paneWill` is hoisted, so CALLING it from the strip is safe — but what it READS is not:
   * if the helper touches a `const` declared below `paneWill`, the strip's IIFE hits a temporal
   * dead zone at its own declaration and the whole page falls into its error boundary. `tsc`
   * cannot see through a helper, so this is the half no compiler covers.
   *
   * The strip calls `delayAnswerOf` and `dayPartLong`. `dayPartLong` reads only its argument;
   * `delayAnswerOf` reads `activeFlow` and `paneBody`, and both must be above the strip.
   */
  it("every const a strip-called helper reads is itself declared above the strip", () => {
    const at = (needle: string) => {
      const i = hook.indexOf(needle);
      expect(i, `${needle} is gone — this lock is reading a file that has moved on`).toBeGreaterThan(-1);
      return i;
    };
    const will = at("const paneWill");
    const willBody = hook.slice(will, will + 4000);
    /* BOTH halves: the strip really does call the helper, and the helper's own reads are above */
    expect(willBody, "the strip stopped calling delayAnswerOf").toContain("delayAnswerOf(");
    const helper = hook.slice(at("function delayAnswerOf"), at("function delayAnswerOf") + 400);
    /* a binding is either `const x =` or a destructured `const [x, setX] =` — find whichever */
    const declaredAt = (name: string) => {
      const plain = hook.indexOf(`const ${name}`);
      const destructured = hook.indexOf(`const [${name}`);
      const i = plain === -1 ? destructured : destructured === -1 ? plain : Math.min(plain, destructured);
      expect(i, `${name} is gone — this lock is reading a file that has moved on`).toBeGreaterThan(-1);
      return i;
    };
    for (const dep of ["activeFlow", "paneBody"]) {
      expect(helper, `delayAnswerOf stopped reading ${dep}`).toContain(dep);
      expect(declaredAt(dep),
        `${dep} is declared BELOW paneWill, which reads it through delayAnswerOf during render`)
        .toBeLessThan(will);
    }
  });
});
