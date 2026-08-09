/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — stage 2's right column (ref design-refs/qc-create-fullscreen.html).
 *
 * Browser-measured against the built CSS at 1440×800, with a tall panel and a tall form:
 *   document scrollHeight − clientHeight ....... 0   (the page does not scroll)
 *   form column ......... 641.7px = 52.0%, scrolls (584 → 826)
 *   context column ...... 574.3px,       scrolls (539 → 621)
 *   sage header ......... pinned (moved 0px while the body scrolled 82px)
 * And at 1099px: the context column computes `display: none`, the form takes 100%, the page
 * still does not scroll.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  agentContextRows, agentAsks, agentHistory, freshnessStamp, hasContext, WORD_COUNT_ROW_BLOCKED,
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

const q = (id: string, status: QueryStatus, dateSent: string): Query =>
  ({ id, agentId: "a1", manuscriptId: "m1", status, dateSent }) as never;

const keys = (a: Agent, qs: Query[] = []) => agentContextRows(a, qs, null).map((r) => r.key);

describe("a missing row is omitted, never rendered empty", () => {
  it("a name-and-nothing-else agent yields only what it actually has", () => {
    expect(keys(bare())).toEqual(["agent", "status", "submit"]);
  });

  it("each row appears only once its data does", () => {
    expect(keys(bare({ city: "London", country: "GB" }))).toContain("location");
    expect(keys(bare())).not.toContain("location");
    expect(keys(bare({ genres: ["Literary"] }))).toContain("seeking");
    expect(keys(bare({ genres: [] }))).not.toContain("seeking");
    expect(keys(bare({ responseTimeWeeks: 8 }))).toContain("reply");
    expect(keys(bare({ responseTimeWeeks: undefined }))).not.toContain("reply");
  });

  /* Blank strings are not data. A genre array of one empty string would otherwise render a
     "Seeking" row containing nothing. */
  it("whitespace is not data", () => {
    expect(keys(bare({ genres: ["  ", ""] }))).not.toContain("seeking");
    expect(keys(bare({ city: "  ", country: "" }))).not.toContain("location");
  });

  it("the component renders what it is given, and never a dash placeholder", () => {
    expect(panel, "an empty-value placeholder crept in").not.toMatch(/["']—["']/);
    expect(panel).toContain("rows.map");
  });
});

describe("the rows say what is true, not what is convenient", () => {
  /* ⚠️ UNKNOWN reads as open app-wide and is not a stated fact — only an explicit CLOSED is
     reported as closed, so the panel never invents a door state. */
  it("only an explicit status is stated", () => {
    expect(agentContextRows(bare({ submissionStatus: SubmissionStatus.CLOSED }), [], null)
      .find((r) => r.key === "status")).toMatchObject({ value: "Closed to submissions", dot: "closed" });
    expect(keys(bare({ submissionStatus: SubmissionStatus.UNKNOWN }))).not.toContain("status");
  });

  it("an agency with no named agent says so rather than showing a blank", () => {
    const r = agentContextRows(bare({ name: "" }), [], null).find((x) => x.key === "agent");
    expect(r?.value).toContain("No named agent");
  });

  /* Absent is "not stated", which is a different fact from "they always reply" — so only a
     recorded `true` produces the row. */
  it("no-reply-means-no appears only when recorded, and uses their own window", () => {
    expect(agentContextRows(bare({ noResponseMeansNo: true, responseTimeWeeks: 8 }), [], null)
      .find((r) => r.key === "noreply")?.value).toBe("a pass after 8 weeks");
    expect(keys(bare({ noResponseMeansNo: false }))).not.toContain("noreply");
    expect(keys(bare({ noResponseMeansNo: undefined }))).not.toContain("noreply");
  });

  it("your history is derived from the queries on file", () => {
    const h = agentHistory("a1", [
      q("q1", QueryStatus.REJECTED, "2026-01-04"),
      q("q2", QueryStatus.QUERIED, "2026-08-01"),
    ], Date.parse("2026-08-09"))!;
    expect(h).toMatchObject({ open: 1, closed: 1 });
    expect(h.lastSent).toBe("1 Aug");
    expect(agentHistory("a1", []), "no queries means no row").toBeNull();
  });

  /* ⚠️ The same derivation step 2's checklist uses. The panel and the checklist state the same
     fact one column apart; two reads of materialsWanted could disagree. */
  it("what they ask for comes from the checklist's own derivation", () => {
    expect(agentAsks(bare({ materialsWanted: ["Query Letter", "Synopsis"] }))).toEqual(["Query letter", "Synopsis"]);
    expect(read("./agentContext.ts")).toContain("materialRowsFromAgent");
  });
});

/* ⚠️ THE ONE ROW THE SPEC ASKED FOR THAT CANNOT BE BUILT. */
describe("word count is omitted because the field does not exist", () => {
  it("there is no word-count row, and the reason is recorded in the source", () => {
    expect(keys(bare({ genres: ["Literary"], responseTimeWeeks: 8 }))).not.toContain("wordcount");
    expect(WORD_COUNT_ROW_BLOCKED).toContain("do not exist");
  });

  it("the Agent model really has no range to read", () => {
    const types = read("../types.ts");
    const agentBlock = types.slice(types.indexOf("export interface Agent {"), types.indexOf("\n}", types.indexOf("export interface Agent {")));
    expect(agentBlock).not.toMatch(/wordCount/i);
  });
});

describe("the freshness stamp", () => {
  /* Mandatory whenever wish-list or genre data shows — both go stale silently, and acting on a
     two-year-old MSWL is the failure it prevents. */
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
    // Comments stripped: both files EXPLAIN that they carry no match language, and an
    // assertion about the code must not be able to match prose about the code.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const src = strip(read("./agentContext.ts")) + strip(panel);
    for (const banned of ["fitScore", "matchScore", "starRating", "good fit", "great match", "recommend"]) {
      expect(src, `${banned} turns a report into an opinion`).not.toContain(banned);
    }
  });
});

