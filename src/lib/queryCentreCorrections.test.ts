/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · fix pack 1 — the walkthrough corrections (ref design-refs/101-rest-corrections.html).
 *
 * ⚠️ SEVERAL OF THE SIX WERE ALREADY FIXED BY PACK B, and the cases for those are locks on work that
 * landed rather than on work this pack did — kept so the verification is recorded in one place
 * instead of inferred from a silent suite.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const rule = (sel: string): string => {
  const i = css.indexOf("\n" + sel + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

/**
 * EVERY block whose selector list mentions `sel`, joined.
 *
 * ⚠️ `rule()` READS THE FIRST MATCH, AND A GROUPED SELECTOR MAKES THAT AMBIGUOUS — the trap CLAUDE.md
 * records twice, and §3's own shared rule created a third instance of it. `.f12-hero .f12-bigav,\n
 * .f12-heroband .f12-bigav { … }` means a first-match slice for the band finds the SHARED block and
 * never reaches the size-only one, so an assertion about scale reads the wrong rule and fails while
 * describing something true.
 *
 * The repo offers two fixes and prefers folding the shared property into each selector's own rule —
 * but here the SHARING is the point: one declaration list is what stops the disc drifting between
 * the two containers again. So the other fix applies: the helper joins every block.
 */
const rules = (sel: string): string => {
  /* Split on block ends and keep every block whose SELECTOR half mentions `sel`. Plainer than a
     regex, and it cannot be defeated by a selector list, a newline between selectors, or the
     escaping of a dotted class name. */
  const out: string[] = [];
  for (const chunk of css.split("}")) {
    const brace = chunk.lastIndexOf("{");
    if (brace < 0) continue;
    const selector = chunk.slice(0, brace);
    if (!selector.includes(sel)) continue;
    /* skip a comment that merely names the selector — a rule about code is asserted against code */
    if (selector.replace(/\/\*[\s\S]*?\*\//g, "").includes(sel)) {
      out.push(selector.replace(/\/\*[\s\S]*?\*\//g, "").trim() + " {" + chunk.slice(brace + 1) + "}");
    }
  }
  return out.join("\n");
};

describe("§1 · the list finishes becoming furniture", () => {
  /**
   * ⚠️ THE FADE HAD ALREADY STOPPED RENDERING, AND ITS MACHINERY HAD NOT. `listFade` was recomputed
   * on every scroll, every resize and every ResizeObserver burst — rAF-throttled, with a timeout
   * fallback, an observer on two elements and a loop guard — and read by nothing at all.
   *
   * ⚠️ AND IT MUST NOT COME BACK. A fade at the foot claims there is more below it; directly beneath
   * sits a foot stating "Showing 24 of 24". The two contradict each other on one screen.
   */
  it("no fade, and none of the machinery that drove it", () => {
    for (const dead of ["listFade", "recomputeListFades", "scheduleListFades"]) {
      expect(code, `${dead} survives — a mechanism driving no pixels`).not.toContain(dead);
    }
    const rows = rule(".f12-rows");
    expect(rows, "the rows container is missing").not.toBe("");
    for (const p of ["mask-image", "-webkit-mask", "linear-gradient"]) {
      expect(rows, `the fade came back as ${p}`).not.toContain(p);
    }
  });

  /* It runs flush from head to foot: the seam is the only drawn line between the two columns. */
  /**
   * ⚠️ INVERTED BY FIX PACK 5. This required the container to carry no radius and no border but the
   * seam — the flush-wall law. The list is an INSET PANEL now: a rim on all four sides, the standard
   * card radius, and the seam moved off it onto `.f12-body::after` so that it can run the full
   * height the panel no longer does. Turned round rather than deleted, so the wall cannot return.
   */
  it("the container is a card: rim and radius, and the seam no longer rides on it", () => {
    const list = rule(".f12-list");
    expect(list, "the panel lost its radius — the flush wall is back").toContain("border-radius");
    expect(list, "the panel lost its rim").toContain("border: 1px solid var(--line)");
    expect(list, "the seam went back onto the panel, so it stops where the panel stops")
      .not.toContain("border-right");
  });
});

describe("§2 · rows on one grid", () => {
  /**
   * ⚠️ THE DATES WERE RAGGED BECAUSE THE COLUMN SIZED TO ITS CONTENT. As a flex row `.f12-end` was
   * `flex: none`, so a row reading "30 Jun 2024" pushed its date left of one reading "13 Aug" —
   * browser-measured at two x positions, 600 and 606, in the same list. After: a single 578.
   */
  it("three tracks, the last one fixed", () => {
    const r = rule(".f12-row");
    expect(r, "the row rule is missing").not.toBe("");
    expect(r, "the row went back to flex — the date column would size to its content")
      .toContain("display: grid");
    expect(r).toContain("grid-template-columns: 32px minmax(0, 1fr) var(--f12-datew)");
    expect(css, "the date track's width is not declared").toContain("--f12-datew: 56px");
  });

  /* ⚠️ AN `auto` TRACK COLLAPSES ON AN EM DASH, which puts a dateless row's column somewhere else
     again — the same fault wearing a different hat. Fixed means fixed for both. */
  it("a dateless row keeps the column rather than collapsing it", () => {
    expect(code, "the em dash fallback went").toContain('formatListRowDate(q.dateSent) ?? "—"');
    expect(rule(".f12-row .f12-d2"), "the date hugs instead of filling its track")
      .toContain("width: 100%");
    expect(rule(".f12-row .f12-d2")).toContain("text-align: right");
  });

  /* One row is one height, always — so neither the name nor the agency may wrap. */
  it("name and agency truncate, never wrap", () => {
    for (const sel of [".f12-row .f12-nm", ".f12-row .f12-ag"]) {
      const r = rule(sel);
      expect(r, `${sel} is missing`).not.toBe("");
      expect(r, `${sel} can wrap — the row would change height`).toContain("white-space: nowrap");
      expect(r, `${sel} truncates without an ellipsis`).toContain("text-overflow: ellipsis");
    }
    expect(rule(".f12-row"), "the row's height stopped being fixed").toContain("height: 56px");
  });

  it("hover is a wash; selected takes the band, with a burgundy spine", () => {
    expect(rule(".f12-row:hover"), "hover collapsed into the panel's ground").toContain("background: var(--paper)");
    /* §4: the panel is white, so the selected row is the BAND step rather than a lift to white —
       three rungs again, the other way up. The spine below is unchanged. */
    expect(rule(".f12-row.f12-sel")).toContain("background: var(--oat)");
    expect(rule(".f12-row.f12-sel::before"), "the spine went back to ink").toContain("background: var(--burg)");
  });
});

describe("§3 · the hero keeps its initials", () => {
  /**
   * ⚠️ A REGRESSION FROM PACK B §1h, AND ITS SHAPE IS THE LESSON. The avatar's whole skin — radius,
   * fill, ink, centring, serif — was scoped to `.f12-hero`; renaming the container to
   * `.f12-heroband` brought across only width, height and font-size, so the disc degraded to two
   * bare letters. Nothing errored: the element rendered, its text was right, and only the treatment
   * that tied it to the clicked row was gone.
   *
   * ⚠️ ONE DECLARATION LIST FOR BOTH SCALES is the fix, not a copy. A second treatment beside the
   * first is how the two drift apart the next time the disc is edited — which is exactly how this
   * happened.
   */
  it("the disc is declared once, for both containers", () => {
    const all = rules(".f12-heroband .f12-bigav");
    expect(all, "the band's avatar has no rule at all — it would render bare text").not.toBe("");
    /* the disc reaches the band through a selector list that also names the card */
    expect(all, "the band no longer shares the card's disc").toContain(".f12-hero .f12-bigav");
    expect(all).toContain("border-radius: 50%");
    expect(all).toContain("background: var(--pink-av)");
    expect(all, "the monogram lost its serif").toContain("font-family: var(--f12-serif)");
  });

  /* Only the SIZE is per-container: a band's height is its row, not its portrait. */
  it("the two differ by scale and nothing else", () => {
    expect(rules(".f12-hero .f12-bigav"), "the card's scale went").toContain("width: 76px");
    expect(rules(".f12-heroband .f12-bigav"), "the band's scale went").toContain("width: 46px");
    /* exactly one radius declaration across everything that dresses either avatar */
    const discs = (rules(".f12-bigav").match(/border-radius/g) ?? []).length;
    expect(discs, "the disc is declared more than once — the two can drift apart again").toBe(1);
  });

  /* the initials come from the shared helper the row uses, so the two cannot disagree */
  it("the hero and the row read the same initials", () => {
    expect(code, "the hero stopped using the shared display helper").toContain("agentInitials(");
    expect(code).toContain('className="f12-bigav"');
  });
});

describe("§4 · the right stack fills honestly", () => {
  /**
   * ⚠️ THE BAND COUNTED A DIFFERENT SET FROM THE LIST BENEATH IT. `journalEntries` is every note in
   * the account; the body filters it to `entry.queryId === activeQuery.id`. So the header stated one
   * number and the list showed another — the exact failure a shared header's meta exists to prevent,
   * reintroduced by counting the wrong set one line above the right one.
   */
  it("the meta counts THIS query's notes, the same set the body renders", () => {
    expect(code, "the meta counts every note in the account")
      .toContain("journalEntries.filter((e) => e.queryId === activeQuery.id).length");
    expect(code, "the body stopped filtering to this query")
      .toContain("journalEntries\n                            .filter(entry => entry.queryId === activeQuery.id)");
  });

  /* The list takes the remaining height and scrolls inside it; the composer holds its own. */
  it("the list absorbs the height and the composer keeps its place", () => {
    const body = code.slice(code.indexOf('title="Notes"'), code.indexOf("</PaneCard>", code.indexOf('title="Notes"')));
    expect(body, "the notes body stopped filling its card").toContain("flex: 1, minHeight: 0");
    /* ⚠️ THE SCROLLER, NOT THE FADE. This named `<EdgeFadeScroll` as its proxy for "this is a
       scroller", which was fair while the app had exactly one internal-scroll wrapper and made this
       case fail for a reason it was never about the moment fix pack 3 §1 removed the fade from this
       page. The two are separate concerns now: `PaneScroll` is the layout contract, `EdgeFadeScroll`
       is that contract plus a gradient. What this case cares about is the former. */
    expect(body, "the note list is not a scroller").toContain("<PaneScroll");
    expect(body, "the composer can be squeezed out by a long list").toContain("flexShrink: 0");
  });

  /* ⚠️ AND THE STACK IS WHAT GIVES IT A HEIGHT TO DIVIDE. Pack B's `flex: 1 1 0` on the stacked
     cards is what stops the card growing with its content; without it a twentieth note makes the
     column taller than the row and the page starts scrolling. */
  it("the stacked cards still share a fixed height", () => {
    expect(rule(".qp-stack > .f12-card")).toContain("flex: 1 1 0");
    expect(rule(".qp-stack")).toContain("min-height: 0");
  });
});

describe("§5 · tighten, never scroll", () => {
  /* Measured at 1024x700, 1024x768, 1440x900 and 1920x1080: page `scrollHeight` equals
     `clientHeight` at all four (483, 551, 696, 876), and the reading column's overflow is 0. */
  it("the reading column hides its own overflow — the scrollers are the list and a card body", () => {
    expect(code, "the pane stopped hiding its overflow").toContain('overflow: "hidden"');
  });

  /**
   * ⚠️ THE TOKEN, NOT THE PROPERTY. `.wsh-title` reads `--wsh-title-size`, and the shell derives the
   * plate's height from its own token — so the short-viewport step is set where the shell already
   * looks for it, and copying the ref's absolute would have pinned this page to a number the shared
   * header does not use. The ref drops 22 to 19 — a FACTOR of 0.86, and the factor is the rule.
   *
   * ⚠️ 28 → 33, BECAUSE THE BASE MOVED AND THIS DID NOT. 28 was 0.86 of a 33px resting title; the
   * resting title is 38 now (header-gap-vs-height, preset B), which silently left this page's
   * short-viewport step at a factor of 0.74 — twice as steep as the comment claims, on the one page
   * that also drops its hero band. The derived number is restated whenever the base moves, which is
   * exactly what this case exists to force.
   */
  it("the masthead steps down through the shell's token", () => {
    const m = rules("max-height: 768px");
    expect(m, "the short-viewport block is missing").not.toBe("");
    expect(css, "the masthead's step sets a raw font-size instead of the token")
      .toContain("--wsh-title-size: 33px");
    /* the base it is derived FROM, asserted here so the pair cannot drift apart again unnoticed */
    const shell = read("../components/shell/pageHeader.css");
    expect(shell, "the resting title moved without this page's step moving with it — re-derive at 0.86 of the new base")
      .toContain("--wsh-title-size: 38px");
  });

  it("the hero gives up scale first, and the stats keep their figures", () => {
    expect(css).toContain(".f12-heroband .f12-bigav { width: 40px");
    expect(css, "the stats lost a figure rather than their air").toContain(".qp-statn { font-size: 20px; }");
  });

  /**
   * ⚠️ THE CHIPS ARE THE SACRIFICE, NOT THE NUDGE EVENT — a content decision, taken against the
   * prompt's default and argued rather than preferred.
   *
   * The chips repeat VERBATIM in "What you sent", one column over and on the same screen, so
   * dropping them here costs the writer nothing: the information has not left the page. The nudge
   * event appears NOWHERE else on this card — it is the only statement of when the scheduled
   * follow-up lands — so dropping it would take a fact the writer may need to plan around, and
   * leave no way to recover it without opening something else.
   *
   * ⚠️ ONE OR THE OTHER, NEVER BOTH.
   */
  it("at 700 the chips go and every timeline event stays", () => {
    const at = css.indexOf("@media (max-height: 700px)");
    expect(at, "the 700px block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("}", css.indexOf("{", at) + 1) + 1);
    expect(block, "the chips are not what gives way").toContain(".tl-pills { display: none; }");
    /* nothing in either short-viewport block may drop a timeline row */
    for (const b of ["@media (max-height: 768px)", "@media (max-height: 700px)"]) {
      const i = css.indexOf(b);
      const chunk = css.slice(i, css.indexOf("\n}", i));
      expect(chunk, "an event was dropped — the chips were the sacrifice, not the nudge")
        .not.toContain(".tl-rowbody");
    }
    /* and the pills carry a class, or nothing could target them */
    const tl = read("../components/reading-pane/QueryTimeline.tsx");
    expect(tl, "the pills have no class to drop").toContain('className="tl-pills"');
  });
});

describe("Pack C §3 · the letterhead, the caps and the watermark", () => {
  const sheet = read("../components/queries/QueryJourneySheet.tsx");

  /**
   * ⚠️ THE BAND READS THE APP'S CRUMB RATHER THAN RESTATING IT. The sheet needs a trail because the
   * real one is behind the scrim and unreadable by design — but a second hand-written trail is two
   * answers to "where am I", and they would diverge the first time a page was renamed.
   */
  it("the trail composes the shell's own crumb and appends the act", () => {
    const nav = read("../components/shell/shellV2Nav.ts");
    expect(nav, "the journey crumb is not derived from the shell's").toContain("export function journeyCrumb");
    expect(nav, "it stopped reading the app's crumb").toMatch(/journeyCrumb[\s\S]{0,400}shellCrumbForPath/);
    expect(sheet, "the band does not render the derived trail").toContain("journeyCrumb(");
  });

  /* ⚠️ TEXT, NOT LINKS, and no close control. The sheet is modal: a trail whose segments look
     clickable and are not is worse than plain words, and navigating from one would leave a journey
     by a door with no dirty guard on it. The dock already carries Esc and Cancel — the ref's "Esc ×"
     in the band is the duplicate the old chrome bar was retired for. */
  it("nothing in the band is a control", () => {
    const at = sheet.indexOf('className="qc-crumb"');
    expect(at, "the band is missing").toBeGreaterThan(-1);
    const band = sheet.slice(at, sheet.indexOf("</div>", at));
    for (const ctl of ["<a ", "<button", "onClick"]) {
      expect(band, `the band grew a control (${ctl})`).not.toContain(ctl);
    }
  });

  it("the band carries the register", () => {
    expect(rule(".qc-crumb"), "the create band lost its ground").toContain("background: var(--pink-t)");
    expect(rule(".qc-sheet--record .qc-crumb"), "record's band is not sage").toContain("var(--sageC)");
    expect(rule(".qc-crumbcur"), "the current segment lost its colour").toContain("var(--burg)");
  });

  /* §3b — the open step wears the same gradient every card on the reading pane already has. */
  it("the open step is sage-capped, and no second band sits inside it", () => {
    const cap = rule(".qc-sec.qc-active > .qc-shead");
    expect(cap, "the cap rule is missing").not.toBe("");
    expect(cap).toContain("linear-gradient(180deg, var(--sage-band), var(--sage-band-2))");
    /* the direct-child selector is what stops a nested header taking the cap too */
    expect(cap, "the cap would reach a nested header — that is the striped-box risk ref 96 names")
      .toContain("> .qc-shead");
  });

  /**
   * ⚠️ THE DOCK CROP IS THE POINT, AND IT ONLY SURVIVES IF THE STACKING IS EXACT. The mark sits at
   * `z-index: 0` inside the sheet; the dock draws above it with an OPAQUE ground, so the
   * illustration passes beneath the desk edge. Get either half wrong and the mark floats over the
   * dock or vanishes behind the sheet.
   */
  it("the watermark sits at the sheet's floor and the dock crops it", () => {
    const mark = rule(".qc-sheet::before");
    expect(mark, "the watermark rule is missing").not.toBe("");
    expect(mark).toContain("Sent_queries_final.png");
    expect(mark).toContain("opacity: 0.17");
    expect(mark).toContain("rotate(6deg)");
    expect(mark).toContain("transform-origin: right bottom");
    expect(mark, "the mark left the sheet's floor").toContain("z-index: 0");
    expect(mark, "the mark would swallow clicks").toContain("pointer-events: none");
    const dock = rule(".qc-sheet .qc-dock");
    expect(dock, "the dock stopped drawing above the mark").toContain("z-index: 2");
    expect(dock, "the dock's ground is transparent — the mark would show through it")
      .toContain("background: var(--panel)");
  });

  /* one mark, two registers — hue-rotated rather than a second illustration */
  it("record hue-rotates the same mark", () => {
    expect(rule(".qc-sheet--record::before"), "record grew its own illustration").toContain("hue-rotate");
  });
});

/**
 * ══ FIX PACK 6 §1 · THE PAGE'S CONTENT SITS AT THE SHARED GUTTER ══════════════════════════════
 *
 * Measured before: the list panel's left edge was 109px from the working area against the pane's
 * right edge at 95 — the shell's gutter plus this page's own 14px panel inset plus a rim, on one
 * side only. Query Centre's content was not at the content gutter at all.
 *
 * ⚠️ THE FIX IS THE PANEL'S MARGIN, NOT A GUTTER OVERRIDE — and the override was the obvious move.
 * `.wpg-plate` reads `calc(var(--content-gutter) + var(--header-inset))`, so a page-scoped
 * `--content-gutter` would have dragged the MASTHEAD in with the content. Query Centre's masthead
 * deliberately keeps the shell's 120px inset, like every other page's; making it align with the
 * content here would fix one inconsistency by inventing another, and it would re-open the
 * `restHdrL` cross-page abort that took three passes to clear.
 */
describe("fix pack 6 §1 · the list panel joins the shared gutter", () => {
  it("⚠️ NO HORIZONTAL INSET ON THE PANEL — its edge IS the content gutter", () => {
    /* ⚠️ REPOINTED BY §1 — THE INSETS MOVED FROM THE PANEL TO THE GRID, and the clause this case
       exists for is the one that survives unchanged: the panel's LEFT edge is the shared content
       gutter, so Query Centre's content sits where every other page's does. It used to prove that
       by reading a zero in a four-value margin; the panel states no margin at all now, and the
       zero is structural — it is the grid's own first track, which has no left inset to take.

       ⚠️ WHICH IS A STRONGER PROOF, NOT A WEAKER ONE: a margin can be re-added by anyone, whereas
       there is no declaration here that could put a left inset back without also moving the two
       control cells above, which is exactly the coupling §1 was built to get. */
    const list = rule(".f12-list");
    expect(list, "the panel rule is gone — this case is anchored on nothing").not.toBe("");
    /* ⚠️ EXTRACT AND COMPARE, never a `(?!…)` lookahead — `\s*` backtracks to zero width and the
       lookahead runs against the space, which is banned in this repo. */
    const margin = (/margin:\s*([^;]+);/.exec(list)?.[1] ?? "").trim();
    expect(margin, `the panel took a margin back — it would ADD to the grid's gaps, not replace them: ${margin}`).toBe("");
    /* ⚠️ COMMENT-STRIPPED, FOURTH TIME IN THIS REPO. The row's own note NAMES
       `padding-inline: var(--content-gutter)` — it exists to say why the token is not read here —
       so a raw match found the prose describing the rule instead of the rule. A test about code is
       asserted against code. */
    const body = rule(".f12-body").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body, "the split row is missing").not.toBe("");
    expect(body, "the stripped rule is empty — this case is testing nothing").toContain("display: grid");
    const pad = (/padding-inline:\s*([^;]+);/.exec(body)?.[1] ?? "").trim();
    expect(pad, `the row took a side inset — the scroll row already pays the shared gutter: ${pad}`).toBe("");
    /* and the channel to the pane is still a real one, now as the row's gap */
    expect((/column-gap:\s*([^;]+);/.exec(body)?.[1] ?? "").trim(), "the channel to the pane went").toBe("var(--f12-panel-inset)");
  });

  it("⚠️ THE SHARED GUTTER IS UNTOUCHED, here and everywhere", () => {
    const shell = read("../components/shell/pageHeader.css");
    expect(shell, "the shell's gutter moved — that is every page, not this one").toContain("--content-gutter: 80px");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, ""), "a page-scoped gutter override appeared — it would drag the masthead in with the content")
      .not.toMatch(/--content-gutter\s*:/);
  });

  it("⚠️ AND ONE OTHER PAGE STILL READS THE SHELL'S GUTTER — the scope is proved, not assumed", () => {
    const comps = read("../components/manuscripts/comps.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(comps, "Comparable titles gained a gutter override — this exception was supposed to be Query Centre's alone")
      .not.toMatch(/--content-gutter\s*:/);
  });

  /* ⚠️ INVERTED BY §2 — THE SEAM IS DELETED. It was positioned from the panel's right edge, so it
     was one more thing to keep in step with a margin every time that edge moved, which it did twice
     in this pack alone. The panel's own rim is the division now. */
  it("⚠️ THE SEAM IS GONE — the panel's rim is the only division", () => {
    expect(rule(".f12-body::after"), "the seam came back — with a rimmed white panel it is a second division doing the same job")
      .toBe("");
  });
});

/**
 * ══ FIX PACK 6 §3 · THE AGENT HEADER PLATE IS TALLER ══════════════════════════════════════════
 *
 * ⚠️ THE HEIGHT COMES FROM THE PADDING, AND THAT IS THE WHOLE CONSTRAINT. The plate is a CENTRED
 * flex row whose height is set by the avatar, so growing the avatar or the type would have changed
 * what the plate says in order to change how tall it is. Padding adds room without touching either.
 *
 * ⚠️ AND IT MUST STAY PILL-INDEPENDENT. "The plate does not shrink when the status pill is absent"
 * is a fact about layout that this suite cannot compute — `environment: 'node'`, no jsdom, no box
 * model — and it is carried by `qcReconcile.measure.ts`, which hides the pill and re-reads the
 * plate. What is held HERE is the cause: uniform vertical padding on a centred row, so a shorter
 * child still cannot pull the height down with it. A padding change is uniform by construction,
 * which is exactly why it is the safe lever.
 */
describe("fix pack 6 §3 · the plate is taller, through padding alone", () => {
  const padOf = (r: string) => (/padding:\s*([^;]+);/.exec(r.replace(/\/\*[\s\S]*?\*\//g, ""))?.[1] ?? "").trim().split(/\s+/);

  it("⚠️ THE VERTICAL PADDING GREW — and the horizontal did not", () => {
    const plate = rule(".f12-heroband");
    expect(plate, "the plate rule is missing").not.toBe("");
    const [block, inline] = padOf(plate);
    /* extracted and compared, never a `(?!14px)` lookahead — the backtracking trap this repo bans */
    expect(parseFloat(block), `the plate's vertical padding went back down: ${block}`).toBeGreaterThan(14);
    expect(inline, "the plate's horizontal inset moved — §3 is a height change, and widening it would pull the identity off the edge the pane aligns to").toBe("17px");
  });

  it("⚠️ THE PILL-INDEPENDENCE CAUSE IS INTACT — a centred row, uniform padding", () => {
    const plate = rule(".f12-heroband");
    expect(plate, "the plate stopped centring its children — a shorter child could pull the height down").toContain("align-items: center");
    expect(plate, "the plate stopped being a flex row").toContain("display: flex");
    /* one value for both vertical sides: an asymmetric pair would make the row's centre and the
       plate's centre two different lines, and the avatar would stop setting the height cleanly */
    expect(padOf(plate).length, "the plate's padding is no longer the two-value form — top and bottom could differ").toBe(2);
  });

  it("⚠️ THE SHORT-VIEWPORT STEP TRACKS THE BASE, or it reclaims more than it used to", () => {
    /* ⚠️ READ FROM THE RAW SHEET, ANCHORED ON THE MEDIA QUERY. `rules()` rebuilds each block from a
       split on `}`, which does not survive being nested inside an `@media` — the helper returned the
       block and the padding was not in it, so the case failed while the rule was plainly correct. */
    const short = /@media \(max-height: 768px\)[\s\S]*?\.f12-heroband \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(short, "the short-viewport plate step is missing").not.toBe("");
    const m = /padding:\s*([^;]+);/.exec(short);
    expect(m, "the short-viewport plate step is gone").toBeTruthy();
    const stepBlock = parseFloat(m![1].trim().split(/\s+/)[0]);
    const restBlock = parseFloat(padOf(rule(".f12-heroband"))[0]);
    expect(stepBlock, "the step stopped reclaiming anything").toBeLessThan(restBlock);
    /* it kept its proportion rather than its absolute: left at the old 10px against a taller base it
       would take 12px off a plate that had just gained 8, on the viewport with least room to spare */
    expect(stepBlock / restBlock, `the short-viewport step drifted from its proportion: ${stepBlock}/${restBlock}`)
      .toBeGreaterThan(0.6);
  });
});
