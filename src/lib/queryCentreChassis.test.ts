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
/**
 * ⚠️ STRIP COMMENTS BEFORE READING A DECLARATION. `rule()` slices the RAW stylesheet, so a rule that
 * opens with an explanatory comment puts `*​/` immediately before its first declaration — and an
 * anchor of `(?:^|;|{)` then fails to match a property that is plainly there, reporting "declares no
 * background" about a rule whose background is on the next line. The inverse is worse: prose inside
 * the comment that happens to read `box-shadow: …` would be extracted as the rule's own value.
 */
const declValue = (r: string, prop: string): string => {
  const body = r.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = new RegExp("(?:^|;|\\{)\\s*" + prop + "\\s*:\\s*([^;}]+)").exec(body);
  return m ? m[1].trim() : "";
};
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

/**
 * ⚠️ FIX PACK 2 §1 — THE HEADER IS A CONTAINED PLATE AGAIN, REVERSING PACK B §1h. That instruction
 * dissolved it into an open row closed by a hairline, on the reasoning that a card inside a card is
 * one frame too many. It is not: the header is the query's IDENTITY, and identity needs an edge —
 * without one it read as a caption drifting above the columns rather than as the thing they belong
 * to. The lock that asserted the band shape is REPLACED rather than deleted, because a deleted lock
 * would let the band come back silently the next time someone reasons their way to it again.
 *
 * ⚠️ AND IT WEARS `.f12-card`'s TOKENS, NOT ITS OWN NUMBERS. If the plate restated `12px` and
 * `1px solid #e6dccd`, it would agree with the reading-pane cards today and drift the first time a
 * theme moved either. The test therefore compares the two rules' VALUES rather than asserting a
 * literal, so the plate cannot be right by coincidence.
 */
