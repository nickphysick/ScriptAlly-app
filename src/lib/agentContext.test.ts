/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL, v2 (ref design-refs/qc-agent-panel-v2.html).
 *
 * ⚠️ SUPERSEDES the first panel's lock. That version was a flat label/value table in a column
 * that STRETCHED to full height — which is the thing this redesign exists to fix: a thin record
 * stretched to fill reads as something that failed to load. The panel now ends where its content
 * ends, and its three data states (rich · partial · name-only) are the acceptance criteria.
 *
 * Browser-measured against the built CSS at 1440×800 — see the heights in `agentPanelV2` notes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  panelIdentity, statCells, agentHistory, historyLine, seekingChips, agentAsks,
  freshnessStamp, panelState, WORD_COUNT_BLOCKED, PARTIAL_TAIL, NAME_ONLY_NOTE,
} from "./agentContext";
import { SubmissionStatus, SubmissionMethod, QueryStatus, type Agent, type Query } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const panel = read("../components/queries/AgentContextPanel.tsx");

const bare = (over: Partial<Agent> = {}): Agent => ({
  id: "a1", userId: "u", name: "William Tan", agency: "Foxglove Literary", email: "", website: "",
  genres: [], mswlNotes: "", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, materialsWanted: [], dateAdded: "2026-01-01",
  lastCheckedDate: "2026-08-01", notes: "", ...over,
}) as Agent;

const rich = (over: Partial<Agent> = {}) => bare({
  city: "London", country: "GB", genres: ["Literary", "Upmarket"], responseTimeWeeks: 8,
  noResponseMeansNo: true, materialsWanted: ["Query Letter", "Synopsis"],
  mswlNotes: "Voice-driven literary fiction with a strong sense of place.", ...over,
});

const q = (id: string, status: QueryStatus, dateSent: string): Query =>
  ({ id, agentId: "a1", manuscriptId: "m1", status, dateSent }) as never;

const rule = (sel: string): string => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

/* ══ THE POINT OF THE REDESIGN ═════════════════════════════════════════════════════════════ */
describe("the panel ends where its content ends", () => {
  it("height auto, capped at the column — never stretched to fill it", () => {
    const r = rule(".qc-ctx");
    expect(r, "the panel rule is missing").not.toBe("");
    expect(r).toContain("height: auto");
    expect(r).toContain("max-height: 100%");
    expect(r).toContain("min-height: 200px");
    /* ⚠️ Without this the row's default `align-items: stretch` overrides the auto height and the
       panel fills the column again — the exact bug this redesign is fixing. */
    expect(r, "stretch would beat the auto height").toContain("align-self: flex-start");
  });

  it("only the body scrolls; identity, stats and footer stay put", () => {
    expect(rule(".qc-ctxbody")).toContain("overflow-y: auto");
    expect(rule(".qc-ctxbody")).toContain("min-height: 0");
    for (const fixed of [".qc-ctxid", ".qc-ctxstats", ".qc-ctxfoot"]) {
      expect(rule(fixed), `${fixed} must not flex`).toContain("flex: none");
    }
  });

  /* A long wish list is otherwise the whole column and the sections beneath stop being findable. */
  it("the wish list is clamped to four lines, with a real toggle", () => {
    expect(rule(".qc-ctxclamp")).toContain("-webkit-line-clamp: 4");
    expect(panel).toContain('className={showAll ? undefined : "qc-ctxclamp"}');
    expect(panel).toContain('aria-expanded={showAll}');
  });
});

