/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · Pack B §1 — THE CHASSIS.
 *
 * One title over the whole split, a masthead that spans the working width, a list column that is
 * furniture rather than content, and a hero that is a band rather than a fourth framed card.
 *
 * ⚠️ MOST OF §1 WAS ALREADY BUILT, and the cases for those parts are locks on work Pack A landed —
 * kept here so the audit's finding is recorded in one place rather than inferred from silence.
 * What this pack actually changed is §1a, §1b, §1c and §1h.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string): string => {
  const i = css.indexOf("\n" + sel + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

describe("§1a · the page states its count once", () => {
  it("the list column has no heading of its own", () => {
    expect(code, "the column's heading came back — the masthead already states the count")
      .not.toContain('className="f12-lhtitle"');
    expect(code, "the retired helper is being called again").not.toContain("listHeadLabel(");
  });

  /* ⚠️ THE FOOT'S COUNT IS A DIFFERENT FACT AND STAYS. The masthead counts the whole scope; the
     foot counts what the FILTER left. They diverge the moment anything is narrowed — which is
     exactly when a second number earns its place. */
  it("the masthead counts the scope; the foot counts the filtered view", () => {
    expect(code).toContain("description={queriesMastheadCounts(mastheadScopedQueries)}");
    expect(code).toContain("SHOWING <b>{sortedList.length}</b> OF {queries.length}");
  });
});

describe("§1b · the masthead is a band", () => {
  /**
   * ⚠️ ONE TOKEN, PAGE-SCOPED — not an argument with the shell's law. `header = content − 2 ×
   * --header-inset` at 120px is reasoned and shell-wide (pageHeader.css) and all ten pages read it.
   * This page opts out; the other nine are untouched, which is what the scope proves.
   */
  it("the inset is zeroed on this page and nowhere else", () => {
    expect(rule(".qc-wpg"), "the page-scoped opt-out is missing").toContain("--header-inset: 0px");
    const shell = read("../components/shell/pageHeader.css");
    expect(shell, "the shell's own inset was changed — that would move all ten pages")
      .toContain("--header-inset: 120px");
  });

  /* A card whose left and right edges touch its container's is a box with two pointless lines. */
  it("it is one rule beneath, not four edges", () => {
    const r = rule(".qc-wpg .wsh");
    expect(r, "the page-scoped band rule is missing").not.toBe("");
    expect(r).toContain("border-bottom: 1px solid var(--ws-edge)");
    expect(r, "the card's radius survived").toContain("border-radius: 0");
    expect(r, "the card's float survived").toContain("box-shadow: none");
  });
});

describe("§1c · the list is furniture, and selection inverts", () => {
  it("the column has a ground and one seam, and is not a card", () => {
    const r = rule(".f12-list");
    expect(r, "the ground went — the column reads as loose content again").toContain("background: var(--paper)");
    expect(r).toContain("border-right: 1px solid var(--hairline)");
    for (const p of ["border-radius", "box-shadow"]) {
      expect(r, `the column took ${p} — furniture is not a card`).not.toContain(p);
    }
  });

  /* ⚠️ A TINTED COLUMN CANNOT PAY ITS OWN GUTTER. As `padding-right` the ground stops short of the
     hairline and leaves a stripe of page between them; the column fills to the seam and its
     children carry the inset. */
  it("the column fills to the seam; its children carry the inset", () => {
    expect(rule(".f12-list"), "the column stopped filling to the seam").not.toContain("padding-right");
    expect(rule(".f12-list > *")).toContain("padding-inline: var(--gut)");
  });

  /**
   * ⚠️ THREE STEPS FROM THREE EXISTING TOKENS. Ground `--paper`, hover `--panel`, selected `--white`
   * with a ring — hover and selected differ by the ring and the lift, as the ref has it.
   *
   * ⚠️ AND THE BLUE IS GONE. `--blue-t` (#e7eef6) was a cool selector-blue on a warm parchment page.
   * It was read in exactly two places, both here, so nothing else decided it.
   */
  it("the selected row lifts to white with a ring; nothing on this page is blue", () => {
    const sel = rule(".f12-row.f12-sel");
    expect(sel, "the selected row stopped lifting").toContain("background: var(--white)");
    expect(sel, "the lift has no edge to seat it on").toContain("inset 0 0 0 1px var(--hairline)");
    expect(rule(".f12-row:hover"), "hover and the ground are the same colour").toContain("background: var(--panel)");
    expect(cssCode, "the selector-blue came back").not.toContain("--blue-t");
  });

  /* the settle animation lands a newly-arrived row INTO selection, so its end frame and the
     selected fill are one decision, not two that have to be kept in step */
  it("the settle lands on the selected fill", () => {
    /* ⚠️ COMMENT-STRIPPED. The keyframe's own note explains the change by NAMING the old token, so a
       raw slice finds the string it is asserting is gone. Ninth time across these packs. */
    const at = cssCode.indexOf("@keyframes f12-settle");
    expect(at, "the settle keyframe is missing").toBeGreaterThan(-1);
    const f = cssCode.slice(at, cssCode.indexOf("}", cssCode.indexOf("to ", at)) + 1);
    expect(f, "the settle still lands on the old blue").not.toContain("--blue-t");
    expect(f).toContain("background: var(--white)");
  });
});

describe("§1h · the hero is a band", () => {
  it("it is a row closed by one rule, not a bordered card", () => {
    expect(code, "the hero card came back").not.toContain('className="f12-hero"');
    const r = rule(".f12-heroband");
    expect(r, "the band rule is missing").not.toBe("");
    expect(r, "the band lost its closing rule").toContain("box-shadow: inset 0 -1px 0 var(--hairline)");
    for (const p of ["border:", "border-radius"]) {
      expect(r, `the band took ${p} — it is a row, not a fourth card`).not.toContain(p);
    }
  });

  /**
   * ⚠️ THE BAND TAKES THE STATIC FACT AND LEAVES THE LIVE PAIR TO TRACKING. The queried date is part
   * of identity — when this went out. "Days waiting" and "expected by" move, and they are the two
   * numbers Tracking's progress bar reads against, so they belong where the bar is. That split is
   * what stops either surface restating the other.
   */
  it("it carries the queried date, and neither figure Tracking owns", () => {
    const at = code.indexOf('className="f12-heroband"');
    expect(at, "the band is missing").toBeGreaterThan(-1);
    const band = code.slice(at, code.indexOf("</div>", code.indexOf("f12-hmeta", at)));
    expect(band, "the queried date is not on the band").toContain("Queried {heroQueriedOn}");
    expect(band, "the band took a figure that moves — Tracking's bar reads those")
      .not.toMatch(/days|waiting|expected/i);
  });

  /* ⚠️ THROUGH `refDate`, which omits an unparseable date rather than printing "Invalid Date" —
     a literal string this app has shown a writer before. Undated imports exist. */
  it("an undated query shows no date rather than a broken one", () => {
    expect(code).toContain("const heroQueriedOn = refDate(");
    expect(code, "the date renders unconditionally").toContain("{heroQueriedOn && <span>Queried");
  });

  it("the primary and the kebab sit at its right", () => {
    const at = code.indexOf('className="f12-heroband"');
    const band = code.slice(at, code.indexOf('ariaLabel="Actions for this query"', at) + 60);
    expect(band, "the primary left the band").toContain('className="f12-btn-pri"');
    expect(band, "the kebab left the band").toContain("qc-kebab");
  });
});

describe("§1d/e/g · already landed, and still true", () => {
  it("the list's controls are in its own head, and none can go dead", () => {
    const head = code.indexOf('className="f12-lhead"');
    expect(head, "the list head is missing").toBeGreaterThan(-1);
    const slice = code.slice(head, code.indexOf('className="f12-rows"', head));
    expect(slice, "a control in the head can be disabled").not.toContain("disabled");
    expect(code, "the page-wide toolbar row came back").not.toContain("toolbar={");
  });

  it("the auto-select survives, so 'nothing selected' needs an empty filtered list", () => {
    expect(code).toContain("setSelectedQueryId(sortedList[0].id)");
    expect(code, "the empty-filter state went").toContain("qc-nomatch");
  });

  it("the kebab lives inside the selected-query branch", () => {
    const branch = code.indexOf("activeQuery && activeAgent && activeMs ?");
    const kebab = code.indexOf('ariaLabel="Actions for this query"');
    expect(kebab).toBeGreaterThan(branch);
    expect(code.indexOf("qc-nomatch"), "the empty state can reach the kebab").toBeGreaterThan(kebab);
  });
});

describe("§2 · the reading pane", () => {
  it("two columns at 1.15fr 0.85fr, with the right one stacked", () => {
    expect(code, "the pane went back to three equal columns")
      .toContain('gridTemplateColumns: "1.15fr 0.85fr"');
    expect(code, "the right column is not a stack").toContain('className="qp-stack"');
    /* ⚠️ THE EQUALISATION MOVED WITH THE GRID. Three siblings got it free from `align-items:
       stretch`; a stack has to FILL its column and divide that height between its members. */
    expect(rule(".qp-stack"), "the stack does not fill").toContain("min-height: 0");
    expect(rule(".qp-stack > .f12-card"), "the stacked cards do not share the height")
      .toContain("flex: 1 1 0");
  });

  /* ⚠️ ONE SHELL, THREE BODIES. Three hand-rolled `.f12-card` copies is why the headers could
     drift — one already had a pink band where the other two had sage. The bodies are NOT
     parameterised: a timeline, an inventory and a thread are genuinely different, and a component
     describing all three would be a worse version of JSX. */
  it("all three cards render through one shell", () => {
    expect((code.match(/<PaneCard/g) ?? []).length, "a card was left hand-rolled").toBe(3);
    expect(code, "a card still builds its own band").not.toMatch(/className="f12-card"[^>]*>\s*<div className="f12-chh">/);
  });

  it("each header states its own meta, from a selector the body already reads", () => {
    /* Tracking's is the status — the same derivation the hero band's badge reads, so the two
       cannot disagree about what state this query is in. */
    expect(code).toContain("meta={statusDisplayLabel(activeQuery)}");
    /* What you sent counts the list it renders, not the query a second time. */
    expect(code).toContain("baseMaterialsFor(activeQuery, activeAgent).length");
    /* ⚠️ NOTES COUNTS *THIS QUERY'S* ENTRIES, and it did not — `journalEntries` is every note in
       the account while the body filters by `queryId`, so the band stated one number and the list
       showed another. Fixed in fix pack §4; asserted on the filter, because the count alone was
       what looked right. Omits at zero: "0 notes" is a sentence about nothing. */
    expect(code).toContain("journalEntries.filter((e) => e.queryId === activeQuery.id).length");
  });

  /**
   * ⚠️ THE PROGRESS BAR IS NOT REBUILT, AND THAT IS A DECISION. §2 asks for one reading against the
   * agent's stated window; `QueryTimeline` already draws it, with three states this pack's ref does
   * not have — within-window, overdue with a hatch zone past the expected marker, and grace against
   * a nudge horizon. Building the ref's single-fill bar beside it would have been a second, poorer
   * answer to the same question on the same card.
   */
  it("the timeline and its bar stay with QueryTimeline", () => {
    expect(code, "Tracking stopped rendering the shared timeline").toContain("<QueryTimeline");
    expect(code, "a second progress bar was built beside the existing one").not.toContain("qp-bar");
  });

  /* ⚠️ ONE EVENT PER REAL ACTIVITY, never a fixed three. The ref draws sent / waiting / nudge
     because it is a mockup with three; the page maps whatever the activity feed holds. */
  it("the timeline is fed from the activity feed", () => {
    expect(code).toContain("events={trackingEvents}");
    const at = code.indexOf("setTrackingEvents(events)");
    expect(at, "the events are not derived from activities").toBeGreaterThan(-1);
  });

  /* Each cell omits itself when its figure is underivable — a closed query has neither, and a dash
     against a caption states nothing while taking a line to do it. */
  it("the two stats read the shared ambient derivation and omit when it has nothing", () => {
    expect(code).toContain("queryAmbientStatus(activeQuery, ta0.ballHolder");
    expect(code, "the stats render unconditionally").toContain("if (!cells.length) return null;");
  });
});
