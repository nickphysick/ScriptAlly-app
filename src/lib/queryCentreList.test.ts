/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · P2 — the editorial query list (ref design-refs/query-centre-final.html).
 *
 * The head REUSES To-do's values rather than approximating them, and that distinction is the
 * lock: Playfair 17/700 + a mono count over a 1px #ece5d9 warm hairline, exactly as todo.css
 * draws its section heads. The ref shows a 2px ink rule — that is the AGENT LIST's grouping
 * treatment, and the live To-do grammar wins here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const todoCss = read("../components/todo/todo.css");
const queries = read("../components/Queries.tsx");

const rule = (sheet: string, selector: string): string => {
  const at = sheet.indexOf("\n" + selector + " {");
  return at < 0 ? "" : sheet.slice(at, sheet.indexOf("}", at) + 1);
};

describe("the head reuses To-do's values, it does not approximate them", () => {
  it("Playfair 17/700 — the same numbers todo.css uses", () => {
    const mine = rule(css, ".f12-lhtitle h2");
    const theirs = rule(todoCss, ".tdb-sec h2");
    expect(mine, "the head rule is missing").not.toBe("");
    for (const v of ["var(--f12-serif)", "font-size: 17px", "font-weight: 700"]) {
      expect(mine, `head lost ${v}`).toContain(v);
      expect(theirs, `To-do no longer uses ${v} — the two have drifted apart`).toContain(v);
    }
  });

  it("the rule is To-do's 1px warm hairline, NOT the agent list's 2px ink rule", () => {
    /* ⚠️ TOKENISED BY §1, AND THE COUPLING HAD TO BE RESTATED ON THE TOKEN'S VALUE. The clause is
       that this hairline TRACKS To-do's; once the rule reads a name, comparing the rule's text to
       To-do's literal compares two different kinds of thing and would pass while the token drifted.
       The value is asserted where it is now declared. */
    const head = rule(css, ".f12-lhtitle");
    expect(head).toContain("border-bottom: 1px solid var(--qc-rim-title)");
    expect(css, "the hairline token changed value — it no longer tracks To-do's").toContain("--qc-rim-title: #ece5d9;");
    expect(todoCss, "To-do's hairline moved — reuse means these track each other").toContain("#ece5d9");
    expect(head, "the ref's 2px ink rule must not arrive here").not.toContain("2px solid var(--ink)");
  });

  /* ⚠️ SUPERSEDED, recorded rather than deleted: the count USED to be a separate mono figure
     beside the title ("Your queries" · 21), reusing To-do's head grammar wholesale. It is now
     part of the sentence — "21 queries" / "Showing 12 of 21 queries" — so there is no trailing
     figure left to style and the mono rule is gone with the span. What survives from To-do is
     the Playfair 17/700 and the warm hairline, asserted above; only the count moved. */
  /**
   * ⚠️ THE COLUMN'S HEADING IS GONE (Pack B §1a), so this case moved to the FOOT. The head read
   * "20 queries" — the same figure the masthead states directly above it, twice on one screen. A
   * pane does not introduce itself.
   *
   * ⚠️ AND THE FOOT'S COUNT IS NOT THE SAME FACT, which is why it stays. The masthead counts the
   * whole scope; the foot counts what the FILTER left. They diverge the moment anything is
   * narrowed, which is exactly when the second number earns its place.
   */
  it("the count is stated once on the page — at the foot, where it means something else", () => {
    expect(rule(css, ".f12-lhtitle .f12-lhcount"), "the dead count rule is still in the sheet").toBe("");
    expect(queries, "the count span outlived its rule").not.toContain('className="f12-lhcount"');
    expect(queries, "the head must read the shared label helper, not build a string inline")
      .toContain("SHOWING <b>{sortedList.length}</b> OF {queries.length}");
  });
});