/* ══ THE THREE STATES — the ref's acceptance criteria ══════════════════════════════════════ */
describe("the three data states", () => {
  it("rich: everything recorded", () => {
    expect(panelState(rich(), [q("q1", QueryStatus.QUERIED, "2026-08-01")])).toBe("rich");
  });

  it("partial: some sections survive, and it says so once at the foot", () => {
    expect(panelState(bare({ genres: ["Literary"], responseTimeWeeks: 8 }), [])).toBe("partial");
    expect(panel).toContain("PARTIAL_TAIL");
    expect(PARTIAL_TAIL).toBe("Nothing else recorded for this agent yet.");
  });

  /* ⚠️ COUNT WHAT WAS RECORDED, NOT WHAT RENDERS. submissionStatus and submissionMethod are
     required fields with defaults, so every agent already yields a pill and a Submit-by cell.
     Judging by "does anything render" would call every record rich and this state would never
     appear at all. */
  it("name-only: a name and nothing else", () => {
    expect(panelState(bare(), [])).toBe("name-only");
    expect(panel).toContain("NAME_ONLY_NOTE");
    expect(NAME_ONLY_NOTE, "it must offer the next step, not report a lack").toContain("You can still log the query");
  });

  it("and the name-only state gets art, not an empty table", () => {
    expect(panel).toContain('<ArtSlot name="agent-unknown"');
    const art = read("../components/todo/ArtSlot.tsx");
    expect(art).toContain('"agent-unknown"');
    expect(read("../components/todo/artSlots.test.tsx"), "the census must count it").toContain('"agent-unknown"');
  });
});

