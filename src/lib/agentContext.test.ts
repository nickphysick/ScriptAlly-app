/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — quiet reference.
 * Refs: qc-agent-panel-v2.html (sections, three data states) · qc-focus.html panel 2 (weight).
 *
 * ⚠️ SUPERSEDES two earlier locks. The first panel was a flat label/value table in a column that
 * STRETCHED to fill. The second gave it an identity block — monogram, agency in Playfair 18, the
 * agent's name — all of which already sit in the agent row on the LEFT at twice the size, so the
 * panel read as a second subject competing with the form. It is now an aside: flat ground, no
 * shadow, Inter values, and a caption bar saying what the column is for.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  panelHeader, statCells, noReplyPolicy, agentHistory, historyLine, seekingChips, agentAsks,
  freshnessStamp, panelState, WORD_COUNT_BLOCKED, PARTIAL_TAIL, NAME_ONLY_NOTE,
} from "./agentContext";
import { SubmissionStatus, SubmissionMethod, QueryStatus, type Agent, type Query } from "../types";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const panel = read("../components/queries/AgentContextPanel.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");

const bare = (over: Partial<Agent> = {}): Agent => ({
  id: "a1", userId: "u", name: "William Tan", agency: "Foxglove Literary", email: "", website: "",
  genres: [], mswlNotes: "", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, materialsWanted: [], dateAdded: "2026-01-01",
  lastCheckedDate: "2026-08-01", notes: "", ...over,
}) as Agent;