describe("§1 (fp2) · the hero is a contained plate", () => {
  const val = declValue;

  /**
   * ⚠️ SUPERSEDED BY FIX PACK 3 §3, AND REWRITTEN RATHER THAN DELETED. This case used to assert
   * that the plate wore a reading-pane card's EXACT treatment — same radius, rim, ground and
   * shadow. That was right for the problem it solved (the header had dissolved into a caption) and
   * wrong for the page: sitting above two sage-capped cards, an identical fourth surface read as
   * the weakest thing on screen rather than as its subject.
   *
   * ⚠️ SO THE LAW INVERTS: the plate must now be DISTINCT from the cards and must out-rank them.
   * The old assertion is kept in negative form — if the plate ever matches a card again, this fails
   * — because "make it match the cards" is exactly the edit a future reader would make from the
   * old lock's wording, and deleting the case would let it happen silently.
   */
  it("it is brighter, firmer and higher than a reading-pane card — never identical to one", () => {
    const plate = rule(".f12-heroband");
    const card = rule(".f12-card");
    expect(plate, "the plate rule is missing").not.toBe("");
    expect(card, "the card rule is missing").not.toBe("");
    /* ⚠️ first-match slicing: prove this is the BASE rule and not the short-viewport override,
       which declares padding alone and would pass every check below vacuously. */
    expect(plate, "rule() found the short-viewport override, not the base rule").toContain("background");

    const g = declValue;
    for (const prop of ["background", "border", "box-shadow"]) {
      const a = g(plate, prop), b = g(card, prop);
      expect(a, `the plate declares no ${prop}`).not.toBe("");
      expect(a, `the plate's ${prop} fell back to the cards' — it is the subject, not a peer`)
        .not.toBe(b);
    }
    /* the radius is the ONE thing that must still agree: it belongs to the page's shape language,
       not to the hierarchy this section is about */
    expect(g(plate, "border-radius"), "the plate's radius drifted from the cards'")
      .toBe(g(card, "border-radius"));
  });

  /**
   * ⚠️ THE THREE STEPS ARE NAMED, because "distinct" alone would pass on any difference at all —
   * including a plate that is DIMMER than the cards, which is the fault this section exists to fix.
   * Ground brighter (`--white` over the cards' `--panel`), rim firmer (`--oatline` over `--line`),
   * elevation higher (`--sh-2` over `--sh-1`). All four are existing tokens; none is a literal.
   */
  it("it reads the brighter ground, the firmer rim and the higher step of the shadow scale", () => {
    const plate = rule(".f12-heroband");
    expect(plate, "the plate's ground is no longer the brightest on the page").toContain("var(--white)");
    expect(plate, "the plate's rim fell back to the cards' hairline").toContain("var(--oatline)");
    expect(plate, "the plate lost its lift").toContain("var(--sh-2)");
    expect(plate, "the plate dropped to the cards' elevation").not.toContain("var(--sh-1)");
  });

  /**
   * ⚠️ NO SAGE CAP HERE, EVER. A sage band would make the plate a fourth card — a peer of the
   * things it contains — which is the whole reason elevation was chosen over colour. The cards'
   * caps are `.f12-chh`; this asserts the plate never grows the band those are drawn with.
   */
  it("it is never given a sage cap", () => {
    const plate = rule(".f12-heroband");
    for (const t of ["--sage-band", "--sage-edge", "f12-chh"]) {
      expect(plate, `the plate took ${t} — elevation was chosen over colour precisely to avoid this`)
        .not.toContain(t);
    }
    expect(cssCode, "a sage cap was attached to the plate from outside its own rule")
      .not.toMatch(/\.f12-heroband[^{,]*(::(before|after))?\s*\{[^}]*sage-band/);
  });

  /**
   * ⚠️ THE HEIGHT CLAUSE IS CARRIED BY MEASUREMENT, NOT BY THIS FILE. "The plate does not shrink
   * when the status pill is absent" is a fact about layout, and this suite is `environment: 'node'`
   * — no jsdom, no box model. `tests/e2e/qcReconcile.measure.ts` ("fp2") hides the pill and re-reads
   * the plate: 65/65 at 1024 and 76/76 at 1440 and 1920, so the avatar sets the row and the pill
   * never did. What this file CAN hold is the cause: a centred flex row, so a shorter child cannot
   * pull the height down with it.
   */
  it("it is a centred row, so its height comes from the avatar rather than the pill", () => {
    const plate = rule(".f12-heroband");
    expect(plate, "the plate stopped being a flex row").toContain("display: flex");
    expect(plate, "the plate stopped centring its children").toContain("align-items: center");
  });

  /**
   * ⚠️ THE STATIC FACT STAYS, THE LIVE PAIR STAYS OUT. Unchanged by this reversal: the queried date
   * is identity — when this went out — while "days waiting" and "expected by" move, and they are the
   * two numbers Tracking's bar reads against. The plate gaining an edge is no reason to let it
   * restate them.
   */
  it("it carries the queried date, and neither figure Tracking owns", () => {
    const at = code.indexOf('className="f12-heroband"');
    expect(at, "the plate is missing").toBeGreaterThan(-1);
    const band = code.slice(at, code.indexOf("</div>", code.indexOf("f12-hmeta", at)));
    expect(band, "the queried date is not on the plate").toContain("Queried {heroQueriedOn}");
    expect(band, "the plate took a figure that moves — Tracking's bar reads those")
      .not.toMatch(/days|waiting|expected/i);
  });

  /* ⚠️ THROUGH `refDate`, which omits an unparseable date rather than printing "Invalid Date" —
     a literal string this app has shown a writer before. Undated imports exist. */
  it("an undated query shows no date rather than a broken one", () => {
    expect(code).toContain("const heroQueriedOn = refDate(");
    expect(code, "the date renders unconditionally").toContain("{heroQueriedOn && <span>Queried");
  });

  /**
   * ⚠️ EVERYTHING IS INSIDE THE EDGE. A plate whose avatar or actions sat outside it would be the
   * band bug wearing a frame — the container would enclose some of the identity and not the rest.
   * Browser-confirmed too: fp2 reads all four inside `.f12-heroband` at 1024/1440/1920.
   */
  it("the avatar, the primary and the kebab all sit inside it", () => {
    const at = code.indexOf('className="f12-heroband"');
    const band = code.slice(at, code.indexOf('ariaLabel="Actions for this query"', at) + 60);
    expect(band, "the avatar left the plate").toContain("f12-bigav");
    expect(band, "the primary left the plate").toContain('className="f12-btn-pri"');
    expect(band, "the kebab left the plate").toContain("qc-kebab");
  });
});

/**
 * ⚠️ FIX PACK 2 §2 — THE LIST RUNS FLUSH, AND THE SEAM IS THE ONLY DIVISION. Two of the three
 * clauses were already true when this pack arrived (Pack B §1c gave the list its ground and seam
 * with no radius, and §1b spanned the masthead across the body), so this is mostly a lock over
 * ground already held — recorded as such rather than rebuilt. The one thing genuinely still wrong
 * was the CHANNEL: `.f12-body` carried `gap: var(--gut)`, leaving 12px of page showing to the RIGHT
 * of the seam, so the division was a line plus a stripe and the list read as a widget resting on
 * the page. Removing it costs no breathing room, because the inset lives on the children.
 */
describe("§2 (fp2) · the list is flush and the seam is the only division", () => {
  it("the list declares no radius and no horizontal inset", () => {
    const r = rule(".f12-list");
    expect(r, "the list rule is missing").not.toBe("");
    for (const p of ["border-radius", "margin-left", "margin-right", "margin-inline"]) {
      expect(r, `the list took ${p} — it is one half of a split, not a card on a page`)
        .not.toContain(p);
    }
    expect(r, "the seam went with it").toContain("border-right: 1px solid var(--hairline)");
  });

  it("the columns sit against each other, with no channel between them", () => {
    const r = rule(".f12-body");
    expect(r, "the body rule is missing").not.toBe("");
    expect(r, "the channel came back — the seam stops being the only division")
      .not.toMatch(/(?:^|;|\{)\s*gap\s*:/);
  });

  /* ⚠️ THE INSET MOVED TO THE CHILDREN, and that is what lets the ground and the seam run edge to
     edge while nothing lands against the line. Delete this and the rows touch the seam. */
  it("the inset the list gave up is carried by its children", () => {
    expect(cssCode, "the children lost their inset").toMatch(
      /\.f12-list > \*\s*\{[^}]*padding-inline:\s*var\(--gut\)/
    );
  });
});

/**
 * ⚠️ FIX PACK 3 §2 — FLUSH MEANS ALL FOUR EDGES. Fix pack 2 removed the 12px channel to the RIGHT
 * of the seam and reported the left edge and the radius as already correct, which they were. That
 * accounted for three edges and left the fourth: the list's ground began 18px (resting) or 9px
 * (working) BELOW the masthead hairline, because the scroll row carried `--content-top-gap`. A
 * container's inset pushes its ground down and leaves a stripe of page above it, which is what made
 * the split read as a panel placed under the masthead rather than as the working area beginning.
 *
 * ⚠️ THE AIR IS NOT DELETED, IT MOVES TO THE CHILDREN. The list's head and the pane's header keep
 * their own top spacing inside their columns, so nothing lands against the hairline. Only the
 * element paying for it changes.
 */
describe("§2 (fp3) · the list's ground meets the masthead rule", () => {
  it("neither state leaves a gap above the split", () => {
    for (const sel of [".qc-wpg:not(.wpg--working)", ".qc-wpg.wpg--working"]) {
      const r = rule(sel);
      expect(r, `the ${sel} rhythm rule is missing`).not.toBe("");
      const m = /--content-top-gap:\s*([^;}]+)/.exec(r);
      expect(m, `${sel} stopped naming --content-top-gap`).not.toBeNull();
      expect(m![1].trim(), `${sel} put a gap back above the list`).toMatch(/^0(px)?$/);
    }
  });

  /**
   * ⚠️ BOTH STATES, NAMED EXPLICITLY, AT 0-2-0. `:root` resolves `--content-top-gap` from
   * `--content-top-gap-rest` at :root, so overriding the `-rest`/`-work` pair lower down changes
   * nothing; and setting `--content-top-gap` on `.qc-wpg` alone (0-1-0) would TIE with
   * `.wpg--working` on the same element and be decided by bundle order. This case keeps the shape
   * that avoids both, which is easy to lose while "simplifying" two rules into one.
   */
  it("it does not collapse the two states into one bare .qc-wpg rule", () => {
    expect(cssCode, "the two states were merged into a rule that ties with .wpg--working")
      .not.toMatch(/\n\.qc-wpg\s*\{[^}]*--content-top-gap/);
  });

  /* ⚠️ AND THE CONTAINER ITSELF STAYS BARE — no radius, no margin, no horizontal padding. The rows
     carry their own inset through `.f12-list > *`; putting it back on the container is what would
     re-inset the ground. */
  it("the list container declares no radius, margin or horizontal padding", () => {
    const r = rule(".f12-list");
    expect(r, "the list rule is missing").not.toBe("");
    for (const p of ["border-radius", "margin", "padding-inline", "padding-left", "padding-right"]) {
      expect(r, `the list container took ${p} — it is the working area, not a panel on it`)
        .not.toContain(p);
    }
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
