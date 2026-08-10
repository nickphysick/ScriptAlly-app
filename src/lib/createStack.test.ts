/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 · P4–P6 — STAGE 2: the focused stack, the keyboard, and the two notices.
 * (ref design-refs/qc-create-steps.html)
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
  /* ⚠️ A BUTTON, NOT AN INSTRUCTION. The head carried `ENTER TO ACCEPT ⏎` — a sentence standing in
     for a control, which asks the writer to know a keyboard convention before they can move and
     offers a pointer user nothing at all. Enter still commits the step; it simply stopped being
     advertised, because the button now says what it does. */
  it("active is lifted and numbered, and its head no longer instructs", () => {
    expect(rule(".qc-sec.qc-active")).toContain("box-shadow");
    expect(pane).toContain('<span className="qc-n"');
    const bare = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    expect(bare.toLowerCase(), "the instruction came back").not.toContain("enter to accept");
    expect(bare, "and the hint helper went with it").not.toContain("enterHint(");
  });

  it("every step offers a control instead — Next by name, Save on the last", () => {
    expect(pane).toContain("const stepFoot = (id: StepId) => {");
    expect(pane, "naming the destination is worth more than a bare Next")
      .toContain("Next: {STEP_SHORT[next]}");
    expect(pane).toContain("{saving ? \"Saving…\" : \"Save query\"}");
    expect(pane, "Back on every step after the first").toContain("const back = STEP_ORDER[stepIndex(id) - 1];");
    /* Two primaries, different scopes — so the step's must be the softer treatment. */
    expect(rule(".qc-next"), "the step primary must not shout louder than the header's")
      .not.toContain("box-shadow");
    expect(rule(".qc-sfoot .qc-back"), "Back reads left of the primary").toContain("order: -1");
  });

  /* ⚠️ THE FOOTER IS A ROW, NOT A BUTTON HANGING OFF THE BODY. The primary sat flush against the
     card's inner edge, so it read as escaping the card rather than closing it. And it applies to
     EVERY step — one renderer, so it cannot be true of When and false of Notes. */
  /* ⚠️ ALL FOUR EDGES — and the bottom was the one still missing after the first pass. That pass
     measured 17px at the TOP and stopped there, while `padding: 15px 16px 0` gave the row a
     horizontal gutter and NO bottom at all; the footer is the card's last child, so the buttons
     sat flush on the card's bottom edge with the CSS reading as correct. Measuring one edge is how
     a gutter goes half-built twice. */
  it("the footer's gutter is the step body's, on all four edges", () => {
    const r = rule(".qc-sfoot");
    expect(r, "no rule between the step's content and its actions").toContain("border-top");
    expect(r).toContain("margin: 20px 0 0");
    /* Horizontal and bottom must EQUAL the body's, not merely be non-zero — that is what makes the
       buttons line up with the field labels above them rather than approximately near them. */
    const body = rule(".qc-body");
    const bodyPad = /padding:\s*([^;]+);/.exec(body)?.[1].trim().split(/\s+/) ?? [];
    const footPad = /padding:\s*([^;]+);/.exec(r)?.[1].trim().split(/\s+/) ?? [];
    expect(bodyPad, "the body's padding shape changed; re-derive the footer's").toHaveLength(3);
    expect(footPad[1], "horizontal gutter must match the body's").toBe(bodyPad[1]);
    expect(footPad[0], "and the bottom must match the body's bottom").toBe(bodyPad[2]);
    expect(pane.match(/\{stepFoot\("/g)?.length ?? 0, "every step, not just When").toBe(3);
  });

  /* ⚠️ BACK ON EVERY STEP BUT THE FIRST, and the primary names where it goes. `back` is
     `STEP_ORDER[index - 1]`, so the first step in the stack resolves to undefined and renders no
     Back — absent because there is nowhere to go, not absent by omission. */
  it("every step but the first carries Back, and the primary names its destination", () => {
    expect(pane).toContain("const back = STEP_ORDER[stepIndex(id) - 1];");
    expect(pane).toContain('{back && (');
    expect(pane).toContain('<button type="button" className="qc-back" onClick={() => jump(back)}>← Back</button>');
    expect(pane).toContain("Next: {STEP_SHORT[next]}");
    expect(pane).toContain('{saving ? "Saving…" : "Save query"}');
    /* One renderer, three call sites — so it cannot be true of When and false of Notes. */
    expect(pane.match(/\{stepFoot\("/g)?.length ?? 0).toBe(3);
  });

  /* ⚠️ MEASURED ON ALL FOUR EDGES, ON EVERY STEP, AT BOTH WIDTHS — because a footer whose CSS read
     correct has measured zero clearance twice in this project. Browser-verified: top 20, right 17,
     bottom 16, left 17 at 1440 and 1024 on all three steps, nothing touching. The padding is
     derived from the body's here so the two cannot drift apart. */
  it("and Back returns to the prior step without disturbing what is behind it", () => {
    expect(pane).toContain("onClick={() => jump(back)}");
    /* `jumpTo` never retreats `reached`, so stepping back leaves later steps done and their values
       intact — the rule the stack was built on, restated where Back is the thing using it. */
    expect(read("./createSteps.ts")).toContain("export function jumpTo(target: StepId, reached: StepId)");
    expect(read("./createSteps.ts")).toContain("reached: stepIndex(target) > stepIndex(reached) ? target : reached");
  });

  /* ⚠️ THE RULE IS A FULL-BLEED DIVIDER, DELIBERATELY — `margin: 20px 0 0` keeps it edge to edge
     while the padding insets the buttons. A rule stopping short of the card's edges reads as an
     underline of the last field; running it through says "content above, actions below". */
  it("and its rule runs full-bleed rather than taking the gutter", () => {
    expect(rule(".qc-sfoot")).toContain("margin: 20px 0 0");
  });

  /* ⚠️ THE KEY HANDLER STAYS. Removing the advertisement is not removing the behaviour — a writer
     who already knows Enter works must not find it stopped working. */
  it("and Enter still commits the step", () => {
    expect(pane).toContain("const onStackKeyDown = (e: React.KeyboardEvent) => {");
    expect(pane).toContain("if (!nextStep(active)) return;");
    expect(pane).toContain("step();");
  });

  it("done shows a sage tick, the value at the right edge, and an EDIT", () => {
    expect(rule(".qc-sec.qc-done .qc-tick")).toContain("#7e9178");
    expect(pane).toContain('<span className="qc-sval">{summaries.when}</span>');
    expect(pane).toContain('<span className="qc-sedit">EDIT</span>');
    expect(rule(".qc-sval"), "the value takes the right edge, so four rows agree where an answer is")
      .toContain("margin-left: auto");
  });

  /* ⚠️ THE HINT AND THE VALUE ARE THE SAME SLOT, ONE AT A TIME. Before the step is answered the
     row says what it is FOR; after, what was RECORDED. Both at once puts a category label beside
     the thing it categorises, on every row, under a heading that already said it. */
  it("upcoming shows the hint and no value; done shows the value and no hint", () => {
    expect(pane).toContain('{states.when !== "done" && <span className="qc-stxt">{STEP_HINT.when}</span>}');
    expect(pane).toContain('{states.when === "done" && <span className="qc-sval">{summaries.when}</span>}');
    expect(pane, "EDIT must not offer to edit an unanswered step")
      .toContain('{states.when === "done" && <span className="qc-sedit">EDIT</span>}');
  });

  /* ⚠️ EDIT IS HOVER-REVEALED, THE CHEVRON IS NOT. The chevron says the row opens, which is true
     whether or not the pointer is there; a row with no persistent affordance reads as a label. */
  it("the chevron is always there and EDIT arrives on hover — and on keyboard focus", () => {
    expect(pane).toContain('<span className="qc-schev" aria-hidden="true">›</span>');
    expect(rule(".qc-sedit")).toContain("opacity: 0");
    const reveal = css.slice(css.indexOf(".qc-sum:hover .qc-sedit"));
    expect(reveal.slice(0, 90), "a hover-only affordance is unreachable by keyboard")
      .toContain(":focus-visible");
  });

  /* ⚠️ UNMOUNTED, NOT HIDDEN. A hidden date picker or textarea still takes tab stops, and the
     whole point of the stack is that Tab walks the section you are actually in. */
  it("only the active section's body is in the document", () => {
    expect(pane.match(/states\.\w+ === "active" && \(/g)?.length ?? 0).toBe(3);
    expect(pane, "a hidden body would still take tab stops").not.toContain("hidden={states.");
  });

  it("every summary is a real button — jumping back is a control, not a click handler on a div", () => {
    expect(pane.match(/<button type="button" className="qc-sum"/g)?.length ?? 0).toBe(3);
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
    /* ⚠️ THE FIXTURE MUST TURN THE NUDGE OFF EXPLICITLY. A bare draft now carries the HOUSE
       preset — a missing agent figure is a gap in their record, never a decision the writer made —
       so "no nudge" is a state you choose, not one you fall into. */
    const d = { ...emptyDraft({ manuscriptId: "" }), materials: [], reminder: { kind: "none" as const } };
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
  it("every route into stage 2 goes through one function", () => {
    expect(pane).toContain("const pickAgent = (a: Agent) => {");
    expect(pane).toContain('setActive("when");');
    expect(pane).toContain("materials: materialRowsForDraft(a)");
    /* The three routes, each named: the typeahead passes the function itself, the inline
       quick-add calls it with the agent it just created, and a quick pick calls it with its row.
       Counting bare `pickAgent(` would have missed the first — it is passed, not called. */
    expect(pane, "the picker route").toContain("onSelect={pickAgent}");
    /* The inline quick-add now lives in the picker and hands its new agent back through the same
       onSelect — one door still, one layer further out. */
    expect(read("../components/queries/AgentPicker.tsx"), "the inline quick-add route")
      .toContain("onCreated={(a) => { setAdding(false); choose(a); }}");
    expect(pane, "the picker route").toContain("onSelect={pickAgent}");
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