describe("the fallback is art, not an empty table", () => {
  it("a bare record gets the ArtSlot instead of a frame around nothing", () => {
    expect(hasContext(bare(), [])).toBe(false);
    expect(hasContext(bare({ mswlNotes: "Send me ghosts" }), [])).toBe(true);
    expect(hasContext(bare({ genres: ["Literary"], city: "London" }), [])).toBe(true);
    expect(panel).toContain('<ArtSlot name="agent-unknown"');
  });

  it("the slot is briefed in the house register and counted in the census", () => {
    const art = read("../components/todo/ArtSlot.tsx");
    expect(art).toContain('"agent-unknown"');
    expect(art, "a brief is the contract — the caption is the illustrator's line").toContain("A closed reference book");
    expect(read("../components/todo/artSlots.test.tsx"), "the census must count it").toContain('"agent-unknown"');
  });
});

describe("the layout — verified in the browser, asserted here", () => {
  const rule = (sel: string): string => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
    if (!m) return "";
    const open = css.indexOf("{", m.index);
    return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
  };

  /* ⚠️ `min-height: 0` is the whole trick. Without it a flex item's automatic minimum is its
     CONTENT size, the row grows to fit, and the scroll lands on the document instead of inside
     the columns — which is exactly what "the page must not scroll" forbids. */
  it("both columns can be shorter than their content", () => {
    for (const sel of [".qc-two", ".qc-form", ".qc-ctx", ".qc-ctxbody"]) {
      expect(rule(sel), `${sel} is missing`).not.toBe("");
      expect(rule(sel), `${sel} would grow to its content and push the scroll onto the page`)
        .toContain("min-height: 0");
    }
    expect(rule(".qc-form")).toContain("overflow-y: auto");
    expect(rule(".qc-ctxbody")).toContain("overflow-y: auto");
  });

  it("the form column is the ref's 52%", () => {
    expect(rule(".qc-form")).toContain("flex: 0 0 52%");
  });

  it("the sage header is pinned outside the scroller", () => {
    expect(rule(".qc-ctxhd"), "a scrolling header leaves the facts unattributed").toContain("flex: none");
    expect(rule(".qc-ctxhd")).toContain("var(--sage-band)");
  });

  /* Measured, not guessed: below this the rows wrap to three lines each AND the form drops under
     a comfortable measure. One column with the full width beats two that are both too narrow. */
  it("the panel is not rendered below 1100px", () => {
    /* ⚠️ ANCHOR ON THIS BLOCK, not on the breakpoint. There are TWO `max-width: 1100px` blocks
       in this sheet — the header's (qch) came first in P3 — and slicing from the first match
       over-ran into this one, so the assertions below passed while measuring the wrong rule. */
    const at = css.indexOf("@media (max-width: 1100px) {\n  .qc-two");
    expect(at, "the panel's own breakpoint block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at) + 2);
    expect(block).toContain(".qc-two > .qc-ctx { display: none; }");
    expect(block, "the form must take the freed width").toContain(".qc-form { flex: 1 1 0;");
  });

  /* The panel is REFERENCE, not input: Tab must walk the stack and reach Save. */
  it("nothing in the panel is focusable but the one real link", () => {
    const bare = panel.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
    expect(bare).not.toContain("<button");
    expect(bare).not.toContain("<input");
    expect(bare, "the panel must take no tab stop of its own").not.toContain("tabIndex");
    expect(panel, "the agency link is the single legitimate stop").toContain("<a className=\"qc-ctxlink\"");
  });
});
