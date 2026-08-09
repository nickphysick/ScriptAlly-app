/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · THE FOUR-STEP STACK, the keyboard, and the two notices.
 * (ref design-refs/63-qc-create-stepper.html)
 *
 * ⚠️ THE CHROME IS WRITTEN ONCE — `renderStep` draws every block, collapsed or open, and the four
 * bodies are thunks in a map keyed by step. So the assertions here are about ONE renderer rather
 * than counts of three or four near-identical copies. That is the stronger shape: a count going
 * from 3 to 4 is arithmetic a rename can satisfy, whereas "the open branch is the only branch
 * that calls a body" is the property the stack actually depends on.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { shortDate, materialsPhrase, stepSummaries, openQueriesWith, duplicateLine } from "./createSummary";
import { emptyDraft } from "./queryDraft";
import { QueryStatus, SubmissionMethod } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const pane = read("../components/queries/QueryCreatePane.tsx");
const queries = read("../components/Queries.tsx");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

const AGENT = { id: "a1", name: "William Tan", agency: "Foxglove Literary", responseTimeWeeks: 6 } as never;
const MS = [{ id: "m1", title: "Murphy's Day Out" }] as never[];

describe("the three treatments", () => {
  it("active is a lifted white card, numbered `Step n of 4`, with the Enter hint in its foot", () => {
    expect(rule(".qc-sopen")).toContain("box-shadow");
    /* The numbered pip is retired: it stated the step's position, which its position already
       stated, and said nothing about whether it had been answered. The head carries a state dot
       and the count sits right, as the ref draws it. */
    expect(pane, "the numbered pip came back").not.toContain('className="qc-n"');
    expect(pane).toContain("Step {stepIndex(id) + 1} of {STEP_ORDER.length}");
    expect(pane).toContain("enterHint(");
    expect(pane, "the hint belongs to the footer now, beside Continue").toContain('className="qc-sfoot"');
  });

  it("done shows a sage dot, the values, and an EDIT", () => {
    expect(rule(".qc-dot-done")).toContain("#7e9178");
    expect(pane).toContain('<span className="qc-sedit">EDIT</span>');
    expect(pane, "the summary must state the values, not that values exist")
      .toContain('{st === "done" ? summaries[id] : ""}');
  });

  /* ⚠️ THE HINT AND THE VALUE ARE NOT ALTERNATIVES. They were: the row showed the hint until the
     step was answered and the summary instead of it afterwards, so a completed row stopped
     saying what it was for. The ref puts the hint left and the value right, both at once. */
  it("upcoming shows the hint with no value, and done shows the hint AND the value", () => {
    expect(pane).toContain("<span className=\"qc-shint\">{STEP_HINT[id]}</span>");
    expect(pane).toContain('<span className="qc-sval">{st === "done" ? summaries[id] : ""}</span>');
    /* ⚠️ THE SLOT IS ALWAYS RENDERED, empty when there is nothing to state. It carries the
       `margin-left: auto` that pins EDIT and the chevron to the right edge, so omitting it on an
       unanswered step slides them in behind the hint and the four rows stop lining up. */
    expect(rule(".qc-sval")).toContain("margin-left: auto");
  });

  /* ⚠️ UNMOUNTED, NOT HIDDEN — and now not even BUILT. A hidden date picker or textarea still
     takes tab stops, and the whole point of the stack is that Tab walks the section you are
     actually in. The bodies are thunks, so the closed ones are never called at all. */
  it("only the active section's body is in the document", () => {
    expect(pane, "the bodies must be thunks, not elements")
      .toContain("const BODIES: Record<StepId, () => React.ReactNode>");
    expect(pane.match(/BODIES\[id\]\(\)/g)?.length ?? 0, "exactly one call site").toBe(1);
    expect(pane, "the collapsed branch must return before any body is built")
      .toMatch(/if \(st !== "active"\) \{[\s\S]*?return \(/);
    expect(pane, "a hidden body would still take tab stops").not.toContain("hidden={states.");
  });

  it("every collapsed row is a real button — jumping back is a control, not a click handler on a div", () => {
    expect(pane).toContain('<button type="button" className={`qc-srow qc-${st}`} onClick={() => jump(id)}>');
  });

  /* ⚠️ ONE RENDERER, FOUR STEPS, AND THE ORDER COMES FROM STEP_ORDER. Four hand-written blocks is
     how the Notes head ends up a pixel out from the What head, and how source order and
     STEP_ORDER quietly disagree about which step is number three. */
  it("the blocks are mapped from STEP_ORDER, not written out four times", () => {
    expect(pane).toContain("STEP_ORDER.map((id) => (");
    expect(pane.match(/<section key=\{id\}/g)?.length ?? 0).toBe(1);
    for (const id of ["agent", "when", "what", "notes"]) {
      expect(pane, `${id} has no body`).toContain(`    ${id}: () => (`);
    }
  });
});

describe("the summaries are the receipt", () => {
  it("When states the date, the method and the nudge", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), agentId: "a1", dateSent: "2026-08-09", sendMethod: SubmissionMethod.EMAIL };
    const s = stepSummaries(d, AGENT, MS, Date.parse("2026-08-09"));
    expect(s.when).toContain("9 Aug");
    expect(s.when).toContain("email");
    expect(s.when).toMatch(/nudge \d+ \w+/);
  });

  /* An empty summary row reads as a rendering fault, and "no nudge" is a real answer. */
  it("absence is stated, never left blank", () => {
    const d = { ...emptyDraft({ manuscriptId: "" }), materials: [] };
    const s = stepSummaries(d, null, [], Date.parse("2026-08-09"));
    expect(s.what).toContain("no manuscript");
    expect(s.what).toContain("nothing ticked");
    expect(s.notes).toBe("No note");
    expect(s.when).toContain("no nudge");
  });

  it("a long note is elided rather than allowed to push the row open", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), journal: "x".repeat(200) };
    expect(stepSummaries(d, AGENT, MS).notes.length).toBeLessThanOrEqual(58);
  });

  /* ⚠️ The names come off the ROW. Every row carries the name the checklist showed, so a summary
     written from a second list would say something the writer never saw the moment those names
     were retuned. Only the sample differs, because "5 chapters" beats "Opening sample". */
  it("materials are named as the checklist named them", () => {
    const rows = [
      { key: "queryLetter", kind: "binary", name: "Query letter", on: true },
      { key: "synopsis", kind: "binary", name: "Synopsis", on: false, pages: "" },
      { key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "5" },
    ] as never[];
    expect(materialsPhrase(rows)).toBe("query letter, 5 chapters");
  });

  it("the year appears only when it is not this one", () => {
    const now = Date.parse("2026-08-09");
    expect(shortDate("2026-08-09", now)).toBe("9 Aug");
    expect(shortDate("2025-03-14", now)).toBe("14 Mar 2025");
    expect(shortDate("", now)).toBe("");
  });
});