describe("the list is de-carded", () => {
  it("it is no longer a .f12-pane in either branch", () => {
    expect(queries, "the list is still carded").not.toContain('className="f12-pane f12-list"');
    expect(queries.match(/className="f12-list"/g)?.length ?? 0).toBe(2);
  });

  /**
   * ⚠️ INVERTED (Pack B §1c), AND THE OLD RULE WAS RIGHT FOR A DIFFERENT PAGE. "De-carded" meant the
   * list stopped being a bordered `.f12-pane` floating on the desk — a card inside a card — and
   * that deletion stands: no border, no radius, no shadow, no float. What it must NOT be is
   * paintless. The column is FURNITURE now: it runs flush from the masthead to the foot on a faint
   * ground, which is what makes it read as a fixed part of the page rather than as content that
   * happens to sit on the left.
   *
   * A ground tint is not a card. The distinction is the whole of §1c.
   */
  /**
   * ⚠️ INVERTED BY FIX PACK 5. "Furniture, never a card" was the flush-wall law; the list is an inset
   * panel now — rim, standard radius, held off three sides. The GROUND is the one clause that
   * survives unchanged, and the flex/min-height chain with it, because neither had anything to do
   * with whether the column was a card.
   */
  it("it is a card — the same ground, now with a rim and a radius", () => {
    const list = rule(css, ".f12-list");
    /* ⚠️ `--paper` → `--panel` (fix pack 6 §2) → `--white` (§4). The receding fill was right while
       the list was furniture; `--panel` made it an object — but `--panel` is `#fffdfb` and so is
       the reading pane beside it, so "an object" was two surfaces one point apart. Pure white with
       its own cast is the distinction that fill was trying and failing to make. */
    expect(list, "the column lost its ground — it goes back to being loose content")
      .toContain("background: var(--white)");
    expect(list, "the card lost its cast").toContain("box-shadow: var(--sh-2)");
    expect(list, "the panel lost its rim").toContain("border: 1px solid var(--line)");
    expect(list, "the panel lost its radius").toContain("border-radius");
    expect(list, "the seam went back onto the panel, so it stops where the panel stops")
      .not.toContain("border-right");
    expect(list).toContain("display: flex");
    expect(list).toContain("min-height: 0");
  });
});

