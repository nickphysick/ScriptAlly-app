/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The journey takeover — one chrome, six journeys, and the calendar (journeys pack, Phase 4;
 * ref design-refs/todo-workspace-v14.html).
 *
 * ⚠️ EVERY SOURCE LOCK HERE STRIPS COMMENTS FIRST. This codebase documents each retirement by
 * quoting what it retired, so a bare `toContain` over raw source finds the token it forbids inside
 * the prose explaining why it was removed — seven false reds in one session. The dangerous
 * direction is the other one: a `toContain` that passes because a COMMENT mentions the thing the
 * code no longer does is a lock that has quietly stopped checking anything.
 *
 * ⚠️ AND WHERE A BEHAVIOUR IS A PURE FUNCTION, IT IS TESTED AS ONE. `cardJourney`,
 * `journeyMaterials`, `journeySummary` and the calendar's maths are all exported, so the routing,
 * the conditional row, the summary and the bounds are asserted by CALLING them. There is no jsdom
 * in this repo (`vitest.config.ts` is `environment: 'node'`), so a source lock cannot see a runtime
 * crash — it proves code was written, not that it ran. Reserve it for what only source can show.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
/* ⚠️ IMPORTED FROM `lib/`, NOT FROM THE COMPONENT. `FocusFlow.tsx` pulls in `db.tsx`, which
   initialises Firebase at module load — so anything exported from there can only ever be asserted
   as a source string. These are pure, so they are tested by CALLING them. */
import { cardJourney, CLOSE_REASONS, isSendTask } from "../../lib/todoJourneys";
import { journeyMaterials, journeySummary } from "../../lib/journeyMaterials";
import { cardBucket, Bucket } from "../../lib/todoBuckets";
import { canStep, monthCells, outOfRange, shortDate, boundsNote, WEEKDAY_INITIALS } from "../../lib/recordingCalendar";
import type { BoardCard } from "../../lib/todoBoard";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(here, p), "utf8");
/** ⚠️ COMMENTS OUT BEFORE ANY ASSERTION — see the header. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const flow = decls(read("FocusFlow.tsx"));
const cal = decls(read("RecordingCalendar.tsx"));
const css = decls(read("todo.css"));

const card = (over: Partial<BoardCard>): BoardCard =>
  ({ key: "k", title: "t", ...over }) as unknown as BoardCard;

/* ── 1 · each bucket opens its own journey ──────────────────────────────────────────────────── */