describe("Enter accepts and advances; ⌘↵ saves", () => {
  /* Enter is not the stack's to take wherever it already means something. */
  it("the stack yields Enter to a textarea and to any open menu", () => {
    expect(pane).toContain('el.tagName === "TEXTAREA"');
    expect(pane).toContain('el.getAttribute("aria-haspopup")');
    expect(pane).toContain('el.getAttribute("aria-expanded") === "true"');
  });

  it("and on the last section it does not swallow the key", () => {
    expect(pane, "Enter on Notes must fall through to the ⌘↵ save").toContain("if (!nextStep(active)) return;");
  });

  it("⌘/Ctrl+Enter saves, gated on the same readiness as the buttons", () => {
    expect(queries).toContain('(e.key === "Enter") && (e.metaKey || e.ctrlKey)');
    expect(queries, "the shortcut must not do what a disabled button would not")
      .toContain("if (!createReadyRef.current || createSavingRef.current) return;");
  });

  /* ⚠️ The listener is bound once per create session. Closing over the values directly would
     leave it answering with the readiness the draft had when it opened. */
  it("it reads live values through refs, not a stale closure", () => {
    expect(queries).toContain("createReadyRef.current = createReady;");
    expect(queries).toContain("saveCreateRef.current();");
  });

  /* ⚠️ ONE DOOR. Typing a name, creating one inline and clicking a quick pick must do exactly
     the same thing, or the three routes into stage 2 drift apart. They all call pickAgent. */
  it("every route out of the agent step goes through one function", () => {
    expect(pane).toContain("const pickAgent = (a: Agent) => {");
    expect(pane).toContain('setActive("when");');
    expect(pane).toContain("materials: materialRowsForDraft(a)");
    /* The three routes, each named: the typeahead passes the function itself, the inline
       quick-add calls it with the agent it just created, and a quick pick calls it with its row.
       Counting bare `pickAgent(` would have missed the first — it is passed, not called. */
    expect(pane, "the typeahead route").toContain("onSelect={pickAgent}");
    expect(pane, "the inline quick-add route").toContain("pickAgent(res.agent)");
    expect(pane, "the quick-picks route").toContain("onClick={() => pickAgent(a)}");
  });
});