describe("the selected row is a flat fill, and the bookmark is retired", () => {
  /**
   * ⚠️ INVERTED BY FIX PACK 7 §4, AND THIS CASE IS TURNED ROUND RATHER THAN DELETED. It asserted a
   * 3px burgundy bookmark, inset top and bottom, with rounded ends — the marker the selected row
   * needed while its fill was a small tonal step from the column's ground. The fill is `--pink-t`
   * now: a HUE nothing else in the column carries, which needs neither an edge nor a mark to be
   * found. And burgundy means OUTGOING on the StatusDot two columns to the right of it, so the
   * section's rule is that no burgundy appears in the list at all.
   *
   * A deleted case would let the bookmark come back; this one says why it must not.
   */
  it("3px of ink no longer marks it — the fill does", () => {
    const sel = rule(css, ".f12-row.f12-sel");
    /* ⚠️ `--qc-row-sel`, NOT `--pink-t`: with the keyboard ring removed the fill is the list's ONLY
       cursor. It went `--n3` → `--n5` chasing contrast by VALUE, and is now the soft pink — a hue
       separates at a much lighter value than a grey can. Its own token because `--pink-t` is also a
       monogram and the collapsed band, and neither of those moved. */
    expect(sel, "the selected row lost its fill").toContain("background: var(--qc-row-sel)");

    /**
     * ⚠️ THE LITERAL IS RECONCILED AGAINST THE FAMILY IT CLAIMS TO COME FROM, not trusted. The
     * neutral palette repoints `--pink-t` onto the grey scale, and a custom property substitutes at
     * the USE SITE — so `var(--pink-t)` here would resolve back through that block to `--n3`. The
     * value has to be restated, which is exactly the shape that drifts silently, so index.css's
     * `.t-f12` declaration and f12.css's are asserted against EACH OTHER.
     */
    const idx = read("../index.css");
    const family = idx.match(/--pink-t:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase();
    const rowSel = css.match(/--qc-row-sel:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase();
    expect(family, "index.css no longer declares --pink-t").toBeTruthy();
    expect(rowSel, "the neutral palette states no literal for the selected row").toBeTruthy();
    expect(rowSel, `the selected row is ${rowSel}, which is not the soft-pink family's ${family}`).toBe(family);
    /* hover stays neutral — pink is the SELECTED state alone */
    expect(rule(css, ".f12-row:hover"), "hover went pink too").toContain("var(--paper)");
    expect(sel, "a ring came back on top of the fill").toContain("box-shadow: none");
    expect(sel, "the blue came back").not.toContain("--blue-t");
    expect(sel, "the full-height inset edge should be gone").not.toContain("inset 3px 0 0");
    expect(rule(css, ".f12-row.f12-sel::before"), "the bookmark came back").toBe("");
  });
});

/**
 * ⚠️ §2 · A FADE IS THE APP'S WORD FOR UNAVAILABLE, so it cannot also mean "less important". Mark
 * closed, Export and Delete are unconditional — a query can always be closed, exported or deleted —
 * and they sat in `--faint` three buttons along from a Nudge whose fade means exactly that.
 */
describe("§2 · the closing verbs are never faded", () => {
  const bar = (() => {
    const at = queries.indexOf('className="qc-phead"');
    return at < 0 ? "" : queries.slice(at, queries.indexOf("})() : null}", at));
  })();
  const ghost = (() => {
    const at = queries.indexOf('className="qc-verbs-inert"');
    return at < 0 ? "" : queries.slice(at, queries.indexOf("</span>\n            )}", at));
  })();

  it("both bars are there to test", () => {
    expect(bar, "the live control row is missing — every case below would pass vacuously").not.toBe("");
    expect(ghost, "the no-selection shape is missing").not.toBe("");
  });

  /* ⚠️ THE TOKEN IS BOUNDED — `qc-btn-quiet` is a prefix of nothing today, but the sweep that found
     17 prefix-risk locks is why this asserts the whole attribute rather than a substring. */
  it("neither Mark closed nor Export carries the muted class, selected or not", () => {
    for (const [what, src] of [["the live row", bar], ["the no-selection shape", ghost]] as const) {
      const closed = src.slice(src.indexOf("Mark closed") - 700, src.indexOf("Mark closed"));
      expect(closed, `${what}: Mark closed is still muted`).not.toMatch(/["\s`]qc-btn-quiet["\s`]/);
      const pdf = src.slice(src.indexOf("qc-btn-icon"), src.indexOf("qc-btn-icon") + 60);
      expect(pdf, `${what}: Export is still muted`).not.toMatch(/["\s`]qc-btn-quiet["\s`]/);
    }
  });

  it("Delete is ink at rest and keeps its hover", () => {
    const danger = rule(css, ".qc-btn-danger");
    expect(danger, "Delete's rest colour is back").not.toContain("color: var(--faint)");
    expect(rule(css, ".qc-btn-danger:hover"), "Delete lost the terracotta it earns on hover")
      .toContain("var(--qc-acc-late)");
  });

  /* ⚠️ AND THE CLASS SURVIVES FOR ONE STATE — Nudge once used, where quiet is a FACT rather than a
     ranking. Asserted so a later sweep does not delete it as dead. */
  it("the muted class is left with exactly one caller, and it is a state", () => {
    expect(rule(css, ".qc-btn-quiet"), "the muted class lost its declaration").toContain("var(--faint)");
    const callers = (queries.match(/qc-btn-quiet/g) ?? []).length;
    expect(callers, `qc-btn-quiet has ${callers} callers — it should have one, the nudged state`).toBe(1);
    expect(queries, "the surviving caller is not the nudged state").toContain('nudgeAgoDays != null ? " qc-btn-quiet"');
  });
});

/**
 * ⚠️ §4 · THE ROW'S SHAPE — the status mark leads at full size, the initials are gone, and the
 * elapsed figure is a relative date. What is asserted here is the DERIVATION and the wiring; the
 * pixels (30px mark, no wrap, the ring against the pink) are `qcRow.measure.ts`, because a source
 * lock cannot see the size the mark actually renders at.
 */
describe("§4 · the list row", () => {
  const row = (() => {
    const at = queries.indexOf('className={`f12-row${isSelected');
    return at < 0 ? "" : queries.slice(queries.lastIndexOf("const isSelected", at), queries.indexOf('className="f12-lfoot"', at));
  })();

  it("the row is there to test", () => {
    expect(row, "the row's markup is missing — every case below would pass vacuously").not.toBe("");
  });

  it("the mark leads, at full size, and it is the imported component", () => {
    expect(row, "the lead slot is missing").toContain('className="f12-lead"');
    expect(row, "the mark is not the locked component").toContain("<StatusDot status={q.status} overrideSize={30} />");
    /* ⚠️ THE LEAD COMES BEFORE THE NAME IN SOURCE ORDER — a grid could place it anywhere, so this
       is the structural half and the measure reads the rendered x. */
    expect(row.indexOf('className="f12-lead"'), "the mark is not the row's first element")
      .toBeLessThan(row.indexOf('className="f12-mid"'));
  });

  it("no monogram survives, and nothing computes initials for it", () => {
    expect(row, "the row still renders a monogram").not.toMatch(/["\s`]f12-av["\s`]/);
    expect(queries, "the page still imports the initials helper for the row").not.toContain("agentInitials");
  });

  /**
   * ⚠️ §4b · THE FIGURE MEASURES FROM THE LAST OUTBOUND SEND. `lastSendMs` takes the newest of
   * `dateSent` / `partialSentDate` / `fullSentDate`; `createdDate` is read nowhere.
   */
  it("the figure is a relative date from the last send, through the shared formatter", () => {
    expect(row, "the figure is not anchored to the last send").toContain("lastSendMs(q as never)");
    expect(row, "the figure does not use the shared ago-label").toContain("agoLabel(daysBetween(sendMs, nowMs))");
    expect(row, "the exact date left the title").toContain("`Sent ${exact}`");
    /* the caption, and the position wording it qualified, are both gone from the row */
    expect(row, "the elapsed caption is still rendered").not.toContain("f12-d2lab");
    expect(row, "the row still reads the sense label").not.toContain("ELAPSED_LABEL");
  });

  /* ⚠️ AND `agoLabel` IS ONE FUNCTION, in the formatter's own module — the Nudge control says the
     same kind of thing, and two copies of "append ago, except at zero" is how one surface comes to
     read "today" while the other reads "0 days ago". */
  it("the ago-label has one definition and both surfaces read it", () => {
    const elapsed = read("./elapsed.ts");
    expect(elapsed, "the shared ago-label is missing").toContain("export const agoLabel");
    const nudge = read("./nudgeState.ts");
    expect(nudge, "nudgeState keeps a second copy").not.toMatch(/nudgedAgoLabel\s*=\s*\(/);
    expect(nudge, "nudgeState does not share the one label").toContain('export { agoLabel } from "./elapsed"');
  });

  /**
   * ⚠️ "with agent for" LEAVES THE ROW — and this asserts it left the PAGE, because the phrase was
   * `ELAPSED_LABEL["with-agent"]` and the row was its only reader. The table survives in
   * `elapsed.ts` with its own locks; nothing renders it.
   */
  it("no surface states 'with agent for' any more", () => {
    for (const f of ["../components/Queries.tsx", "../components/reading-pane/QueryTimeline.tsx", "./queryAmbient.ts"]) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(src, `${f} still renders the with-agent caption`).not.toContain("ELAPSED_LABEL");
      expect(src, `${f} still states "with agent for"`).not.toContain("with agent for");
    }
  });
});
