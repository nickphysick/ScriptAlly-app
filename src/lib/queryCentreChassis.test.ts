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

/**
 * ══ §1b · REVERSED — THE MASTHEAD IS A CARD LIKE EVERY OTHER PAGE'S ═══════════════════════════
 *
 * This described a full-width band and its page-scoped `--header-inset: 0px`. Both are gone, and
 * the case is TURNED ROUND rather than deleted, because a deleted case says nothing about which way
 * the rule now runs.
 *
 * ⚠️ WHAT THE OPT-OUT ACTUALLY COST. `header = content − 2 × --header-inset` at 120px is reasoned
 * and shell-wide, and nine pages obeyed it; this page's opt-out made it the only one whose header
 * did not line up. The acceptance matrix's `restHdrL` read 327 here against 447 everywhere else,
 * and that ONE divergence aborted the entire run — so two passes were verified by reading past the
 * stop instead of by a clean gate.
 *
 * ⚠️ THE BAND TREATMENT WENT WITH IT, AND IT HAD TO. Its own argument was "a card whose left and
 * right edges touch the container's is just a box with two pointless lines in it" — an argument
 * about SPANNING THE WIDTH, not about this page. Inset by 120px the plate floats in a gutter, which
 * is the condition under which that same comment says a card is right. Keeping the band would have
 * left a borderless, shadowless strip hanging in a gutter.
 */