describe("the duplicate notice", () => {
  const q = (id: string, status: QueryStatus, dateSent: string) =>
    ({ id, agentId: "a1", manuscriptId: "m1", status, dateSent }) as never;

  it("reports one open query with the date", () => {
    const n = openQueriesWith("a1", [q("q1", QueryStatus.QUERIED, "2026-08-09")], Date.parse("2026-08-09"))!;
    expect(n.count).toBe(1);
    expect(duplicateLine(n, "William Tan")).toBe("You have an open query with William Tan (sent 9 Aug)");
  });

  it("counts several, and points at the most recent", () => {
    const n = openQueriesWith("a1", [
      q("q1", QueryStatus.QUERIED, "2026-01-04"),
      q("q2", QueryStatus.FULL_REQUESTED, "2026-08-09"),
    ], Date.parse("2026-08-09"))!;
    expect(n.count).toBe(2);
    expect(n.latest.id, "the link must open the newest, not the oldest").toBe("q2");
    expect(duplicateLine(n, "William Tan")).toBe("You have 2 open queries with William Tan");
  });

  /* Closed queries are history, not a clash — warning about a rejection from last year would
     train the writer to ignore the notice. */
  it("terminal queries do not count", () => {
    expect(openQueriesWith("a1", [q("q1", QueryStatus.REJECTED, "2026-01-04")])).toBeNull();
    expect(openQueriesWith(null, [])).toBeNull();
  });

  it("it is non-blocking, and its link goes through the dirty-confirm", () => {
    expect(pane, "the notice must not gate the save").not.toMatch(/dupe[\s\S]{0,120}disabled/);
    expect(queries, "the link must discard through closeCreate, which owns the confirm")
      .toContain("onOpenQuery={(id) => closeCreate(() => setSelectedQueryId(id))}");
  });

  /* ⚠️ COSTS NOTHING — an in-memory filter over an array the page already holds. */
  it("no new read: it reuses the agent list's own derivations", () => {
    const src = read("./createSummary.ts");
    expect(src).toContain('import { queriesForAgent, isTerminalStatus } from "./agentList"');
    expect(src, "a query would mean a new Firestore read").not.toContain("getDocs");
    expect(src).not.toContain("onSnapshot");
  });
});

describe("the reminder whisper", () => {
  it("appears only when a nudge date resolves, and says what it will do", () => {
    expect(pane).toContain("whisperDate && (");
    expect(pane).toContain("nudge you on");
  });

  /* ⚠️ REMINDER PERSISTENCE IS STILL STUBBED. The date is stored on the query; nothing schedules
     a notification from it. The line is presentational and the flag stays visible in the source
     rather than being quietly dropped. */
  it("and the stub is flagged where the line is written", () => {
    expect(pane).toContain("REMINDER PERSISTENCE IS STILL STUBBED");
  });
});
