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
import { readFileSync } from "fs";
import {
  PICKER_LIMIT, pickerState, pickerCards, queriedCount, replyLine, moveInGrid, matchesQuery,
} from "./agentPicker";
import { SubmissionStatus, QueryStatus, type Agent, type Query } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const picker = read("../components/queries/AgentPicker.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
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

const q = (agentId: string): Query =>
  ({ id: "q" + agentId, agentId, manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-01-01" }) as Query;

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
    expect(pickerCards(list, [], "").cards.map((a) => a.id)).toEqual(["a1"]);
  });
});

/* ══ THE GRID IS THE RESULT SET ════════════════════════════════════════════════════════════ */
describe("the field filters in place; there is no open/close state", () => {
  /* ⚠️ AN EMPTY FIELD AND A TYPED ONE ASK DIFFERENT QUESTIONS. Blank, the grid SUGGESTS the
     agents you have never queried. Typed, it SEARCHES — and hiding already-queried agents there
     would be a lie: a second query to the same agent is a real thing, and in the all-queried
     state it is the only thing left to do. */
  it("blank suggests the un-queried; typing widens the pool to everyone", () => {
    const list = [agent("a1", { name: "Elinor Hale" }), agent("a2", { name: "Joseph Okafor" })];
    expect(pickerCards(list, [q("a1")], "").cards.map((a) => a.id)).toEqual(["a2"]);
    expect(pickerCards(list, [q("a1")], "elinor").cards.map((a) => a.id), "a queried agent must stay findable")
      .toEqual(["a1"]);
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
    const r = pickerCards(many, [], "");
    expect(r.cards).toHaveLength(PICKER_LIMIT);
    expect(r.truncated).toBe(true);
    expect(r.cards[0].dateAdded, "newest first").toBe("2026-01-11");
  });

  /* The whole point of the change: no overlay, so no state in which results are hidden. */
  it("the picker mounts no popup and holds no open/close state", () => {
    const code = picker.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    for (const banned of ["setOpen", "sa-ag-menu", "menuStyle", "useFixedMenu"]) {
      expect(code, `${banned} would reintroduce the overlay`).not.toContain(banned);
    }
    expect(code, "the grid is always rendered, never toggled").toContain('role="listbox"');
  });

  it("the field is autofocused, and the pane no longer mounts the combobox", () => {
    expect(picker).toContain("autoFocus");
    const stage1 = pane.slice(pane.indexOf("!stackAvailable(agent)"), pane.indexOf("STAGE 2"));
    expect(stage1, "the stage-1 combobox is what opened on mount").toContain("quickAddOpen && (");
    expect(stage1).toContain("<AgentPicker");
  });

  /* ⚠️ THE ARIA MOVED WITH THE BEHAVIOUR. Leaving combobox roles pointing at a popup that no
     longer renders would describe a component that does not exist. */
  it("the ARIA points at the grid, not at the retired popup", () => {
    expect(picker).toContain('aria-controls={GRID_ID}');
    expect(picker).toContain('id={GRID_ID}');
    expect(picker, "the list genuinely is always expanded").toContain('aria-expanded="true"');
    expect(picker).toContain("aria-activedescendant={active >= 0");
    expect(picker, "the highlight must name an element that exists").toContain("`qc-ac-${active}`");
  });
});

/* ══ KEYBOARD ══════════════════════════════════════════════════════════════════════════════ */
describe("the keyboard model lives on the grid", () => {
  it("↓ enters the grid; Enter selects; Esc returns to the field", () => {
    expect(picker).toContain('if (e.key === "ArrowDown" && res.cards.length > 0)');
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
    const cold = picker.slice(picker.indexOf('state === "cold"'), picker.indexOf("const field ="));
    expect(cold).toContain("<ArtSlot");
    expect(cold).toContain("Add your first agent");
  });

  /* ⚠️ THE RING IS MUTED GREY, NEVER SAGE. Sage means "done well" everywhere else in this app,
     and a writer who has queried their whole list has not finished anything — they have run out
     of people, which is neutral and often uncomfortable. */
  it("the all-queried ring is muted, and the field stays live", () => {
    const ring = rule(".qc-allqring");
    expect(ring).toContain("#cfc7bb");
    for (const sage of ["#7e9178", "#e9ede6", "var(--sage)"]) {
      expect(ring, `the ring borrowed ${sage} — this state is neutral, not an achievement`)
        .not.toContain(sage);
    }
    const allq = picker.slice(picker.indexOf('state === "all-queried"'), picker.indexOf("1 · THE GRID"));
    expect(allq, "the search field must stay live — this is not a dead end").toContain("{field}");
    expect(allq).toContain("a resubmission, or a second manuscript");
  });

  /* A route that goes nowhere teaches the wrong shape of the app. */
  it("route cards are omitted rather than rendered dead", () => {
    expect(picker).toContain("{onDiscover && (");
    expect(picker).toContain("{onSeeAll && (");
    expect(pane, "and the host omits them when it cannot navigate").toContain("onSeeAllAgents");
  });
});