describe("⚠️ EACH BUCKET OPENS ITS OWN JOURNEY", () => {
  /**
   * ⚠️ THE TABLE IS ASSERTED AGAINST `cardBucket`, NOT AGAINST LITERAL BUCKET NAMES. Writing
   * `expect(cardJourney(x)).toBe("resubmit")` beside `expect(bucket).toBe("decide")` as two
   * literals would go green the day the two mappings disagreed — which is exactly the fault that
   * hid the R&R rows: a test naming `"send"` for a card whose bucket is `decide`.
   */
  const CASES: { taskType?: string; userTaskId?: string; bucket: Bucket; journey: string }[] = [
    { taskType: "full_requested", bucket: "send", journey: "send" },
    { taskType: "partial_requested", bucket: "send", journey: "send" },
    { taskType: "revise_resubmit", bucket: "decide", journey: "resubmit" },
    { taskType: "offer_received", bucket: "decide", journey: "offer" },
    { taskType: "nudge_overdue", bucket: "chase", journey: "nudge" },
    { taskType: "no_response_close", bucket: "close", journey: "stale" },
    { taskType: "data_quality_poor", bucket: "fix", journey: "dq" },
    { taskType: "user_task", userTaskId: "u1", bucket: "note", journey: "note" },
  ];

  it("every live task type routes to its own journey, and to the bucket that names it", () => {
    for (const c of CASES) {
      const subject = card({ taskType: c.taskType, ...(c.userTaskId ? { userTaskId: c.userTaskId } : {}) });
      expect(cardBucket(subject), `bucket for ${c.taskType}`).toBe(c.bucket);
      expect(cardJourney(subject), `journey for ${c.taskType}`).toBe(c.journey);
    }
  });

  /**
   * ⚠️ THE R&R IS THE ONE THAT PROVES THE POINT. Its bucket is `decide` and its journey is
   * `resubmit` — the two deliberately disagree, because the ACT is a judgement and the RECORDING
   * is a send. A card whose journey merely followed its bucket would have gone back to being a
   * send sheet with no revision rows.
   */
  it("an R&R's bucket and journey differ on purpose, and its materials survive the difference", () => {
    const rr = card({ taskType: "revise_resubmit" });
    expect(cardBucket(rr)).not.toBe(cardJourney(rr));
    const m = journeyMaterials(cardBucket(rr), "revise_resubmit", "held", "Greg");
    expect(m.rows.map((r) => r.label)).toEqual(["The revised manuscript", "A note on what changed"]);
    expect(m.rows.every((r) => r.on)).toBe(true);
  });

  /**
   * ⚠️ THE FALL-THROUGH IS A HAND-OFF, NOT A SEND. `sendSheet` is now reached by NAME, so an
   * unrecognised task type cannot be offered "Mark sent" for something that is not a send.
   */
  it("only the two send task types reach sendSheet; everything else hands off by bucket", () => {
    /* the gate is a NAMED predicate, so the two send types cannot drift apart from the journeys */
    expect(isSendTask("partial_requested")).toBe(true);
    expect(isSendTask("full_requested")).toBe(true);
    for (const t of ["nudge_overdue", "no_response_close", "offer_received", "revise_resubmit",
      "data_quality_poor", "exclusive_expiring", undefined]) {
      expect(isSendTask(t), `${t} is treated as a send`).toBe(false);
    }
    const gate = "if (isSendTask(it.card.taskType)) return sendSheet(it.card);";
    expect(flow.indexOf(gate), "the fall-through no longer gates on isSendTask").toBeGreaterThan(-1);
    const after = flow.slice(flow.indexOf(gate));
    expect(after).toContain('handoffSheet(it.card, bucket === "decide" ? "decide" : "fix")');
  });
});

/* ── Decide and Fix write nothing ───────────────────────────────────────────────────────────── */

describe("⚠️ DECIDE AND FIX RECORD NOTHING, AND SAY SO", () => {
  const anchor = 'function handoffSheet(c: BoardCard, kind: "decide" | "fix") {';
  it("the hand-off journey calls no write path at all", () => {
    expect(flow.indexOf(anchor), "handoffSheet is gone or renamed").toBeGreaterThan(-1);
    const body = sliceBetween(flow, anchor, "function nudgeSheet(c: BoardCard)");
    expect(body.length, "the handoffSheet slice came out empty").toBeGreaterThan(200);
    /* every write this component can perform, named once */
    for (const w of ["recordMaterialsSent", "logNudge", "updateQueryStatus", "updateUserTask",
      "updateAgent", "recordOfferDecision", "dismissTask", "upsertTaskFlag", "stageAndAdvance", "setStaged"]) {
      expect(body, `handoffSheet reached for ${w}`).not.toContain(w);
    }
  });

  it("its commit verb navigates, and its hint says nothing is recorded", () => {
    const body = sliceBetween(flow, anchor, "function nudgeSheet(c: BoardCard)");
    expect(body).toContain('hint: "Nothing is recorded here."');
    expect(body).toContain("onCommit: () => requestExit(");
    expect(body).toContain("onNavigate(");
    /* ⚠️ THE SUMMARY STRIP IS MANDATORY EVEN HERE — and on a journey that writes nothing the honest
       thing for it to say is that nothing is going on the record, not to render an empty sentence. */
    expect(body).toContain('summary: "Nothing goes on the record here."');
  });
});

/* ── 2 · Escape and Cancel abandon with no write ────────────────────────────────────────────── */