const rich = (over: Partial<Agent> = {}) => bare({
  genres: ["Literary", "Upmarket"], responseTimeWeeks: 8, noResponseMeansNo: true,
  materialsWanted: ["Query Letter", "Synopsis"],
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

/* ══ QUIET REFERENCE — an aside, not a second subject ══════════════════════════════════════ */
describe("the panel reads as quieter than the form", () => {
  it("flat ground, hairline, no shadow — a shadow would imply floating", () => {
    const r = rule(".qc-ctx");
    expect(r, "the panel rule is missing").not.toBe("");
    expect(r).toContain("background: #fbf9f5");
    expect(r).toContain("border: 1px solid var(--hairline)");
    expect(r, "a shadow makes it float; this sits back").not.toContain("box-shadow");
  });

  it("values are Inter, not Playfair — serif numerals read as a second headline", () => {
    expect(rule(".qc-ctxv")).toContain("font-family: inherit");
    expect(rule(".qc-ctxv"), "the serif came back").not.toContain("var(--f12-serif)");
  });

  /* All three of monogram, agency and agent name already sit in the agent row on the left at
     twice the size. The LOCATION went with the block and has no other home in this structure —
     flagged, not smuggled into another section. */
  it("the identity block is gone; a caption bar names the column's job instead", () => {
    expect(panel, "the monogram came back").not.toContain("qc-ctxmg");
    expect(panel, "the agency heading came back").not.toContain("<h3>");
    expect(panel).toContain("For reference");
    expect(rule(".qc-ctxhead"), "the caption bar rule is missing").not.toBe("");
  });

  it("but the one fact the left column does not carry survives — their door", () => {
    expect(panelHeader(bare({ submissionStatus: SubmissionStatus.CLOSED })).status).toMatchObject({ open: false });
    expect(panelHeader(bare()).status).toMatchObject({ open: true });
    expect(panelHeader(bare({ submissionStatus: SubmissionStatus.UNKNOWN })).status,
      "UNKNOWN reads as open app-wide and is not a stated fact").toBeNull();
  });
});

/* ══ THE POINT OF THE HEIGHT REDESIGN ══════════════════════════════════════════════════════ */
describe("the panel ends where its content ends", () => {
  it("height auto, capped at the column — never stretched to fill it", () => {
    const r = rule(".qc-ctx");
    expect(r).toContain("height: auto");
    expect(r).toContain("max-height: 100%");
    expect(r).toContain("min-height: 200px");
    /* Without this the row's default `align-items: stretch` overrides the auto height and the
       panel fills the column again — the exact bug the redesign fixes. */
    expect(r, "stretch would beat the auto height").toContain("align-self: flex-start");
  });

  it("only the body scrolls; head, strip and footer stay put", () => {
    expect(rule(".qc-ctxbody")).toContain("overflow-y: auto");
    expect(rule(".qc-ctxbody")).toContain("min-height: 0");
    for (const fixed of [".qc-ctxhead", ".qc-ctxstats", ".qc-ctxfoot"]) {
      expect(rule(fixed), `${fixed} must not flex`).toContain("flex: none");
    }
  });

  it("the wish list is clamped to four lines, with a real toggle", () => {
    expect(rule(".qc-ctxclamp")).toContain("-webkit-line-clamp: 4");
    expect(panel).toContain('className={showAll ? undefined : "qc-ctxclamp"}');
    expect(panel).toContain("aria-expanded={showAll}");
  });
});

describe("the stat strip carries statistics only", () => {
  it("two cells, with the long honest captions", () => {
    const cells = statCells(rich());
    expect(cells.map((c) => c.key)).toEqual(["reply", "submit"]);
    expect(cells.map((c) => c.caption)).toEqual(["Expected response time", "Preferred submission method"]);
  });

  /* ⚠️ THE POLICY IS A SENTENCE, NOT A STATISTIC — and it WAS a third cell: "Yes" under "No
     reply = pass", which states the shape of a fact without stating the fact. */
  it("the no-reply policy is prose beneath the strip, never a cell", () => {
    expect(statCells(rich()).some((c) => (c.key as string) === "noreply")).toBe(false);
    expect(noReplyPolicy(bare({ noResponseMeansNo: true, responseTimeWeeks: 8 })))
      .toBe("No reply after 8 weeks means a pass.");
    expect(noReplyPolicy(bare({ noResponseMeansNo: true }))).toBe("No reply means a pass.");
    expect(panel).toContain('className="qc-ctxpolicy"');
  });

  it("absent is not stated — a different thing from 'they always reply'", () => {
    expect(noReplyPolicy(bare({ noResponseMeansNo: false }))).toBeNull();
    expect(noReplyPolicy(bare({ noResponseMeansNo: undefined }))).toBeNull();
  });

  it("cells are equal width and their captions wrap rather than truncate", () => {
    expect(rule(".qc-ctxstat")).toContain("flex: 1 1 0");
    expect(rule(".qc-ctxk"), "a wrapped caption needs its line-height").toContain("line-height");
    expect(rule(".qc-ctxk"), "truncation would abbreviate the caption").not.toContain("text-overflow");
  });

  it("it thins, then disappears", () => {
    expect(statCells(bare()).map((c) => c.key)).toEqual(["submit"]);
    expect(statCells(bare({ submissionMethod: undefined as never }))).toHaveLength(0);
    expect(panel).toContain("cells.length > 0 &&");
  });
});

/* ══ THE THREE DATA STATES ═════════════════════════════════════════════════════════════════ */
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
     Judging by "does anything render" would call every record rich. */
  it("name-only: a name and nothing else", () => {
    expect(panelState(bare(), [])).toBe("name-only");
    expect(panel).toContain("NAME_ONLY_NOTE");
    expect(NAME_ONLY_NOTE, "it must offer the next step, not report a lack").toContain("You can still log the query");
  });

  it("and the name-only state gets art, not an empty table", () => {
    expect(panel).toContain('<ArtSlot name="agent-unknown"');
    expect(read("../components/todo/ArtSlot.tsx")).toContain('"agent-unknown"');
    expect(read("../components/todo/artSlots.test.tsx"), "the census must count it").toContain('"agent-unknown"');
  });
});

describe("a missing thing omits itself, entirely", () => {
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

  it("what they ask for carries its quantity, from the checklist's own derivation", () => {
    expect(agentAsks(bare({ materialsWanted: ["Query Letter", "First 5 Chapters"] })))
      .toEqual([{ name: "Query letter", qty: null }, { name: "Opening sample", qty: "5 chapters" }]);
    expect(read("./agentContext.ts")).toContain("materialRowsFromAgent");
  });
});

