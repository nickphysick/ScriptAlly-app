/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STAGE 1 — the picker grid that replaced the combobox popup.
 * (ref design-refs/63-qc-create-stepper.html, step 1)
 *
 * ⚠️ THE ARRIVAL BUG AND THE VOID WERE ONE BUG. `AgentSearchField` is a combobox whose listbox
 * opens on FOCUS, and stage 1 autofocuses — so the pane mounted with an expanded, empty overlay
 * hanging under the field. Read as two faults (a clunky arrival, a void beneath the field), it is
 * one: a results overlay opened before anyone asked for results. Removing the overlay and putting
 * the contacts on the page fixes both, because there is no longer a state where results are hidden.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import { readFileSync } from "fs";
import {
  PICKER_LIMIT, pickerState, pickerCards, queriedCount, replyLine, moveInGrid, matchesQuery,
  dropdownResults, queryHistoryLabel, queriedAgentIds,
} from "./agentPicker";
import { nameplates, foldedLine, plateDate, plateName } from "./agentPicker";
import { isTerminalStatus } from "./agentList";
import { SubmissionStatus, QueryStatus, type Agent, type Query } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const picker = read("../components/queries/AgentPicker.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const quickAdd = read("../components/queries/AgentQuickAdd.tsx");
const css = read("../components/shell/f12.css");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

const agent = (id: string, over: Partial<Agent> = {}): Agent => ({
  id, name: `Agent ${id}`, agency: `${id} Literary`, email: "", dateAdded: "2026-01-0" + id.slice(-1),
  submissionStatus: SubmissionStatus.OPEN, materialsWanted: [], ...over,
}) as Agent;

const q = (agentId: string, over: Partial<Query> = {}): Query =>
  ({ id: "q" + agentId, agentId, manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-01-01", ...over }) as Query;

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE GRID IS UNCONDITIONAL; ONLY ITS CONTENTS SWITCH. It used to list un-queried contacts and
   therefore vanished in the all-queried state — leaving the one state most in need of a browsable
   list as the only state without one, beside a panel promising "you can still log a query to any
   of them" and offering no way to do it but typing a name from memory.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE FOLDED BLOCK SUPERSEDES A GRID OF ALREADY-QUERIED CARDS, and the reason is the point. A
   grid is the shape this component uses to RECOMMEND, and nothing in this set is being
   recommended — they have all been queried. It also made the writer scroll past sixteen entries
   they had come here to bypass.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the folded all-queried block", () => {
  /* ⚠️ TWO STATES FROM `isTerminalStatus` — the app's existing split, not a second one. OFFER
     counts as ACTIVE (the agent-list law): a live offer is the most open a conversation gets. */
  it("the two states come from the existing selector, and an offer is active", () => {
    const plates = nameplates([agent("a1"), agent("a2"), agent("a3")], [
      q("a1", { status: QueryStatus.OFFER, dateSent: "2026-05-01" }),
      q("a2", { status: QueryStatus.REJECTED, dateSent: "2026-04-01" }),
      q("a3", { status: QueryStatus.QUERIED, dateSent: "2026-03-01" }),
    ]);
    expect(plates.map((p) => p.state)).toEqual(["active", "previous", "active"]);
    expect(isTerminalStatus(QueryStatus.OFFER), "an offer is not terminal").toBe(false);
  });

  it("the counts in the line match the states", () => {
    const plates = nameplates([agent("a1"), agent("a2")], [
      q("a1", { status: QueryStatus.QUERIED }), q("a2", { status: QueryStatus.REJECTED }),
    ]);
    const line = foldedLine(plates, "Murphy's Day Out");
    expect(line).toContain("You've queried all 2 contacts for Murphy's Day Out");
    expect(line).toContain("1 still waiting, 1 concluded");
  });

  /* ⚠️ ORDERED BY DATE, NEVER BY STATE. Sorting the open ones to the top would put them forward,
     and nothing here is being put forward. Dateless records cannot claim a position in a
     chronology they are not in. */
  it("ordering is date-descending, and undated plates sort last", () => {
    const plates = nameplates([agent("a1"), agent("a2"), agent("a3")], [
      q("a1", { dateSent: "2026-02-01", status: QueryStatus.REJECTED }),
      q("a2", { dateSent: "2026-08-01", status: QueryStatus.QUERIED }),
      q("a3", { dateSent: "" }),
    ]);
    expect(plates.map((p) => p.agent.id)).toEqual(["a2", "a1", "a3"]);
  });

  /* ⚠️ THE FACT IS STATED ONCE. A panel heading, a count ring, a section heading and the fold line
     all said that every contact had been queried, for this manuscript, and how many there were —
     four ways of telling the writer something they understood by the second. The counts are the
     only thing here they cannot work out for themselves; everything else was decoration. */
  it("the count and the manuscript name each appear exactly once", () => {
    const allq = picker.slice(picker.indexOf("{allQueried ? ("), picker.indexOf("      ) : ("));
    expect(allq, "the sentence is the one place either is stated").toContain("foldedLine(plates, manuscriptTitle)");
    expect(allq.match(/manuscriptTitle/g)?.length ?? 0, "the book is named once").toBe(1);
    expect(allq, "the count ring came back").not.toContain("qc-allqring");
    expect(allq, "the panel heading came back").not.toContain("Every contact queried");
    expect(allq, "the section heading came back").not.toContain("Already queried for this manuscript");
    expect(allq, "the route must not restate the count").not.toContain("{counts.total}");
    expect(picker, "the panel container went with it").not.toContain('className="qc-allq"');
  });

  /* One container, so the routes stay at the foot in both states and there is no second box to
     space against. */
  it("the plates open INSIDE the block, above the actions", () => {
    const allq = picker.slice(picker.indexOf("{allQueried ? ("), picker.indexOf("      ) : ("));
    expect(allq.indexOf("qc-plates"), "the plates must precede the routes")
      .toBeLessThan(allq.indexOf("qc-routes"));
    expect(allq.match(/className="qc-fold"/g)?.length ?? 0, "one container").toBe(1);
  });

  it("one plate per contact, and the block renders only in the all-queried condition", () => {
    expect(nameplates([agent("a1"), agent("a2")], [q("a1")]).length, "un-queried contacts are not plates").toBe(1);
    expect(picker).toContain('className="qc-fold"');
    expect(picker, "closed by default").toContain("const [showPlates, setShowPlates] = useState(false);");
    const cold = sliceBetween(picker, 'state === "cold"', "const field =");
    expect(cold).not.toMatch(/["\s`]qc-fold["\s`]/);
  });

  /* A resubmission is just a query to someone already queried — one door, not two. */
  it("selecting a plate follows the same path as a suggestion card", () => {
    expect(picker).toContain("onClick={() => choose(p.agent)}");
    expect(picker).toContain("onClick={() => choose(a)}");
  });

  /* ⚠️ NEITHER STATE IS EMPHASISED — same type, same size, same colour, differing only by dot. */
  it("the two states differ by dot and by nothing else", () => {
    const act = rule(".qc-plate-active .qc-platedot, i.qc-plate-active");
    const prev = rule(".qc-plate-previous .qc-platedot, i.qc-plate-previous");
    expect(act).toContain("background");
    expect(prev).toContain("background");
    for (const r of [act, prev]) {
      for (const banned of ["font-weight", "font-size", "color:", "border"]) {
        expect(r, `a state took ${banned} — that is emphasis`).not.toContain(banned);
      }
    }
    expect(rule(".qc-platekey").length, "the key must exist").toBeGreaterThan(0);
    expect(picker.match(/qc-platekey/g)?.length ?? 0, "the state is named once, not per plate").toBe(1);
  });

  /* ⚠️ AVAILABLE, NOT SUGGESTED — and `focus-within` is not optional: a set that lit only under a
     pointer would leave a tabbing writer reading it at rest permanently. */
  it("dimmed at rest, forward on hover AND on keyboard focus", () => {
    expect(rule(".qc-plates")).toContain("opacity: 0.66");
    expect(rule(".qc-plates:hover, .qc-plates:focus-within")).toContain("opacity: 1");
  });

  /* They are two separate statements; stacked flush they read as one box with a rule through it. */
  it("and it clears the panel above it", () => {
    expect(rule(".qc-fold")).toContain("margin-top: 18px");
  });
});

/* ══ §2 · THE DATE AND NAME FAULTS ═════════════════════════════════════════════════════════ */
describe("a bad record never prints an error message at the writer", () => {
  /* ⚠️ "Invalid Date NaN" IS WHAT `new Date(junk)` RENDERS: toLocaleDateString gives the literal
     string "Invalid Date" and getFullYear() gives NaN. Guarding the FORMATTER is what stops that
     reaching the screen — the record itself is a separate, data-side fault. */
  it("an absent or unparseable date renders nothing at all", () => {
    expect(plateDate("2024-03-14")).toBe("14 Mar 2024");
    expect(plateDate("")).toBeNull();
    expect(plateDate(null)).toBeNull();
    expect(plateDate(undefined)).toBeNull();
    expect(plateDate("not a date"), "this is the string that became 'Invalid Date NaN'").toBeNull();
    expect(plateDate("14/03/2024"), "a UK-format string is not an ISO date").toBeNull();
  });

  /* ⚠️ THE YEAR IS ALWAYS PRESENT. Elsewhere the app drops it for the current year, which is right
     for a list you work through this week; here the point is how long ago something went, and
     "14 Mar" beside "14 Mar 2024" invites the reader to assume they share a year. */
  it("the year is present in every path", () => {
    const thisYear = new Date().getFullYear();
    expect(plateDate(`${thisYear}-03-14`)).toContain(String(thisYear));
    expect(plateDate("2024-03-14")).toContain("2024");
  });

  /* ⚠️ NEVER SUBSTITUTES ONE FIELD FOR ANOTHER. `agentPrimary` falls back to the agency, which is
     right for a line that just names the record and wrong on a NAMEPLATE — it rendered
     "Penhallow Literary" as a person. */
  it("a missing agent name never falls back to the agency", () => {
    expect(plateName(agent("a1", { name: "Elinor Hale" }))).toBe("Elinor Hale");
    const nameless = agent("a1", { name: "", agency: "Penhallow Literary" });
    expect(plateName(nameless), "an agency is not a person").toBe("Unnamed contact");
    expect(plateName(nameless)).not.toContain("Penhallow");
  });

  /* ⚠️ THE SIBLING HAD THE SAME FAULT. The dropdown's history label parsed without a NaN guard and
     would have printed "Queried Invalid Date NaN" on exactly the records the plate skips — found
     by looking for siblings rather than fixing only the instance that was reported. */
  it("the dropdown's history label is guarded too", () => {
    const a = agent("a1");
    expect(queryHistoryLabel(a, [q("a1", { dateSent: "not a date" })]), "never an error string")
      .toBe("Queried");
    expect(queryHistoryLabel(a, [q("a1", { dateSent: "2024-03-14" })])).toBe("Queried 14 Mar 2024");
  });

  it("and the plate renders the date node only when there is one", () => {
    expect(picker).toContain("{p.sentLabel && <span className=\"qc-platedate\">{p.sentLabel}</span>}");
  });
});

/* ══ THE THREE STATES ══════════════════════════════════════════════════════════════════════ */
describe("stage 1 has three states, and they are different situations", () => {
  /* ⚠️ "COLD" MEANS NO CONTACTS AT ALL, not "nobody to suggest". A new account has nothing to
     pick from and needs a way to add someone; a writer who has queried everyone has a full
     address book and an achievement. Collapsing them tells one of those two people the wrong
     thing. */
  it("cold start is an EMPTY address book, not an empty suggestion list", () => {
    expect(pickerState([], [])).toBe("cold");
    expect(pickerState([agent("a1")], [q("a1")]), "a full list with nothing to suggest is not cold")
      .toBe("all-queried");
    expect(pickerState([agent("a1")], [])).toBe("grid");
  });

  it("the all-queried count states both halves", () => {
    expect(queriedCount([agent("a1"), agent("a2")], [q("a1")])).toEqual({ done: 1, total: 2 });
  });

  /* Set-aside is a decision not to pursue; counting them would make the total a number the
     writer cannot act on. */
  it("set-aside agents are outside the count and outside the grid", () => {
    const list = [agent("a1"), agent("a2", { setAside: true })];
    expect(queriedCount(list, [q("a1")])).toEqual({ done: 1, total: 1 });
    expect(pickerCards(list, []).cards.map((a) => a.id)).toEqual(["a1"]);
  });
});

/* ══ THE GRID IS THE RESULT SET ════════════════════════════════════════════════════════════ */
describe("the grid suggests and the dropdown searches — two jobs, two surfaces", () => {
  /* ⚠️ THE GRID DOES NOT FILTER AS YOU TYPE. It used to, and the page reshuffled under the writer
     on every keystroke — the card they were reaching for moved while they reached. */
  it("the grid is a STANDING set: un-queried only, and untouched by the query", () => {
    const list = [agent("a1", { name: "Elinor Hale" }), agent("a2", { name: "Joseph Okafor" })];
    const before = pickerCards(list, [q("a1")]).cards.map((a) => a.id);
    expect(before).toEqual(["a2"]);
    expect(pickerCards.length, "the grid signature must not take a query at all").toBeLessThan(4);
  });

  /* ⚠️ THE DROPDOWN MUST NOT HIDE THE AGENTS YOU HAVE ALREADY QUERIED. A resubmission is real, and
     in the all-queried state it is the only thing left to do. The row states the history instead,
     so the writer is told rather than prevented. */
  it("the dropdown searches everyone, queried or not, and states the history", () => {
    const list = [agent("a1", { name: "Elinor Hale" }), agent("a2", { name: "Joseph Okafor" })];
    expect(dropdownResults(list, "elinor").map((a) => a.id), "a queried agent must stay findable")
      .toEqual(["a1"]);
    const now = Date.parse("2026-08-10");
    expect(queryHistoryLabel(list[0], [q("a1")], now)).toBe("Queried 1 Jan 2026");
    expect(queryHistoryLabel(list[1], [q("a1")], now)).toBe("Not queried");
  });

  /* ⚠️ AN EMPTY QUERY LISTS EVERYONE. Opening the list is an act of browsing as much as of
     searching — answering with nothing would make the control useless until the writer had
     already guessed a name. It is the OPEN STATE, not the query, that keeps it off the page on
     arrival. */
  it("an empty query lists every contact, queried or not", () => {
    const list = [agent("a1", { name: "Zed" }), agent("a2", { name: "Amy" })];
    expect(dropdownResults(list, "").map((a) => a.name)).toEqual(["Amy", "Zed"]);
    expect(dropdownResults(list, "   ").length).toBe(2);
  });

  /* ⚠️ ALPHABETICAL, AND DELIBERATELY NEUTRAL. Newest-first is a recommendation about which
     contact matters, and rating-descending is the same recommendation wearing a search's clothes
     — which is why the stars went. */
  it("ordering is alphabetical, not by date added and not by rating", () => {
    const list = [
      agent("a1", { name: "Zed Ash", dateAdded: "2026-08-01", starRating: 5 }),
      agent("a2", { name: "Amy Bell", dateAdded: "2026-01-01", starRating: 1 }),
    ];
    expect(dropdownResults(list, "").map((a) => a.name), "newest-first or rating-first came back")
      .toEqual(["Amy Bell", "Zed Ash"]);
  });

  /* ⚠️ FOCUS IS NOT INTENT. The field takes focus on mount so typing works immediately, but
     programmatic focus is the APP's act — opening on it is exactly what put an expanded empty
     popup under the field on arrival. */
  it("focus does not open it — there is no onFocus handler at all", () => {
    expect(picker).toContain("const [open, setOpen] = useState(false);");
    expect(picker, "the field must not open on focus").not.toContain("onFocus={() => setOpen");
    expect(picker, "and must not open on mount").not.toMatch(/useState\(true\)/);
    expect(picker, "focus on mount is still wanted, for typing").toContain("autoFocus");
  });

  it("three explicit acts open it: a click, ↓, and a keystroke", () => {
    expect(picker).toContain("onClick={() => setOpen(true)}");
    expect(picker).toContain('if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setDhl(0); return; }');
    expect(picker).toContain("setOpen(v.trim().length > 0);");
  });

  it("and four things close it: Esc, an outside click, selection, clearing to empty", () => {
    expect(picker).toContain('if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); setDhl(-1); return; }');
    expect(picker).toContain("if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);");
    expect(picker).toContain("const choose = (a: Agent) => { setHl(-1); setDhl(-1); setOpen(false); onSelect(a); };");
    expect(picker, "an empty field is the writer withdrawing the question")
      .toContain("setOpen(v.trim().length > 0);");
  });

  it("matching reads name and agency, and nothing else", () => {
    const a = agent("a1", { name: "Elinor Hale", agency: "Cavendish & Roe" });
    expect(matchesQuery(a, "cavendish")).toBe(true);
    expect(matchesQuery(a, "hale")).toBe(true);
    expect(matchesQuery(a, "a1"), "the id is not a name").toBe(false);
    expect(matchesQuery(a, "   ")).toBe(true);
  });

  it("newest first, capped, and it says when it capped", () => {
    const many = Array.from({ length: PICKER_LIMIT + 3 }, (_, i) =>
      agent("x" + i, { dateAdded: `2026-01-${String(i + 1).padStart(2, "0")}` }));
    const r = pickerCards(many, []);
    expect(r.cards).toHaveLength(PICKER_LIMIT);
    expect(r.truncated).toBe(true);
    expect(r.cards[0].dateAdded, "newest first").toBe("2026-01-11");
  });

  /* The whole point of the change: no overlay, so no state in which results are hidden. */
  it("the picker mounts no popup and holds no open/close state", () => {
    const code = picker.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    /* ⚠️ AMENDED: `setOpen` is now the picker's OWN open state, and having one is the point — a
       dropdown you can browse needs a state that a click and ↓ can raise. What must stay gone is
       the retired combobox's machinery, and the rule it broke: opening on FOCUS. */
    for (const banned of ["sa-ag-menu", "menuStyle", "useFixedMenu"]) {
      expect(code, `${banned} would reintroduce the overlay`).not.toContain(banned);
    }
    /* The grid's cards legitimately use onFocus to track the highlight; what must never exist is
       a focus handler that OPENS the dropdown — that is the arrival fault, precisely. */
    expect(code, "opening on focus is what put an empty popup on the page at arrival")
      .not.toMatch(/onFocus=\{[^}]*setOpen/);
    expect(code, "the standing grid is always rendered, never toggled").toContain('role="listbox"');
  });

  /* ⚠️ EXACTLY ONE SEARCH INPUT ON STAGE 1. The pane used to mount the whole of
     AgentSearchField to reach its ADD form, which put a second "Search by name or agency…" on the
     page whose popup opened on focus — which is why "Add a new agent" appeared to open a list of
     existing agents. `startInQuickAdd` mounts the form and nothing else. */
  /* ⚠️ THE LEGACY FIELD IS GONE, AND EXTRACTING THE FORM IS WHAT LET IT GO. Two earlier attempts
     failed for the same structural reason: the quick-add form lived INSIDE `AgentSearchField`, so
     reaching it meant mounting a second "Search by name or agency…" whose popup opened on focus —
     which is why the panel's "Add a new agent" appeared to open a list of existing agents. */
  it("exactly one search input on stage 1, and no second add-agent link", () => {
    const code = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    expect(code, "the legacy field is still mounted").not.toContain("<AgentSearchField");
    expect(picker.match(/placeholder="Search by name or agency/g)?.length ?? 0).toBe(1);
    /* ⚠️ AND IT IS RENDERED ONCE. Folding the all-queried panel in from its early-return form
       carried a second `{field}` with it and put two search inputs on the page — the exact fault
       fix pack 2 §1a existed to remove, reintroduced by a copy-paste. One mount, one field. */
    expect(picker.match(/\{field\}/g)?.length ?? 0, "the field must be mounted exactly once").toBe(1);
    const qaCode = quickAdd.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(qaCode, "the extracted form must own no search").not.toContain("Search by name");
    expect(picker, "the field's own link is the only one").toContain("Not listed? <button");
    expect(picker, "and the legacy link went with the field").not.toContain("Agent not listed?");
  });

  /* ⚠️ ONE OPEN STATE, TWO ENTRY POINTS. Two states would let one be open while the other thought
     it was closed, and the second click would appear to do nothing. */
  it("both entry points open the same component through one state", () => {
    expect(picker).toContain("const [adding, setAdding] = useState(false);");
    expect(picker).toContain("const onAddAgent = () => { setOpen(false); setAdding(true); };");
    expect(picker.match(/onClick=\{onAddAgent\}/g)?.length ?? 0,
      "the field link, the panel action and the cold start all share it").toBeGreaterThanOrEqual(3);
    expect(picker).toContain("<AgentQuickAdd");
  });

  /* Changing your mind must return you to what you were doing, not to nowhere. And Esc must be
     STOPPED here: the pane behind this discards the whole draft on Escape. */
  it("Esc and Cancel close it and return focus to the search field", () => {
    expect(picker).toContain("const closeAdd = () => { setAdding(false); fieldRef.current?.focus(); };");
    expect(picker).toContain("onCancel={closeAdd}");
    expect(quickAdd).toContain('if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }');
    expect(quickAdd).toContain(">Cancel<");
    expect(quickAdd).toContain("Add and select");
  });

  /* Every field the old form collected survives — dropping any would quietly reduce what an
     inline add records, and the write path is the same contract the popup called. */
  it("the lift kept the whole form and the same write path", () => {
    for (const f of ["Agent name", "Agency", "Email (optional)", "Response wks (optional)"]) {
      expect(quickAdd, `${f} was dropped in the lift`).toContain(f);
    }
    expect(quickAdd).toContain("onCreateAgent({");
  });

  /* ⚠️ ONE SELECTOR FOR "HAS THIS AGENT BEEN QUERIED". The panel said "16 of 16 contacts queried"
     while every row beneath read "Not queried" — the rows were handed an EMPTY set by their
     caller, so nothing could ever look queried. Both now read the same derivation. */
  it("the panel count and the rows' query state come from one selector", () => {
    const list = [agent("a1"), agent("a2")];
    const ids = queriedAgentIds([q("a1")]);
    expect(ids.has("a1")).toBe(true);
    expect(ids.has("a2")).toBe(false);
    expect(queriedCount(list, [q("a1")]), "the panel counts what the rows mark")
      .toEqual({ done: ids.size, total: 2 });
    /* ⚠️ AMENDED: the consumer that was handed the empty set — the legacy field — is gone from the
       pane entirely (fix pack 2 §1), so what this now pins is that the selector itself is the one
       source, and that no caller anywhere hands a hardcoded set in its place. */
    expect(pane, "the empty set is what made them disagree").not.toContain("new Set<string>()");
    /* ⚠️ RE-POINTED: `queriedCount` is no longer rendered — the block's own sentence states the
       figures, derived from the same plates it lists. The rule survives: one derivation, from
       `queriedAgentIds`, and nothing is handed a hardcoded set. */
    expect(picker, "the picker derives, never receives, the queried set").toContain("nameplates(agents, queries)");
  });

  /* ⚠️ NO FIT SCORE, STAR RATING OR "RECOMMENDED" ORDERING ANYWHERE IN THE PICKER — a baked
     decision. A search result sorted by how highly you rated someone is a recommendation wearing
     a search's clothes, and the writer typed a name. The rating survives only where the writer
     SETS it, in the quick-add form: that is them recording a judgement, not the app making one. */
  it("no stars on any agent row, and no rating-led ordering", () => {
    expect(picker, "the grid card must not rate anyone").not.toContain("starRating");
    /* ⚠️ AMENDED: the component those assertions guarded is DELETED — create mode was its only
       consumer. The rules survive about the components that do the job now: the picker never
       rates, and the writer's own rating input lives in the extracted add form. */
    expect(quickAdd, "the writer's own rating stays where they SET it")
      .toContain('className="qc-qastars"');
    expect(quickAdd, "but nothing here orders by it").not.toContain("byRatingDesc");
  });

  /* ⚠️ THE ARIA MOVED WITH THE BEHAVIOUR. Leaving combobox roles pointing at a popup that no
     longer renders would describe a component that does not exist. */
  /* ⚠️ THE FIELD CONTROLS WHICHEVER LIST IS IN FRONT OF THE WRITER. With the dropdown open that is
     the dropdown; with it closed, the standing grid. Pointing `aria-controls` at a fixed id would
     describe one of the two lists as the answer at a moment when the other is on screen. */
  it("the ARIA follows whichever list is live", () => {
    expect(picker).toContain("aria-controls={open ? LIST_ID : GRID_ID}");
    expect(picker).toContain("aria-expanded={open}");
    expect(picker).toContain("id={LIST_ID}");
    expect(picker).toContain("id={GRID_ID}");
    expect(picker, "the highlight must name an element that exists")
      .toContain("aria-activedescendant={open ? (dActive >= 0 ? `qc-dr-${dActive}` : undefined)");
  });
});

/* ══ KEYBOARD ══════════════════════════════════════════════════════════════════════════════ */
describe("the keyboard model lives on the grid", () => {
  /* ⚠️ ↓ MEANS TWO DIFFERENT THINGS, AND WHICH DEPENDS ON WHETHER THE DROPDOWN IS OPEN. Open, it
     walks the results the writer is looking at; closed, it enters the standing grid. Sending it to
     the grid while a list of matches is on screen would step past the answer. */
  /* ⚠️ ↓ MEANS TWO DIFFERENT THINGS, AND WHICH DEPENDS ON WHETHER THE DROPDOWN IS OPEN. Open, it
     walks the results the writer is looking at. CLOSED, it now OPENS the list — a request to see
     the options, which jumping past into the standing grid would skip. */
  it("↓ walks the dropdown when open, and opens it when closed", () => {
    expect(picker).toContain("if (open) {");
    expect(picker).toContain('if (e.key === "ArrowDown") { e.preventDefault(); setDhl((h) => Math.min(h + 1, hits.length - 1)); return; }');
    expect(picker).toContain('if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setDhl(0); return; }');
  });

  /* Esc and an outside click must close it while the TEXT stays in the field — without a
     `dismissed` bit, "open" would be a pure function of the query and could not be put away. */
  it("Esc and an outside click close it; typing re-opens it", () => {
    expect(picker).toContain('if (e.key === "Escape" && open)');
    expect(picker).toContain('document.addEventListener("pointerdown", onDown)');
    expect(picker).toContain("const [open, setOpen] = useState(false);");
  });

  it("inside the grid: arrows move, Enter selects, Esc returns to the field", () => {
    expect(picker).toContain("const onGridKey = (e: React.KeyboardEvent) => {");
    expect(picker).toContain('if (e.key === "Escape")');
    expect(picker).toContain("fieldRef.current?.focus()");
    expect(picker).toContain("choose(res.cards[active])");
  });

  /* ⚠️ ENTER WITH NOTHING HIGHLIGHTED DOES NOTHING — no silent advance into a step with no agent. */
  it("Enter with no highlight does nothing", () => {
    expect(picker).toContain('if (e.key === "Enter" && active >= 0)');
  });

  /* ⚠️ ±1 IN DOM ORDER, NOT TWO-DIMENSIONAL. The grid is `auto-fill`, so its column count is a
     function of rendered width and is not knowable here — a guessed "row below" would jump
     somewhere nobody pointed at, and would guess differently at every viewport. */
  it("arrows step by one and stop at the end", () => {
    expect(moveInGrid(0, "ArrowDown", 3)).toBe(1);
    expect(moveInGrid(0, "ArrowRight", 3)).toBe(1);
    expect(moveInGrid(2, "ArrowDown", 3), "the last card is the last card").toBe(2);
    expect(moveInGrid(2, "ArrowUp", 3)).toBe(1);
    expect(moveInGrid(1, "Enter", 3), "only arrows move").toBeNull();
    expect(moveInGrid(0, "ArrowDown", 0), "an empty grid has nowhere to go").toBeNull();
  });

  /* The field is above the grid, so up out of the first card has exactly one honest answer. */
  it("up from the first card leaves the grid and returns to the field", () => {
    expect(moveInGrid(0, "ArrowUp", 3)).toBe(-1);
    expect(picker).toContain("if (next < 0) { setHl(-1); fieldRef.current?.focus(); return; }");
  });

  /* Typing shrinks the result set, so a stale index can point past the end — and an
     aria-activedescendant naming a missing element is worse than none. */
  it("the highlight is clamped against the live result count", () => {
    expect(picker).toContain("const active = hl >= 0 && hl < res.cards.length ? hl : -1;");
  });
});

/* ══ THE CARD ══════════════════════════════════════════════════════════════════════════════ */
describe("the card states five things, and omits the one it may not know", () => {
  it("avatar, name, agency, open/closed tag, expected reply time", () => {
    for (const cls of ["qc-acav", "qc-acwho", "qc-actag", "qc-acrt"]) {
      expect(picker, `${cls} is missing from the card`).toContain(cls);
    }
    expect(picker).toContain("agentInitials(a)");
    expect(picker).toContain("agentPrimary(a)");
    expect(picker).toContain("agentAgencyLine(a)");
  });

  /* Absent is ABSENT — no em-dash, no "unknown", no zero. A card with one fewer line is quieter
     than a card asserting it does not know something. */
  it("no stated reply time draws no line at all", () => {
    expect(replyLine(agent("a1", { responseTimeWeeks: 8 }))).toBe("~8 weeks");
    expect(replyLine(agent("a1", { responseTimeWeeks: 1 })), "singulars agree").toBe("~1 week");
    expect(replyLine(agent("a1"))).toBeNull();
    expect(replyLine(agent("a1", { responseTimeWeeks: 0 })), "zero is not a reply time").toBeNull();
    expect(picker).toContain("{reply && <span className=\"qc-acrt\">");
  });

  it("the grid is auto-fill, because the column it sits in changes width", () => {
    expect(rule(".qc-grid")).toContain("repeat(auto-fill, minmax(196px, 1fr))");
  });

  /* The keyboard highlight IS the selection marker — one treatment, or the two ways of using
     this grid look like two different controls. */
  it("hover and keyboard focus wear the same marker", () => {
    expect(rule(".qc-acard.on, .qc-acard:focus-visible")).toContain("box-shadow");
  });
});

/* ══ ART ═══════════════════════════════════════════════════════════════════════════════════ */
describe("art belongs to the cold start and nowhere else", () => {
  it("exactly one ArtSlot, in the cold branch", () => {
    expect(picker.match(/<ArtSlot/g)?.length ?? 0, "art in a populated state decorates a void")
      .toBe(1);
    const cold = sliceBetween(picker, 'state === "cold"', "const field =");
    expect(cold).toContain("<ArtSlot");
    expect(cold).toContain("Add your first agent");
  });

  /* ⚠️ THE RING IS MUTED GREY, NEVER SAGE. Sage means "done well" everywhere else in this app,
     and a writer who has queried their whole list has not finished anything — they have run out
     of people, which is neutral and often uncomfortable. */
  /* ⚠️ SUPERSEDED, AND THE PRINCIPLE SURVIVES. This asserted a compact PANEL — capped width, one
     row of actions, the count stated once — because at full width with three equal route cards it
     outranked the search field that does the actual work. The panel is now MERGED into the folded
     block, so there is no second container to compact; what carried over is the cap, the one row
     of actions, and the count appearing once, all asserted on the block instead. */
  it("the block is capped, its actions sit on one row, and the count is stated once", () => {
    expect(rule(".qc-fold")).toContain("max-width: 620px");
    expect(rule(".qc-routes"), "actions on one row, not a grid of cards").toContain("display: flex");
    const allq = picker.slice(picker.indexOf("{allQueried ? ("), picker.indexOf("      ) : ("));
    expect(allq.match(/foldedLine/g)?.length ?? 0, "the figures are stated once").toBe(1);
    expect(allq, "the route descriptions came back").not.toContain("Straight into your list");
  });

  /* ⚠️ THE RING IS RETIRED WITH THE PANEL, and the rule it enforced is retired with it: the ring
     existed to carry a figure the block's sentence now states in words, so there is no longer a
     numeral that could be tinted into an achievement. What survives is the reason — running out of
     people to query is neutral, often uncomfortable — and it survives as a ban on the block
     borrowing the app's good-state sage for a state that is not one. */
  it("the block does not dress a neutral state as an achievement, and the field stays live", () => {
    expect(rule(".qc-allqring"), "the count ring came back").toBe("");
    const fold = rule(".qc-fold");
    for (const sage of ["#7e9178", "#e9ede6", "var(--sage)"]) {
      expect(fold, `the block borrowed ${sage} — this state is neutral, not an achievement`)
        .not.toContain(sage);
    }
    const panelAt = picker.indexOf("{allQueried ? (");
    expect(panelAt, "the all-queried block is missing").toBeGreaterThan(-1);
    const allq = picker.slice(panelAt, picker.indexOf("      ) : ("));
    expect(allq).toContain("a resubmission, or a second manuscript");
    /* The field is rendered once for every state, above the panel — and now the GRID is too, so
       this state has a browsable list rather than only the promise of one. */
    expect(picker.slice(0, panelAt), "the search field must stay live — this is not a dead end")
      .toContain("{field}");
  });

  /* A route that goes nowhere teaches the wrong shape of the app. */
  it("route cards are omitted rather than rendered dead", () => {
    expect(picker).toContain("{onDiscover && (");
    expect(picker).toContain("{onSeeAll && (");
    expect(pane, "and the host omits them when it cannot navigate").toContain("onSeeAllAgents");
  });
});