describe("⚠️ ESCAPE AND CANCEL ABANDON A PART-FILLED JOURNEY WITH NO WRITE", () => {
  it("Escape routes through requestExit, which closes and writes nothing", () => {
    expect(flow).toContain('if (e.key === "Escape") requestExit();');
    const anchor = "async function requestExit(after?: () => void) {";
    expect(flow.indexOf(anchor), "requestExit is gone or renamed").toBeGreaterThan(-1);
    const body = flow.slice(flow.indexOf(anchor), flow.indexOf("useEffect(() => {", flow.indexOf(anchor)));
    expect(body.length, "the requestExit slice came out empty").toBeGreaterThan(80);
    expect(body).toContain("onClose();");
    /* the ONLY thing it may do besides confirm + close is run the caller's navigation */
    for (const w of ["recordMaterialsSent", "logNudge", "updateQueryStatus", "updateUserTask", "updateAgent", "applyStaged"]) {
      expect(body, `requestExit reached for ${w}`).not.toContain(w);
    }
  });

  it("the journey footer's Cancel is the same door as Escape", () => {
    expect(flow).toContain('<button type="button" className="tdb-ffskip" onClick={() => requestExit()}>Cancel</button>');
  });

  /**
   * ⚠️ ABANDONING MUST ALSO NOT LEAVE THE NEXT ITEM PRE-FILLED. `alsoText` was missing from
   * `resetScratch`, so a note typed against one agent arrived filled in against the next — the
   * quietest kind of wrong, because the form looked correct.
   */
  it("every journey scratch field is cleared when the walk crosses an item", () => {
    const anchor = "const resetScratch = () => {";
    expect(flow.indexOf(anchor), "resetScratch is gone or renamed").toBeGreaterThan(-1);
    const body = flow.slice(flow.indexOf(anchor), flow.indexOf("};", flow.indexOf(anchor)));
    for (const setter of ["setAlsoText(\"\")", "setWhenMode(\"today\")", "setCheckBack(", "setCloseReason(", "setCalAnchor(null)", "setMats({})"]) {
      expect(body, `resetScratch does not clear ${setter}`).toContain(setter);
    }
  });

  /**
   * ⚠️ A CONTROL WHOSE STATE IS NOT IN THE MEMO'S DEPS VISIBLY DOES NOTHING. `content` is memoised
   * over the scratch it reads, and `alsoText` was absent — so the Caveat field was FROZEN and the
   * live summary it feeds could never move. This is the assertion that would have caught it.
   */
  it("every journey scratch field is in the content memo's deps", () => {
    const at = flow.indexOf("}, [atReview, qi, step, items,");
    expect(at, "the content memo's dep array moved").toBeGreaterThan(-1);
    const deps = flow.slice(at, flow.indexOf("]", at));
    for (const dep of ["alsoText", "whenMode", "checkBack", "closeReason", "calAnchor", "sentDate", "method", "mats"]) {
      expect(deps, `${dep} is read by a journey but missing from the memo deps`).toContain(dep);
    }
  });
});

/* ── 3 · the conditional synopsis row ───────────────────────────────────────────────────────── */

describe("⚠️ THE SYNOPSIS ROW APPEARS ONLY ON A KNOWN ABSENCE, AND STATES WHY", () => {
  it("a package that shows no synopsis went earns the row, unticked, with its reason", () => {
    const m = journeyMaterials("send", "full_requested", "none", "Greg");
    const syn = m.rows.find((r) => r.id === "synopsis");
    expect(syn, "no synopsis row on a known absence").toBeTruthy();
    expect(syn!.on, "the row is pre-ticked — the record cannot say the writer means to send one").toBe(false);
    expect(syn!.sub, "the row does not justify itself on screen").toMatch(/no synopsis/i);
  });

  it("a held synopsis is not offered, and the omission is accounted for once", () => {
    const m = journeyMaterials("send", "full_requested", "held", "Greg");
    expect(m.rows.some((r) => r.id === "synopsis")).toBe(false);
    expect(m.note).toMatch(/already holds/i);
  });

  /* ⚠️ NO PACKAGE MEANS UNKNOWN, NOT "none" — silence is not an absence, and treating it as one
     would put a claim about the agency's submission route on most historical queries. */
  it("an unknown synopsis state offers nothing AND claims nothing", () => {
    const m = journeyMaterials("send", "full_requested", "unknown", "Greg");
    expect(m.rows.some((r) => r.id === "synopsis")).toBe(false);
    expect(m.note).toBeNull();
  });

  it("the journey reads the package STRUCTURALLY, never by parsing a display string", () => {
    expect(flow).toContain("synopsisStateFor(");
    expect(flow).toContain("isSlotFilled");
    /* `details` is displayed, never parsed — no journey may read it to decide anything */
    expect(flow).not.toMatch(/\.details\s*\.(includes|match|indexOf|split)/);
  });
});