describe("§1b · the masthead is a card, like every other page's", () => {
  it("⚠️ NO PAGE-SCOPED INSET — this page reads the shell's law like the other nine", () => {
    expect(rule(".qc-wpg"), "the full-width opt-out came back — this page's header would stop lining up with the other nine, and the matrix aborts on it")
      .not.toContain("--header-inset");
    /* ⚠️ COMMENTS STRIPPED FIRST. The reversal note in f12.css names the deleted declaration in
       prose, and the raw file therefore contains the exact string this case forbids — the assertion
       failed on its own explanation. Strip, then match. */
    const css = read("../components/shell/f12.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css, "the opt-out came back under a different selector — the token resolves at its use site, so any ancestor of .wpg-plate will do it")
      .not.toMatch(/--header-inset:\s*0/);
    const shell = read("../components/shell/pageHeader.css");
    expect(shell, "the shell's own inset was changed — that would move all ten pages")
      .toContain("--header-inset: 120px");
  });

  it("⚠️ NO PAGE-SCOPED BAND — the plate keeps its border, radius and shadow", () => {
    expect(rule(".qc-wpg .wsh"), "the band treatment came back — inset in a gutter it is a borderless strip floating in dead space")
      .toBe("");
  });
});

describe("§1c · the list is furniture, and selection inverts", () => {
  /**
   * ⚠️ INVERTED BY FIX PACK 5, WHICH IS THE WHOLE POINT OF THE PACK. This asserted that the column
   * "is not a card": ground plus one seam, no radius, no shadow. It IS a card now — an inset panel
   * with a rim and the standard radius — so the case is turned round rather than deleted. Left
   * standing it would have gone on describing furniture that no longer exists; deleted, nothing
   * would stop the flush wall coming back.
   *
   * The ground is the one thing that survives the inversion unchanged.
   */
  it("the column keeps its ground, and is now a card rather than furniture", () => {
    const r = rule(".f12-list");
    /* ⚠️ `--paper` → `--panel` (fix pack 6 §2) → `--white` (§4). The receding fill was right while
       the list was furniture; `--panel` made it an object. `--panel` is `#fffdfb` and so is the
       reading pane beside it — measured identical — so "an object on a ground" was two surfaces a
       point apart, which reads as a mistake rather than as a distinction. It is a CARD now: pure
       white, its own rim, its own cast, on the ground like every other container on the page. */
    expect(r, "the ground went — the column reads as loose content again").toContain("background: var(--white)");
    expect(r, "the panel lost its radius — it is a card now, not a wall").toContain("border-radius");
    expect(r, "the card lost its cast — a white card on a near-white ground needs one to sit ON it")
      .toContain("box-shadow: var(--sh-2)");
    expect(r, "the seam went back onto the panel, so it stops where the panel stops")
      .not.toContain("border-right");
  });

  /* ⚠️ A TINTED COLUMN CANNOT PAY ITS OWN GUTTER. As `padding-right` the ground stops short of the
     hairline and leaves a stripe of page between them; the column fills to the seam and its
     children carry the inset. */
  it("the column fills to the seam; its children carry the inset", () => {
    expect(rule(".f12-list"), "the column stopped filling to the seam").not.toContain("padding-right");
    expect(rule(".f12-list > *")).toContain("padding-inline: var(--gut)");
  });

  /**
   * ⚠️ THE LADDER INVERTED WITH THE GROUND (§4), AND THE CLAUSE IS UNCHANGED: three distinguishable
   * steps. Selected was WHITE with a ring, which was a real step up from a `--paper` panel and is
   * nothing at all on a white one — the same rule, the same colour, no longer a distinction. It is
   * white ground → `--paper` hover → `--oat` band now, with the burgundy spine it always had.
   *
   * ⚠️ THE MIDDLE RUNG NEVER MOVED, which is what makes this a re-levelling rather than a repaint.
   *
   * ⚠️ AND THE BLUE IS STILL GONE. `--blue-t` (#e7eef6) was a cool selector-blue on a warm
   * parchment page; it was read in exactly two places, both here.
   */
  it("three distinguishable steps: white ground, paper hover, band selected", () => {
    const sel = rule(".f12-row.f12-sel");
    expect(sel, "the selected row is not the band step").toContain("background: var(--oat)");
    expect(sel, "the selected fill has no edge to seat it on").toContain("inset 0 0 0 1px var(--oatline)");
    expect(rule(".f12-row:hover"), "hover and the ground are the same colour").toContain("background: var(--paper)");
    /* ⚠️ AND THE THREE MUST BE THREE. A ladder whose ends match its middle is a ladder with two
       rungs, which is how §4 broke the old one — asserted rather than eyeballed. */
    const ground = declValue(rule(".f12-list"), "background");
    const hover = declValue(rule(".f12-row:hover"), "background");
    const on = declValue(sel, "background");
    expect(new Set([ground, hover, on]).size, `two of the three steps are the same colour: ${ground} / ${hover} / ${on}`).toBe(3);
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
    /* ⚠️ BACKGROUND LEFT THIS LIST AT FIX PACK 4 §2, AND THE REASON IS NOT A CLIMBDOWN. §3 gave the
       plate `--white` to out-rank cards that were `--panel`. §2 then found the page BEHIND those
       cards was white, so the cards were darker than their own ground; whitening the cards and
       warming the pane fixed that, and the plate and the pane's cards now share `--white` by
       design. The plate still out-ranks them by RIM and ELEVATION, which is where the hierarchy
       actually lives — a card lifted off a warm ground reads as higher whatever its fill. Asserted
       below rather than deleted, so "make the plate a different colour again" cannot happen by
       accident. */
    for (const prop of ["border", "box-shadow"]) {
      const a = g(plate, prop), b = g(card, prop);
      expect(a, `the plate declares no ${prop}`).not.toBe("");
      expect(a, `the plate's ${prop} fell back to the cards' — it is the subject, not a peer`)
        .not.toBe(b);
    }
    /* and the ground is now shared ON PURPOSE — with the pane's cards, which is what §2 asks for */
    expect(g(rule(".qp-cols .f12-card"), "background"), "the pane's cards left the plate's ground")
      .toBe(g(plate, "background"));
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
   * ⚠️ THE DATE MOVED WITHIN THE PLATE (§6), AND THE CLAUSE THAT MATTERS IS UNCHANGED: the plate
   * carries a STATIC fact, and neither of the two figures Tracking's bar reads against. What
   * changed is WHICH static fact. It stated the send date beside the agency; it states the date of
   * the most recent DEVELOPMENT beneath the state, because "when did it last move" is what belongs
   * next to "where does it stand", and the send date is Tracking's first rung.
   *
   * ⚠️ AND THE SEND DATE IS THE FALLBACK, WHICH IS TRUE RATHER THAN A SUBSTITUTION: on a query with
   * no developments the send IS the most recent one.
   */
  it("it carries one static date, and neither figure Tracking owns", () => {
    const at = code.indexOf('className="f12-heroband"');
    expect(at, "the plate is missing").toBeGreaterThan(-1);
    const band = code.slice(at, code.indexOf("})()}", at));
    expect(band, "the band slice is empty").toContain("f12-hmeta");
    expect(band, "the plate lost its date").toContain("f12-hsd");
    expect(band, "the date is not the most recent development").toContain("lastStatusChange");
    expect(band, "the send-date fallback went — a query with no developments would show nothing")
      .toContain("|| heroQueriedOn");
    expect(band, "the plate took a figure that moves — Tracking's bar reads those")
      .not.toMatch(/days|waiting|expected/i);
  });

  /* ⚠️ THROUGH `refDate`, which omits an unparseable date rather than printing "Invalid Date" —
     a literal string this app has shown a writer before. Undated imports exist, and §6 added a
     SECOND date to the plate, so both go through it and both omit together. */
  it("an undated query shows no date rather than a broken one", () => {
    expect(code).toContain("const heroQueriedOn = refDate(");
    expect(code, "the development date bypasses the omitting formatter")
      .toContain("refDate((activeQuery as { lastStatusChange?: unknown }).lastStatusChange)");
    expect(code, "the date renders unconditionally").toContain("moved ? <div className=\"f12-hsd\">{moved}</div> : null");
  });

  /**
   * ⚠️ EVERYTHING IS INSIDE THE EDGE. A plate whose avatar or actions sat outside it would be the
   * band bug wearing a frame — the container would enclose some of the identity and not the rest.
   * Browser-confirmed too: fp2 reads all four inside `.f12-heroband` at 1024/1440/1920.
   */
  /**
   * ⚠️ AMENDED BY §1 — THE PLATE HOLDS IDENTITY, AND ONLY IDENTITY. The original clause was
   * "everything is inside the edge", written when the plate held the actions too: a container that
   * enclosed some of the identity and not the rest was the band bug wearing a frame. §1 removes the
   * actions from the plate ALTOGETHER rather than moving them outside its edge, so the clause is
   * satisfied in the other direction — there is nothing left that could sit outside it.
   */
  it("everything the plate still owns sits inside it, and the verbs are not among them", () => {
    const at = code.indexOf('className="f12-heroband"');
    expect(at, "the plate is missing — this test is anchored on nothing").toBeGreaterThan(-1);
    const band = code.slice(at, code.indexOf("})()}", at));
    expect(band, "the band slice is empty").toContain("f12-hn");
    expect(band, "the avatar left the plate").toContain("f12-bigav");
    expect(band, "the status badge left the plate").toContain("statusDisplayLabel(activeQuery)");
    /* ⚠️ AND THE VERBS ARE GONE FROM IT, not merely moved to its edge. A primary still drawn here
       beside one in the control cell would be the same act offered twice on one screen. */
    expect(band, "the primary came back to the plate").not.toContain('className="f12-btn-pri"');
    expect(band, "the kebab came back to the plate").not.toContain("qc-kebab");
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
/**
 * ⚠️ FIX PACK 5 — THE LIST IS AN INSET PANEL, AND THE TWO "FLUSH" BLOCKS THAT STOOD HERE ARE GONE.
 * Fix pack 2 §2 and fix pack 3 §2 asserted the opposite of this: no radius, no inset, ground meeting
 * the masthead rule and the working area's foot. Both were wrong, and both are REPLACED rather than
 * loosened — a lock that merely stopped failing would leave the flush law readable as still true,
 * which is how three packs of partial specs produced a column nobody had described in full.
 */
describe("§ (fp5) · the list is an inset panel", () => {
  it("it is a card: rim, standard radius, and held off three sides by one token", () => {
    const r = rule(".f12-list");
    expect(r, "the list rule is missing").not.toBe("");
    expect(declValue(r, "border-radius"), "the panel lost its radius").toBe("var(--r-lg)");
    /* ⚠️ THE RIM COMES FROM THE CARD'S BASE RULE. `.qp-cols .f12-card` declares only the ground
       (fix pack 4 §2), so reading the border there returns "" and the comparison would pass against
       nothing — the empty-slice failure this repo has an audit about. */
    expect(declValue(r, "border"), "the panel's rim is not the cards' rim")
      .toBe(declValue(rule(".f12-card"), "border"));
    /**
     * ⚠️ REPOINTED BY FIX PACK 6 §1 — THE VERTICAL INSET SURVIVES, THE HORIZONTAL ONE IS DELETED.
     *
     * This asserted a four-value margin inset on three sides, which put the panel's left edge one
     * step INSIDE the shared content gutter: measured 109px against the pane's 95, the shell's
     * gutter plus this page's own 14px plus a rim, on one side only. Query Centre's content is now
     * at the content gutter like every other page's.
     *
     * ⚠️ WHAT FIX PACK 5 WAS ACTUALLY FOR IS UNTOUCHED, which is why this is a repoint and not a
     * reversal: the panel is still an OBJECT held off the masthead rule and the working area's
     * foot. Only the sideways step goes, and it was never part of that argument.
     */
    /**
     * ⚠️ REPOINTED AGAIN BY §1 — THE INSETS ARE THE GRID'S, AND THE PANEL STATES NONE OF ITS OWN.
     *
     * Every clause above survives: left edge on the shared content gutter, a real channel on the
     * right, and the panel held off the top and foot as an OBJECT rather than a wall. What changed
     * is who pays for them. The control cells are now cells of the same grid, and a MARGIN on the
     * panel cannot reach them — the count would have sat 14px out of true with the list it counts.
     * So the row owns all four: `column-gap` is the channel, `padding-top`/`padding-bottom` are the
     * vertical insets, and the left stays zero by being the grid's own first track.
     *
     * ⚠️ AND THE PANEL MUST DECLARE NO MARGIN AT ALL. One left behind would ADD to the grid's gaps
     * rather than replace them — the silent-doubling shape this repo has recorded on two pages.
     */
    expect(declValue(r, "margin"), "the panel took a margin back — it would add to the grid's gaps, not replace them").toBe("");
    expect(declValue(r, "width"), "the panel restated --listw; the grid's first track already is it").toBe("");
    const body = rule(".f12-body");
    expect(body, "the split row is missing").not.toBe("");
    expect(declValue(body, "grid-template-columns"), "the first track is not the list token").toBe("var(--listw) minmax(0, 1fr)");
    /* ⚠️ THE CHANNEL AND THE FOOT ARE STATED VALUES SINCE THE ALIGNMENT AMENDMENT, and they had to
       stop being `--f12-panel-inset`: that token is the PANEL's own inset, and the amendment gives
       the work area two numbers of its own — a 16px column gap shared with the card gap inside the
       pane, and a 32px foot. Borrowing a third meaning from the panel token is how one value
       silently governs three unrelated distances. */
    expect(declValue(body, "column-gap"), "the channel is not the amendment's 16").toBe("16px");
    expect(declValue(body, "row-gap"), "the band-to-column gap is not the amendment's 12").toBe("12px");
    expect(declValue(body, "padding-bottom"), "the work area's foot is not the page token").toBe("var(--qc-gut)");
  });

  /**
   * ⚠️ THE SEAM IS NO LONGER THE PANEL'S OWN BORDER. It was `border-right`, which was correct while
   * the panel was the whole column; inset top and bottom, that border would stop where the panel
   * stops and the divider would have two gaps in it. It is drawn full height by `.f12-body::after`,
   * positioned one pixel back so it is collinear with the panel's right rim — one line, no doubling.
   */
  it("⚠️ INVERTED BY §2 — THE SEAM IS DELETED, and the panel's rim is the division", () => {
    /* It was drawn for a flush list on a receding ground: two independently scrolling regions with
       nothing between them but air. The list is a white panel with its own rim, radius and an inset
       on all four sides now, so the seam is a SECOND division doing the job the rim already does. */
    const seam = rule(".f12-body::after");
    expect(seam, "the seam came back — with a rimmed white panel it is a second division doing the same job").toBe("");
    expect(rule(".f12-list"), "the panel took a right border of its own — its rim is already the division")
      .not.toContain("border-right");
  });

  /* ⚠️ THE SCROLLER IS EXEMPT FROM THE PANEL'S INSET so a row's hover and selection fills reach the
     panel's edges. Padding it as well would inset the fills and leave the selected row floating. */
  it("the rows span the panel while the head and foot take its inset", () => {
    expect(cssCode, "the rows lost their exemption — the selected fill no longer reaches the edges")
      .toMatch(/\.f12-list > \.f12-rows\s*\{[^}]*padding-inline:\s*0/);
    expect(cssCode, "the head and foot lost the panel's inset")
      .toMatch(/\.f12-list > \*\s*\{[^}]*padding-inline:\s*var\(--gut\)/);
  });

  /**
   * ⚠️ SEPARATORS ARE INSET, WHICH A BORDER CANNOT BE. `border-bottom` spans the whole row, so it
   * ran full-bleed into the seam and the panel's rim. The pseudo-element takes the row's own
   * padding as its inset — and two rows draw none: the last, and the SELECTED one, where a line
   * cutting across the lifted white row is the specific fault this section removed.
   */
  it("separators are inset, and the last and selected rows have none", () => {
    expect(declValue(rule(".f12-row"), "border-bottom"), "the row went back to a full-bleed border")
      .toBe("");
    const sep = rule(".f12-row::after");
    expect(sep, "the separator is missing").not.toBe("");
    const pad = declValue(rule(".f12-row"), "padding").split(/\s+/)[1];
    expect(declValue(sep, "left"), "the separator's inset drifted from the row's padding").toBe(pad);
    expect(declValue(sep, "right"), "the separator's inset drifted from the row's padding").toBe(pad);
    expect(cssCode, "the last and selected rows draw separators again")
      .toMatch(/\.f12-row:last-child::after,\s*\.f12-row\.f12-sel::after\s*\{[^}]*content:\s*none/);
  });

  /* the selected row still lifts to white with its spine — unchanged by this section, asserted
     because the separator work is one line away from it */
  it("the selected row keeps its band fill and its spine", () => {
    /* §4 re-levelled the fill (see the ladder case above); the SPINE is what this case is really
       for, and it is untouched — 3px of burgundy on the left edge, at every step of the pack. */
    expect(declValue(rule(".f12-row.f12-sel"), "background"), "the selected row lost its fill")
      .toBe("var(--oat)");
    expect(rule(".f12-row.f12-sel::before"), "the burgundy spine went").toContain("var(--burg)");
    expect(rule(".f12-row.f12-sel::before"), "the spine left the left edge").toContain("left: 0");
    expect(rule(".f12-row.f12-sel::before"), "the spine is not 3px").toContain("width: 3px");
  });
});

describe("§4 (fp3) · the columns start on the same line", () => {
  /**
   * ⚠️ ASSERTED AS THE SAME TOKEN, NOT THE SAME NUMBER. Two rules matching by literal agree until
   * the day one is edited; two rules reading one token cannot disagree at all. This repo has paid
   * for the difference twice already — the list's search field and its pills were hand-matched at
   * 36px and then both moved to 34. So the case tests the MECHANISM, and the browser carries the
   * resulting equality (fp3 in `tests/e2e/qcReconcile.measure.ts`, at 1024/1440/1920).
   */
  /**
   * ⚠️ SUPERSEDED BY FIX PACK 5, AND REPOINTED RATHER THAN DELETED. The two heads shared
   * `--f12-headgap` so that they started on one line while BOTH columns began at the masthead rule.
   * The list is an inset panel now: what holds it off the rule is the panel's own inset, and keeping
   * the 20px on top of that would have put the search field 34px down inside a panel beginning at
   * 14px. What survives is the intent — the head sits at the panel's top and takes no column gap of
   * its own — and the plate is untouched, so it keeps reading the token.
   */
  it("the head sits at the panel's top, and the plate still reads the shared gap", () => {
    const head = rule(".f12-lhead");
    const plate = rule(".f12-heroband");
    expect(head, "the list head's rule is missing").not.toBe("");
    expect(declValue(head, "margin").split(/\s+/)[0], "the head took the column gap back on top of the panel's inset")
      .not.toBe("var(--f12-headgap)");
    /* ⚠️ INVERTED BY THE ALIGNMENT AMENDMENT. The plate's `--f12-headgap` top and its 20px sides
       were what put the pane's CONTENT on verticals the pane's COLUMN did not have — six verticals
       across the work area instead of four, with content 20px off the right wall while the list sat
       hard against the left. It is flush with its column now, and the gap above it is the grid row's
       to pay. Turned round rather than deleted, so the inset cannot come back quietly. */
    expect(declValue(plate, "margin"), "the plate took its inset back — the pane's content would leave its column's verticals")
      .toBe("0");
  });

  /* ⚠️ AND ONLY THE PANE IS PADDED SIDEWAYS. The list's inset lives on `.f12-list > *` so the
     ground and the seam can run edge to edge; giving the list container horizontal padding is the
     one edit that would undo §2 while looking like it belongs to §4. */
  it("the list's head carries no horizontal margin of its own", () => {
    const m = declValue(rule(".f12-lhead"), "margin");
    const parts = m.split(/\s+/);
    expect(parts.length, `the list head's margin is not a three-value shorthand: ${m}`).toBe(3);
    expect(parts[1], "the list head took a side margin — its inset belongs to .f12-list > *")
      .toBe("0");
  });
});

/**
 * ⚠️ FIX PACK 4 §1 — THE LIST HEAD. Two faults were reported; only one was real, and saying which is
 * the point of this block.
 *
 * The head was NOT flush against the masthead rule: `.f12-lhead` has carried `var(--f12-headgap)`
 * since fix pack 3 §4, and the field's top measures 203 against the rule's 183 — the plate's own
 * 203. Adding padding would have pushed the two columns apart to fix something that was not broken.
 *
 * What WAS broken: the field's ground and the column's ground were the same token, `--paper`,
 * measured identical at `rgb(250,246,240)`. The field had no edge and no ground of its own, so the
 * head read as empty tinted space running up to the rule. That is what "nothing holding it off"
 * was — not a missing gap, a missing control.
 */
describe("§1 (fp4) · the list head's field is a control on a tinted surface", () => {
  it("the field takes a ground of its own, distinct from the column it sits on", () => {
    const field = rule(".f12-lhead .f12-lsearch");
    const list = rule(".f12-list");
    expect(field, "the in-head field override is missing").not.toBe("");
    expect(list, "the list rule is missing").not.toBe("");
    const fg = declValue(field, "background"), lg = declValue(list, "background");
    expect(fg, "the field declares no ground of its own").not.toBe("");
    expect(fg, "the field went back to the column's tint — it reads as empty space, not a control")
      .not.toBe(lg);
    /* ⚠️ INVERTED BY §4, AND THE CLAUSE IS THE SAME ONE. Fix pack 4's finding was that the field
       had no ground of its OWN against a `--paper` panel — it was `--paper` on `--paper`, with no
       edge, so the head read as empty tinted space. §4 turns the panel white, so `--white` here
       reproduces that exact fault pointing the other way. The distinct-from-the-column assertion
       above is the durable one; the specific value follows the panel. */
    expect(fg, "the field's ground stopped being the tint that distinguishes it from a white panel").toBe("var(--paper)");
    /* ⚠️ AND THE RIM IS WHAT ACTUALLY MAKES IT A FIELD. It was `1px solid transparent` — a reserved
       border box with no colour in it — so the fill was doing all the work and the control vanished
       the moment the surface behind it changed. Twice. */
    expect(declValue(rule(".f12-lsearch"), "border"), "the field's rim went back to transparent")
      .toBe("1px solid var(--hairline)");
  });

  /* ⚠️ AND THE GAP THE COLUMNS SHARE IS UNTOUCHED. §1's first clause was already satisfied; this
     asserts nobody "fixes" it a second time by adding padding on top, which would break fix pack
     3 §4's single line. */
  /* ⚠️ REPOINTED BY FIX PACK 5 for the same reason as the case above: the panel's inset is what
     holds the head off the rule now, so the head's own offset is a small internal one. What is
     still worth holding is that it does not grow a SECOND source of top space. */
  it("the head takes one modest offset inside the panel, and no padding on top", () => {
    const head = rule(".f12-lhead");
    expect(declValue(head, "margin"), "the head declares no margin").not.toBe("");
    expect(head, "padding was added above the head — two sources for one gap")
      .not.toContain("padding");
  });

  /* the base rule keeps the tint for surfaces where the field sits on white */
  it("the change is scoped to the head, not made global", () => {
    expect(declValue(rule(".f12-lsearch"), "background"), "the base field ground was changed app-wide")
      .toBe("var(--paper)");
  });
});

/**
 * ⚠️ FIX PACK 4 §2 — THE CARDS ARE THE BRIGHTEST THING, AND THE GROUND BEHIND THEM IS NOT.
 * The instruction named only the cards. Measured, the page behind them was `rgb(255,255,255)`
 * (`.ws-window`, showing through three transparent ancestors) with the cards at `rgb(255,253,251)`
 * ON it — so the cards were DARKER than their own ground, and whitening them alone would have made
 * the two identical and removed the edge entirely. The ref has `.card` at `#fff` on a ground of
 * `#fffdfa`: the card brighter than what it sits on. That direction is the device, so the ground
 * moved with the cards.
 */
describe("§2 (fp4) · the reading pane's cards", () => {
  it("the cards are white and the pane they sit on is not", () => {
    const card = declValue(rule(".qp-cols .f12-card"), "background");
    const pane = declValue(rule(".qp-pane"), "background");
    expect(card, "the pane's cards declare no ground").toBe("var(--white)");
    expect(pane, "the pane went back to showing the shell's white window through it")
      .toBe("var(--panel)");
    expect(card, "the cards and their ground collapsed to one value — there is no edge left")
      .not.toBe(pane);
  });

  /* ⚠️ AND THE BASE RULE IS UNTOUCHED. `.f12-card` is also the journey sheet's column chrome, where
     the ground behind it is the sheet's rather than this pane's. Whitening it globally would have
     reached a surface this section never looked at. */
  it("the change is scoped to the pane, not made global", () => {
    expect(declValue(rule(".f12-card"), "background"), "the card ground was changed app-wide")
      .toBe("var(--panel)");
  });

  /* the rim and the header band are explicitly unchanged by this section */
  it("the rim and the sage cap are untouched", () => {
    expect(declValue(rule(".f12-card"), "border"), "the cards' rim changed")
      .toBe("1px solid var(--line)");
    expect(rule(".f12-card .f12-chh"), "the sage cap changed").toContain("var(--sage-band)");
  });
});

/**
 * ⚠️ FIX PACK 4 §4 — NOTES SIT ON PARCHMENT. Each note carried an inline `#ffffff`, which was merely
 * subtle while the card was `--panel` and became invisible the moment §2 made the card white. A
 * note flat on its card is not a note; it is a paragraph.
 */
describe("§4 (fp4) · the notes", () => {
  it("a note's ground differs from the card it sits on", () => {
    const note = declValue(rule(".qp-note"), "background");
    const card = declValue(rule(".qp-cols .f12-card"), "background");
    expect(note, "the note declares no ground").not.toBe("");
    expect(note, "the note's ground collapsed into the card's — it reads as a paragraph")
      .not.toBe(card);
    expect(note, "the note lost its hairline").toBeTruthy();
    expect(rule(".qp-note"), "the note lost its rim").toContain("border: 1px solid var(--line)");
  });

  /**
   * ⚠️ AND THE COLOURS LIVE IN THE STYLESHEET NOW. They were inline, where no rule can reach them —
   * which is why the note stayed white through a change to the surface underneath it. An inline
   * background is not a style, it is a fact nobody can argue with.
   */
  it("the note's ground is not written inline, where no rule can reach it", () => {
    const at = code.indexOf('className="qp-note"');
    expect(at, "the note markup is missing").toBeGreaterThan(-1);
    const tag = code.slice(at, code.indexOf(">", at));
    expect(tag, "the note's ground went back inline").not.toContain("background:");
    expect(tag, "the note's rim went back inline").not.toContain("border:");
  });

  /* ⚠️ THE COMPOSER STAYS PINNED. `flexShrink: 0` is what stops a long note list squeezing it out
     of the card — the one thing in this section that is about behaviour rather than colour. */
  it("the composer cannot be squeezed out by a long list", () => {
    const at = code.indexOf('className="qp-note"');
    const after = code.slice(at);
    expect(after, "the composer lost its pin").toContain("flexShrink: 0");
  });
});

/**
 * ⚠️ FIX PACK 4 §5 — "WHAT YOU SENT" STATES WHAT WAS SENT, AND OVERRIDES THE REF, which still draws
 * the manuscript block. Title, genre and word count are all stated in the sidebar's manuscript card,
 * and none of the three is a fact about THIS query — they describe the book, which does not change
 * because you sent it somewhere.
 */
describe("§5 (fp4) · what you sent", () => {
  const card = (() => {
    const at = code.indexOf('title="What you sent"');
    return at < 0 ? "" : code.slice(at, code.indexOf("</PaneCard>", at));
  })();

  it("the card is there to test", () => {
    expect(card, "the What you sent card is missing — every case below would pass vacuously")
      .not.toBe("");
  });

  /**
   * ⚠️ REVERSED BY §2, ON FIX PACK 4's OWN TERMS. That pack deleted the manuscript block because
   * title, genre and word count are facts about the BOOK, not about this send — which is true, and
   * is still true. What changed is that the ⋯ carried a permanently-disabled `Manuscript` verb, and
   * §2's rule for everything that is not one of the four verbs is "moves to where its subject is
   * named". The subject was named NOWHERE on this pane, so the verb had nowhere to move to.
   *
   * ⚠️ ONE ROW COMES BACK, NOT THE BLOCK. Title as a link, genre and word count as a single mono
   * line — asserted here, because "the block is back" and "the name is back" are different things
   * and only the second is wanted.
   */
  it("the manuscript's name heads the card — as ONE row, and as the way to the record", () => {
    expect(card, "the manuscript's name is not stated").toContain("activeMs.title");
    expect(card, "the name is not the link to the manuscript").toContain("qp-msname");
    expect(card, "the meta line is missing").toContain("qp-msmeta");
    /* ⚠️ AND EACH HALF OMITS ITSELF. A book with no genre must not print a bare interpunct, and one
       with no word count must not print "0 words" — zero words is a claim; absence is not. */
    expect(card, "the meta prints regardless of whether it has anything to say")
      .toContain("(!!activeMs.genre || !!activeMs.wordCount) &&");
    expect(card, "the word count is printed unconditionally").toContain("activeMs.wordCount ?");
    /* the three-line block fix pack 4 removed does NOT come back with the row */
    expect(card, "the old genre/words block returned").not.toContain("genreWords");
  });

  it("the heading names the materials rather than the query", () => {
    expect(card, "the heading did not change").toContain("Materials sent");
    expect(card, "the old heading survived").not.toContain("Sent with this query");
  });

  /**
   * ⚠️ INVERTED BY FIX PACK 6 §4 — THE SEND LINE IS GONE, AND THE CARD OPENS ON ITS MATERIALS.
   *
   * This asserted the opposite: that "how and when it was sent" opened the card. Both facts are
   * already stated by Tracking's `Query sent` event, sitting beside it on the same screen, so the
   * card opened by repeating its neighbour and delayed the thing it exists to show. Turned round
   * rather than deleted, so nothing quietly reinstates the line.
   *
   * ⚠️ THE PICKER WAS NOT DROPPED WITH IT, and that distinction is the point of the second case.
   * It was the ONLY control for a query's send method anywhere in the app; removing it to tidy a
   * line would have been a feature loss wearing a layout change. It moved to the pane's ⋯ menu.
   */
  it("⚠️ NO SEND METHOD AND NO SEND DATE — the card opens on Materials sent", () => {
    expect(card, "the send line came back — Tracking already states both facts").not.toContain("{sentLine}");
    expect(code, "the sentLine block survives as dead render code").not.toContain("const sentLine =");
    /* the FIRST thing under the header is the materials heading — asserted by position, because a
       `toContain` would pass with the line reinstated above it */
    const heading = card.indexOf("Materials sent");
    expect(heading, "the materials heading is gone from the card").toBeGreaterThan(-1);
    /* ⚠️ "Sent by" ONLY — `sentDate` legitimately survives ABOVE this point, in the card's header
       meta, which §4 leaves at its three items. Forbidding the identifier outright failed on the
       meta and would have read as the line surviving; what the section removed is the LINE. */
    expect(card.slice(0, heading), "the send-method line still renders above the materials heading")
      .not.toContain("Sent by");
  });

  /**
   * ⚠️ REPOINTED AGAIN BY §2 — THIRD HOME, AND THE LAST ONE. The clause is unchanged and is the
   * reason this case exists: the picker is the ONLY control for a query's send method anywhere in
   * the app, so every rearrangement has to prove it is still reachable. It hung off the "Sent by …"
   * line; fix pack 6 §4 moved it to the ⋯; §2 deletes the ⋯ and puts it on the WORD IT CHANGES.
   *
   * ⚠️ AND THAT IS WHERE THE THREE-VERB GRAMMAR ALWAYS SAID IT BELONGED: something happened →
   * Record response; a detail is wrong → edit it where it is written. The first two homes were
   * places a control could live rather than places the fact was stated, which is why it kept moving.
   */
  it("⚠️ THE SEND-METHOD PICKER IS EDITED IN PLACE — third home, still reachable", () => {
    for (const kept of ["methodPickOpen", "pickSendMethod", "methodPickMenuStyle"]) {
      expect(code, `${kept} went with the move — the app would have no way to change a send method`).toContain(kept);
    }
    /* the trigger is the word itself: the timeline hands its own element up as the anchor, so
       `useFixedMenu` positions the menu against what was clicked rather than a stale ref. */
    expect(code, "the picker lost its in-place trigger").toContain("onEditSendMethod={(anchor)");
    expect(code, "the anchor is not fed to the menu's positioner")
      .toContain("methodPickTrigRef as React.MutableRefObject<HTMLElement | null>).current = anchor");
    expect(code, "the picker's menu was not re-mounted after the ⋯ was deleted")
      .toContain('ariaLabel="Change send method"');
    /* and the retired home is genuinely gone, not merely bypassed */
    expect(code, "the ⋯ came back").not.toContain('ariaLabel="Actions for this query"');
    const tl = read("../components/reading-pane/QueryTimeline.tsx");
    expect(tl, "the timeline does not draw the send method as an editable word").toContain("qp-inplace");
    expect(tl, "the promoted sub is still drawn a second time as a caption")
      .toContain("!(row.subEditable && onEditSendMethod)");
  });

  /* ⚠️ AND THE ROWS AND THEIR MARKS ARE UNTOUCHED — the section removed a block, not the card. */
  it("the material rows and their sent marks are unchanged", () => {
    for (const t of ["docRow(", "sampleRow", "sentPip("]) {
      expect(card, `${t} went with the manuscript block`).toContain(t);
    }
  });

  /**
   * ⚠️ THE REASSIGN MACHINERY WENT WITH THE BLOCK IT LIVED IN, rather than being left behind as
   * state nothing reads. The capability survives in the Edit Query drawer's own manuscript
   * selector — what was lost is the shortcut, which is worth knowing and was not worth keeping as
   * dead code.
   */
  it("the block's now-unreachable machinery was swept, not orphaned", () => {
    for (const t of ["msPickOpen", "msPickTrigRef", "msPickMenuStyle", "pickManuscript"]) {
      expect(code, `${t} is still declared with nothing rendering it`).not.toContain(t);
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

  /* ⚠️ REPOINTED (§1): the verbs moved OUT of the pane into its control cell, so they now render
     earlier in source than the selected-query branch and an index comparison against that branch
     would fail while the invariant held. The invariant — a verb cannot outlive its subject — is
     asserted where it now lives: the cell's own guard. */
  it("the verbs cannot outlive their subject", () => {
    const cell = code.indexOf('className="qc-phead"');
    expect(cell, "the pane's control cell is missing").toBeGreaterThan(-1);
    expect(code.indexOf("{activeQuery && activeAgent ? (() => {", cell), "the cell lost its selection guard").toBeGreaterThan(cell);
    /* §2 deleted the menu the earlier version of this case anchored on */
    expect(code, "the ⋯ came back").not.toContain("qc-kebab");
  });
});

describe("§2 · the reading pane", () => {
  it("two columns at 1.15fr 0.85fr, with the right one stacked", () => {
    /* ⚠️ THE PROPORTION IS GONE (alignment amendment), AND THE ARGUMENT SURVIVES IT. `1.15fr .85fr`
       existed because Tracking has a STORY and the other two are inventories — equal thirds
       flattered the short cards and starved the long one. That is still why the right column is the
       narrow one. What changed is that a PROPORTION made it a different width at every viewport
       (measured 245 against the list's 334), so the work area's two narrow columns never matched.
       It is `--listw` now — the same token the list reads. */
    expect(code, "the pane's right column stopped reading the list's own token")
      .toContain('gridTemplateColumns: "minmax(0, 1fr) var(--listw)"');
    expect(code, "the pane's cards took an inset again — they would leave the column's verticals")
      .toContain("gap: 16, padding: 0,");
    /* ⚠️ AND THE GAP ABOVE THEM IS THE PANE COLUMN'S `gap`, not this grid's padding. The two look
       identical and are not: as padding, the sibling gap measured ZERO with a padding standing in
       for it, so "one value for every gap" held by coincidence and the next element added to the
       column would have arrived flush against its neighbour. */
    expect(code, "the pane stopped paying the card gap itself").toContain('flexDirection: "column", gap: 16 }}>');
    /* §8 made the class conditional — `qp-stack--open` while Notes is expanded — so the anchor is
       the template literal rather than the fixed string. */
    expect(code, "the right column is not a stack").toContain('className={`qp-stack${notesOpen ? " qp-stack--open" : ""}`}');
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