describe("a missing thing omits itself, entirely", () => {
  it("the stat strip thins, then disappears", () => {
    expect(statCells(rich()).map((c) => c.key)).toEqual(["reply", "noreply", "submit"]);
    expect(statCells(bare()).map((c) => c.key)).toEqual(["submit"]);
    expect(statCells(bare({ submissionMethod: undefined as never }))).toHaveLength(0);
    expect(panel, "the strip must omit itself when empty").toContain("cells.length > 0 &&");
  });

  it("each section renders only once its data does", () => {
    expect(seekingChips(bare())).toHaveLength(0);
    expect(seekingChips(bare({ genres: ["  ", ""] })), "whitespace is not data").toHaveLength(0);
    expect(agentAsks(bare())).toHaveLength(0);
    for (const guard of ["chips.length > 0 &&", "asks.length > 0 &&", "mswl && ("]) {
      expect(panel, `a section renders unguarded: ${guard}`).toContain(guard);
    }
  });

  it("no dash, no placeholder, anywhere", () => {
    expect(panel).not.toMatch(/["']—["']/);
    expect(panel).not.toMatch(/["']N\/A["']/);
  });

  it("identity parts omit themselves too", () => {
    expect(panelIdentity(bare()).location).toBeNull();
    expect(panelIdentity(bare({ submissionStatus: SubmissionStatus.UNKNOWN })).status).toBeNull();
    expect(panelIdentity(bare({ city: "London", country: "GB" })).location).toBe("London, United Kingdom");
  });

  it("an agency with no named agent says so rather than showing a blank", () => {
    expect(panelIdentity(bare({ name: "" })).role).toBe("No named agent · general submissions");
    expect(panelIdentity(bare()).role, "a named agent is just their name").toBe("William Tan");
  });
});

describe("the rows say what is true", () => {
  it("only an explicit door state produces a pill", () => {
    expect(panelIdentity(bare({ submissionStatus: SubmissionStatus.CLOSED }).valueOf() as Agent).status)
      .toMatchObject({ open: false });
    expect(panelIdentity(bare()).status).toMatchObject({ open: true });
  });

  /* Absent is "not stated" — a different fact from "they always reply". */
  it("no-reply-means-pass appears only when recorded", () => {
    expect(statCells(bare({ noResponseMeansNo: true })).some((c) => c.key === "noreply")).toBe(true);
    expect(statCells(bare({ noResponseMeansNo: false })).some((c) => c.key === "noreply")).toBe(false);
    expect(statCells(bare({ noResponseMeansNo: undefined })).some((c) => c.key === "noreply")).toBe(false);
  });

  it("history counts open and closed and points at the most recent", () => {
    const h = agentHistory("a1", [
      q("q1", QueryStatus.REJECTED, "2026-01-04"),
      q("q2", QueryStatus.QUERIED, "2026-08-01"),
    ], Date.parse("2026-08-09"))!;
    expect(h).toMatchObject({ open: 1, closed: 1, latestId: "q2" });
    expect(historyLine(h)).toBe("1 open · 1 closed · last sent 1 Aug");
  });

  /* The zero case is worth STATING — "this is your first" is information, not an empty row. */
  it("and says so when there are none", () => {
    expect(agentHistory("a1", [])).toBeNull();
    expect(historyLine(null)).toBe("No queries yet · this is your first");
  });

  /* The same derivation step 2's checklist uses — two reads of materialsWanted could disagree. */
  it("what they ask for carries its quantity, from the checklist's own derivation", () => {
    expect(agentAsks(bare({ materialsWanted: ["Query Letter", "First 5 Chapters"] })))
      .toEqual([{ name: "Query letter", qty: null }, { name: "Opening sample", qty: "5 chapters" }]);
    expect(read("./agentContext.ts")).toContain("materialRowsFromAgent");
  });
});

/* ⚠️ THE ONE THING TWO SPECS HAVE ASKED FOR THAT CANNOT BE BUILT. */
describe("the word-count line is omitted because the field does not exist", () => {
  it("the reason is recorded, not silently skipped", () => {
    expect(WORD_COUNT_BLOCKED).toContain("do not exist");
    expect(panel, "the omission must be explained where someone would look for the line")
      .toContain("WORD_COUNT_BLOCKED");
  });

  it("the Agent model really has no range to read", () => {
    const types = read("../types.ts");
    const at = types.indexOf("export interface Agent {");
    expect(types.slice(at, types.indexOf("\n}", at))).not.toMatch(/wordCount/i);
  });
});

describe("the freshness stamp", () => {
  it("appears whenever MSWL or genres are shown", () => {
    expect(freshnessStamp(bare({ mswlNotes: "Send me ghosts" }), Date.parse("2026-08-09"))).toBe("Updated 1 Aug");
    expect(freshnessStamp(bare({ genres: ["Literary"] }), Date.parse("2026-08-09"))).toBe("Updated 1 Aug");
  });

  it("and not when neither is", () => {
    expect(freshnessStamp(bare())).toBeNull();
  });

  it("an unchecked record says so rather than showing an empty stamp", () => {
    expect(freshnessStamp(bare({ genres: ["Literary"], lastCheckedDate: "" }))).toBe("Never checked");
  });
});

describe("it reports; the writer judges", () => {
  it("no score, no rating, no match language anywhere", () => {
    // Comments stripped: both files EXPLAIN that they carry none, and an assertion about the
    // code must not be able to match prose about the code.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const src = strip(read("./agentContext.ts")) + strip(panel);
    for (const banned of ["fitScore", "matchScore", "starRating", "good fit", "great match", "recommend"]) {
      expect(src, `${banned} turns a report into an opinion`).not.toContain(banned);
    }
  });

  it("the genre chips are plain — no cross-reference against the manuscript", () => {
    expect(rule(".qc-ctxg"), "a highlighted chip would be a match score in disguise")
      .not.toContain("var(--sage");
  });
});

describe("placement and reach", () => {
  /* Measured, not guessed: below this the sections wrap to three lines each AND the form drops
     under a comfortable measure. One column with the full width beats two that are both cramped. */
  it("the panel is not rendered below 1100px", () => {
    const at = css.indexOf("@media (max-width: 1100px) {\n  .qc-two");
    expect(at, "the panel's own breakpoint block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at) + 2);
    expect(block).toContain(".qc-two > .qc-ctx { display: none; }");
    expect(block, "the form must take the freed width").toContain(".qc-form { flex: 1 1 0;");
  });

  /* ⚠️ AMENDED from the first panel's lock, which asserted NO buttons at all. The v2 panel has
     three real controls — the wish-list disclosure, the history link and the agency link — and
     all three deserve a tab stop. What must never appear is an INPUT: the panel is reference,
     and Tab has to walk the form stack and reach Save without detouring through a field. */
  it("no inputs — the panel is reference, not a second form", () => {
    const bareSrc = panel.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    expect(bareSrc).not.toContain("<input");
    expect(bareSrc).not.toContain("<textarea");
    expect(bareSrc).not.toContain("<select");
    expect(bareSrc, "the panel must not take a tab stop it did not earn").not.toContain("tabIndex");
  });

  it("its three controls are real buttons and links, not clickable divs", () => {
    expect(panel).toContain('className="qc-ctxmore"');
    expect(panel).toContain('className="qc-ctxopen"');
    expect(panel).toContain('className="qc-ctxlink"');
    expect(panel.match(/<button type="button"/g)?.length ?? 0).toBe(2);
  });
});
