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
  it("the container has no radius and no border but the seam", () => {
    const list = rule(".f12-list");
    expect(list, "the column took a radius — it is furniture, not a card").not.toContain("border-radius");
    expect(list, "the seam went").toContain("border-right: 1px solid var(--hairline)");
    expect(list, "a second edge appeared").not.toMatch(/border-(top|bottom|left):/);
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

  it("hover is a wash; selected lifts to white with a burgundy spine", () => {
    expect(rule(".f12-row:hover")).toContain("background: var(--panel)");
    expect(rule(".f12-row.f12-sel")).toContain("background: var(--white)");
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
    expect(body, "the note list is not a scroller").toContain("<EdgeFadeScroll");
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
   * header does not use. The ref drops 22 to 19 (a factor of 0.86); against the live 33 that is 28.
   */
  it("the masthead steps down through the shell's token", () => {
    const m = rules("max-height: 768px");
    expect(m, "the short-viewport block is missing").not.toBe("");
    expect(css, "the masthead's step sets a raw font-size instead of the token")
      .toContain("--wsh-title-size: 28px");
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