/* ── 4 · the summary strip ──────────────────────────────────────────────────────────────────── */

describe("⚠️ THE SUMMARY STRIP READS LIVE FORM STATE, AND IS MANDATORY", () => {
  it("it reflects ticks, the segment and the free text together", () => {
    const s = journeySummary({
      materials: ["The revised manuscript", "A note on what changed"],
      channel: "Agency portal",
      when: "12 Aug",
      also: "a revised synopsis",
    });
    expect(s).toContain("the revised manuscript");
    expect(s).toContain("a note on what changed");
    expect(s).toContain("agency portal");
    /* ⚠️ THE DATE KEEPS ITS CASE — "12 aug" is a date the app has damaged */
    expect(s).toContain("12 Aug");
  });

  it("a cleared form says so plainly rather than rendering an empty sentence", () => {
    expect(journeySummary({ materials: [] })).toBe("Nothing selected yet.");
    expect(journeySummary({ materials: [], also: "   " })).toBe("Nothing selected yet.");
  });

  it("free text alone is enough to have something on the record", () => {
    expect(journeySummary({ materials: [], also: "a covering note" })).not.toBe("Nothing selected yet.");
  });

  it("the chrome pins it OUTSIDE the scroller, above the footer", () => {
    /* a summary that scrolls away is a summary the writer can commit without having read */
    expect(flow).toContain('<div className="tdb-ffbody">{body}</div>\n        {summaryNode}');
    expect(css).toMatch(/\.tdb-jnsum \{[^}]*flex: none/);
  });

  /**
   * ⚠️ ONE SELECTOR, ONE OWNER. `.tdb-ffsum` was declared twice — the review screen's staged rows
   * and this strip — and the later block won on every shared property, silently restyling the
   * rows. A duplicate also makes any first-match slice in a lock ambiguous.
   */
  it("the summary strip's class is declared exactly once", () => {
    expect((css.match(/^\.tdb-jnsum \{/gm) ?? []).length).toBe(1);
    expect((css.match(/^\.tdb-ffsum \{/gm) ?? []).length).toBe(1);
  });
});

/* ── 5 · the calendar ───────────────────────────────────────────────────────────────────────── */

describe("⚠️ RecordingCalendar NAMES A DATE INSIDE A RANGE, AND ASSUMES NOTHING", () => {
  const MAX = "2026-08-15";

  it("it respects max — nothing beyond it is selectable", () => {
    expect(outOfRange("2026-08-16", { max: MAX })).toBe(true);
    expect(outOfRange(MAX, { max: MAX })).toBe(false);
    const cells = monthCells(2026, 7, { max: MAX }, MAX); // August 2026
    expect(cells.find((c) => c.ymd === "2026-08-14")!.disabled).toBe(false);
    expect(cells.find((c) => c.ymd === "2026-08-16")!.disabled).toBe(true);
  });

  it("it respects min just as readily — this is NOT a past-only picker", () => {
    expect(outOfRange("2026-08-14", { min: MAX })).toBe(true);
    expect(outOfRange("2026-08-16", { min: MAX })).toBe(false);
    /* unbounded in both directions is a legitimate caller */
    expect(outOfRange("1999-01-01", {})).toBe(false);
  });

  it("the forward arrow is disabled AT the max month, and live before it", () => {
    expect(canStep(2026, 7, 1, { max: MAX })).toBe(false); // Aug 2026 → Sep is past max
    expect(canStep(2026, 6, 1, { max: MAX })).toBe(true);  // Jul 2026 → Aug still holds days
    /* ⚠️ IT ASKS WHETHER ANY DAY IS REACHABLE, not whether the bound sits in the next month */
    expect(canStep(2026, 3, 1, { max: MAX })).toBe(true);  // Apr → May, months short of max
    expect(canStep(2026, 7, -1, {})).toBe(true);
    expect(canStep(2026, 7, -1, { min: "2026-08-01" })).toBe(false);
  });

  it("Monday-first, with the leading blanks that align the 1st", () => {
    expect(WEEKDAY_INITIALS[0]).toBe("M");
    expect(WEEKDAY_INITIALS[6]).toBe("S");
    /* 1 August 2026 is a Saturday → six leading blanks in a Monday-first grid */
    const cells = monthCells(2026, 7, {}, MAX);
    expect(cells.filter((c) => c.ymd == null)).toHaveLength(5);
    expect(cells.find((c) => c.day === 1)!.ymd).toBe("2026-08-01");
    /* ⚠️ NO TRAILING BLANKS — a grid padded to six rows changes height between months */
    expect(cells[cells.length - 1].ymd).toBe("2026-08-31");
  });

  it("today is marked, and the footer states the bound until a day is picked", () => {
    const cells = monthCells(2026, 7, { max: MAX }, MAX);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
    expect(boundsNote({ max: MAX }, MAX)).toBe("Nothing after today");
    expect(boundsNote({ max: "2026-08-20" }, MAX)).toBe("Nothing after 20 Aug");
    /* an unbounded calendar makes no claim about what it will not accept */
    expect(boundsNote({}, MAX)).toBeNull();
  });

  it("today is a RING, never a fill — a fill is what chosen means", () => {
    expect(css).toMatch(/\.cal-d\.today \{[^}]*box-shadow: inset/);
    const today = css.slice(css.indexOf(".cal-d.today {"), css.indexOf("}", css.indexOf(".cal-d.today {")));
    expect(today.length, "the .cal-d.today slice came out empty").toBeGreaterThan(20);
    expect(today).not.toMatch(/background:/);
    /* ⚠️ THE CHOSEN DAY IS INK NOW, NOT BURGUNDY — the standing "no burgundy button fills" rule.
       This case's own point is unchanged and is the half above: today is a RING and a fill is what
       CHOSEN means. What chosen looks like moved to the black-primary grammar. */
    expect(css).toMatch(/\.cal-d\.on \{[^}]*background: var\(--ink-strong/);
    expect(css).not.toMatch(/\.cal-d\.on \{[^}]*--burg/);
  });

  it("the anchor relabels itself to the chosen date and stays selected", () => {
    expect(flow).toContain("{chosenHere ? shortDate(sentDate) : o.label}");
    expect(flow).toContain('${chosenHere ? " hasdate" : ""}');
    expect(shortDate("2026-08-12")).toBe("12 Aug");
  });

  /**
   * ⚠️ PORTALLED, BECAUSE `position: fixed` ALONE WOULD NOT HAVE DONE. The anchor sits inside
   * `.tdb-ffsheet`, which clips with `overflow: hidden` and animates with a transform — and a
   * transformed ancestor is the containing block for `fixed`.
   */
  it("it portals to document.body and reuses the shared placement, flip and all", () => {
    expect(cal).toContain("createPortal(");
    expect(cal).toContain("document.body,");
    expect(cal).toContain("placeMenu(");
    expect(cal).not.toContain("function placeMenu"); // reused, never re-derived
    expect(css).toMatch(/\.cal \{[^}]*position: fixed/);
  });

  it("Escape is consumed on the capture phase so it cannot abandon the form behind it", () => {
    expect(cal).toContain("stopImmediatePropagation()");
    expect(cal).toContain('window.addEventListener("keydown", onKey, true)');
  });

  /* ⚠️ THREE DATE SURFACES, EACH STATING ITS REASON IN ITS OWN HEADER. */
  it("its header names the other two surfaces and defers the question about them", () => {
    const raw = read("RecordingCalendar.tsx");
    expect(raw).toContain("SnoozeDial");
    expect(raw).toContain("BrandDatePicker");
    expect(raw).toMatch(/DELIBERATELY DEFERRED/);
  });
});

/* ── 6 · the layout signal ──────────────────────────────────────────────────────────────────── */

describe("⚠️ THE JOURNEY GOES SINGLE-COLUMN ON ITS CONTAINER, NOT ON THE VIEWPORT", () => {
  /**
   * The Calendar's item sheet mounts FocusFlow with no width constraint of its own, so the journey
   * must answer to the box it is in. Asserted as the SIGNAL — a containment context plus a
   * container query that yields one track — never as the pixel, which is a tuning value.
   */
  it("the body declares a containment context and the grid answers a container query", () => {
    expect(css).toMatch(/\.tdb-jnbody \{[^}]*container-type: inline-size/);
    const at = css.indexOf("@container");
    expect(at, "the journey grid has no container query at all").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toContain(".tdb-jngrid");
    /**
     * ⚠️ THE VALUE IS EXTRACTED AND COMPARED, NEVER MATCHED WITH A LOOKAHEAD. `\s*(?!…)` backtracks
     * to zero width and tests the lookahead against the SPACE, so every value passes — the same
     * shape has bitten this repo twice.
     */
    const single = /\.tdb-jngrid \{[^}]*grid-template-columns:([^;}]+)/.exec(block);
    expect(single, "the container query does not restate the grid's columns").toBeTruthy();
    const tracks = single![1].trim().replace(/minmax\([^)]*\)/g, "T").split(/\s+/).filter(Boolean);
    expect(tracks, `single-column expected, got "${single![1].trim()}"`).toHaveLength(1);
  });

  it("two columns is the resting state, so the reference panel is normally beside the steps", () => {
    const rest = /\.tdb-jngrid \{[^}]*grid-template-columns:([^;}]+)/.exec(css.slice(0, css.indexOf("@container")));
    expect(rest, "the journey grid has no resting column rule").toBeTruthy();
    const tracks = rest![1].trim().replace(/minmax\([^)]*\)/g, "T").split(/\s+/).filter(Boolean);
    expect(tracks).toHaveLength(2);
  });

  it("no media query is used to do the container's job", () => {
    const at = css.indexOf(".tdb-jnbody {");
    const region = css.slice(at, css.indexOf(".tdb-jnopts {", at));
    expect(region.length, "the journey CSS region came out empty").toBeGreaterThan(400);
    expect(region).not.toContain("@media (max-width");
  });
});