/* ⚠️ THE ONE THING THREE SPECS HAVE NOW ASKED FOR THAT CANNOT BE BUILT. */
describe("the word-count line is omitted because the field does not exist", () => {
  it("the reason and the remedy are both recorded", () => {
    expect(WORD_COUNT_BLOCKED).toContain("do not exist");
    expect(read("./agentContext.ts"), "the next reader needs to know what would unblock it")
      .toContain("WHAT IT NEEDS");
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
});

/* ══ THE ACTIVE-STEP CUE (cue D, qc-focus.html) ════════════════════════════════════════════ */
describe("the pulse is an invitation, not a status", () => {
  it("a burgundy halo on the active step, CSS keyframes only", () => {
    expect(css).toContain("@keyframes qc-pulse");
    expect(rule(".qc-sec.qc-active.qc-pulse")).toContain("animation: qc-pulse 2.1s ease-in-out infinite");
    expect(css, "the ref's own bloom").toContain("rgba(180, 90, 64, 0.26)");
  });

  /* ⚠️ IT STOPS ON ENGAGEMENT and does not return for that step. A halo still breathing while
     you type reads as an unresolved alert about the thing you are already doing. CSS cannot know
     about engagement, so the class is REMOVED rather than overridden. */
  it("it stops the moment the writer engages with that step", () => {
    expect(pane).toContain('states.when === "active" && !engaged ? " qc-pulse" : ""');
    expect(pane).toContain("onFocusCapture={() => setEngaged(true)}");
    expect(pane).toContain("onInput={() => setEngaged(true)}");
  });

  it("and begins again only when a new step becomes active", () => {
    expect(pane, "engagement must reset with the step, not persist across the stack")
      .toMatch(/useEffect\(\(\) => \{\s*setEngaged\(false\);/);
  });

  it("reduced motion drops it entirely, leaving the lifted border", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) { .qc-sec.qc-active.qc-pulse");
    expect(at, "the pulse's reduced-motion rule is missing").toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at) + 1)).toContain("animation: none");
    expect(rule(".qc-sec.qc-active"), "the border must survive as the fallback treatment")
      .toContain("border-color");
  });

  /* ⚠️ THE REAL "YOU ARE HERE" IS DOM FOCUS — a focus ring and caret beat any animation, and
     without focus inside the section Enter has nothing to accept from. The pulse is decoration;
     this is the mechanism, which is why reduced motion loses nothing that matters. */
  it("the first control of a newly active step takes real focus", () => {
    expect(pane).toContain('[data-step="${active}"] .qc-body');
    expect(pane).toContain("first?.focus()");
    expect(pane, "focus must never land on something inert").toContain(':not([disabled])');
    expect(pane).toContain('[tabindex]:not([tabindex="-1"])');
  });
});

describe("placement and reach", () => {
  it("the panel is not rendered below 1100px", () => {
    /* ⚠️ Anchor on THIS block: there are two max-width:1100px blocks in the sheet — the header's
       came first — and slicing from the first match over-ran into this one. */
    const at = css.indexOf("@media (max-width: 1100px) {\n  .qc-two");
    expect(at, "the panel's own breakpoint block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at) + 2);
    expect(block).toContain(".qc-two > .qc-ctx { display: none; }");
    expect(block, "the form must take the freed width").toContain(".qc-form { flex: 1 1 0;");
  });

  /* The panel is reference: Tab must walk the form stack and reach Save. Its three real controls
     — the wish-list disclosure, the history link and the agency link — do deserve a stop; an
     INPUT never appears. */
  it("no inputs — the panel is not a second form", () => {
    const bareSrc = panel.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    expect(bareSrc).not.toContain("<input");
    expect(bareSrc).not.toContain("<textarea");
    expect(bareSrc).not.toContain("<select");
    expect(bareSrc, "the panel must not take a tab stop it did not earn").not.toContain("tabIndex");
  });
});