/* ── 7 · one write per commit, through the existing primitive ───────────────────────────────── */

describe("⚠️ COMMITTING WRITES ONCE, THROUGH THE PRIMITIVE THAT ALREADY EXISTED", () => {
  const slice = (from: string, to: string) => {
    expect(flow.indexOf(from), `anchor missing: ${from}`).toBeGreaterThan(-1);
    expect(flow.indexOf(to), `anchor missing: ${to}`).toBeGreaterThan(-1);
    const body = sliceBetween(flow, from, to);
    expect(body.length, `the slice ${from} → ${to} came out empty`).toBeGreaterThan(200);
    return body;
  };

  it("a send stages ONE mark-sent, and it is the same payload the quick path writes", () => {
    const body = slice("const commitSend = async () => {", "return journeySheet({");
    expect((body.match(/stageAndAdvance\(/g) ?? [])).toHaveLength(1);
    expect(body).toContain('kind: "mark-sent"');
    expect(body).toContain("journeyEventISO(sentDate,");
    /* the write itself remains recordMaterialsSent via markSentWriteArgs — never a second path */
    expect(flow).toContain("markSent: (p: Extract<StagedPayload, { kind: \"mark-sent\" }>) => recordMaterialsSent(markSentWriteArgs(p))");
  });

  it("a resubmission stages ONE mark-sent, flagged as a resubmit", () => {
    const body = slice("function resubmitSheet(c: BoardCard) {", "function nudgeSheet(c: BoardCard)");
    expect((body.match(/stageAndAdvance\(/g) ?? [])).toHaveLength(2); // the step-0 snooze + the commit
    expect(body).toContain('isResubmit: action.markKind === "resubmit"');
  });

  it("a chase stages ONE nudge, through the same logNudge write args", () => {
    const body = slice("function nudgeSheet(c: BoardCard) {", "function offerSheet(c: BoardCard)");
    expect((body.match(/kind: "nudge"/g) ?? [])).toHaveLength(1);
    expect(flow).toContain("logNudge(...nudgeWriteArgs(p, new Date().toISOString()))");
  });

  /**
   * ⚠️ EVERY CHECK-BACK OPTION MUST GENUINELY SET A REMINDER. "Don't remind me" shipped briefly and
   * was removed: `logNudge`'s `checkBackDate` is required by the write path, so the activity still
   * STORED "Follow-up reminder set for {date}" — the app stating something untrue about its own
   * record. That line is composed in `buildNudgeWrites` and persisted, so suppressing it is a
   * write-path change, not a display one. Two options that tell the truth beat three where one lies.
   *
   * This asserts the ABSENCE, on comment-stripped source, because the prose above names the very
   * string it forbids — which is the whole reason `decls` exists.
   */
  it("the chase offers no option that logs a reminder the writer declined", () => {
    const body = slice("function nudgeSheet(c: BoardCard) {", "function offerSheet(c: BoardCard)");
    expect(body).not.toContain("remind me");
    /* no mute is staged beside the nudge — that was the shape that papered over the stored line */
    expect(body).not.toContain("mute-item");
    /* and the windows that remain are real day counts, not a sentinel */
    expect(body).toContain("plusDaysISO(checkBack)");
    expect(flow).toContain("const [checkBack, setCheckBack] = useState<number>(DEFAULT_CHECKBACK_DAYS);");
  });

  /**
   * ⚠️ THE SWEEP ARM COMPLETES THROUGH THE PRIMITIVE, AND ITS ADVANCE IS GATED ON THE WRITE
   * (completion-paths Phase 2). This is a SOURCE claim deliberately: the arm is unreachable from
   * the UI — nothing in `src/` sets `mode: "sweep"`, and the weekly review's only entrance sits
   * inside `renderHero`, which has no caller — so there is no rendered page on which to press it.
   * Stating the route in source is the strongest artefact available, and saying which kind of
   * claim it is matters more than the claim.
   */
  it("the sweep arm completes through quickDone, and only advances if the write happened", () => {
    const body = slice("async function sweepDone(c: BoardCard) {", "function sweepSnooze");
    expect(body, "the sweep arm writes a completion in place again").not.toMatch(/done:\s*true/);
    expect(body, "the sweep arm stopped reaching the completion primitive")
      .toContain("if (await quickDone(c)) advanceAfterReceipt(");
  });

  it("a close writes ONE status change and undoes by DELETING it, never by compensating", () => {
    const body = slice("function staleSheet(c: BoardCard) {", "function dqSheet(c: BoardCard)");
    expect((body.match(/await updateQueryStatus\(/g) ?? [])).toHaveLength(1);
    expect(body).toContain("undoQueryStatus(q.id, prev, chosen.status)");
  });

  /**
   * ⚠️ RESTATED, AND STRONGER (completion-paths Phase 3). This asserted exactly ONE
   * `updateUserTask({ done: true …})` here — a completion written in place. That single write also
   * carried the note's edited text, and its Undo restored `{ done: false }` alone, so undoing left
   * the edit applied with no way back. The two are separate writes now: the text through the same
   * `updateUserTask({ text })` the "Keep it" button already made, and the completion through
   * `quickDone`.
   *
   * So the claim becomes the law it was always standing in for: **this journey never writes `done`
   * itself, and it still logs nothing against a query.** Both halves are asserted, because
   * "no inline completion" alone would pass on a sheet that had stopped completing at all.
   */
  it("a note completes through the primitive, writes no `done` of its own, and logs nothing against a query", () => {
    const body = slice("function noteSheet(c: BoardCard) {", "const advanceAfterReceipt");
    expect(body, "the note journey writes a completion in place again").not.toMatch(/done:\s*true/);
    expect(body, "the note journey stopped reaching the completion primitive").toContain("await quickDone(c)");
    /* the edit survives as its own write — silent, and the same one "Keep it" makes */
    expect(body, "the note's edit is no longer saved on its own").toContain("updateUserTask(c.userTaskId, { text: text.trim() })");
    for (const w of ["recordMaterialsSent", "logNudge", "updateQueryStatus", "recordOfferDecision"]) {
      expect(body, `the note journey reached for ${w}`).not.toContain(w);
    }
  });

  /**
   * ⚠️ THE THREE CLOSE OUTCOMES ARE THREE DIFFERENT STATUSES. A pass IS a response, a silence is
   * not, and a withdrawal is neither — folding them into one would make the response rate a number
   * that means nothing. Asserted as a set so a fourth cannot be added without a decision.
   */
  it("closing carries the outcome's own status through to recomputeQuery", () => {
    expect(CLOSE_REASONS.map((r) => r.status)).toEqual(["No Response", "Rejected", "Withdrawn"]);
    expect(new Set(CLOSE_REASONS.map((r) => r.key)).size).toBe(CLOSE_REASONS.length);
    for (const r of CLOSE_REASONS) expect(r.gloss.length, `${r.key} has no gloss`).toBeGreaterThan(8);
  });
});
