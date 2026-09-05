/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ONE NAME, ONE RULE — the sweep, not the fix.
 *
 * The panel's top bar rendered as a 7px pill in the progress track's colour because `.qpn-bar` was
 * declared TWICE in one file, 135 lines apart, and the cascade takes the last. Renaming the second
 * fixes that instance; this fails on the next one, which is the only version of the guard worth
 * having. This repo has an audit about the same shape in `workspacePageGrid.css`, where it bit
 * twice — once as a real duplicate and once inside the very commit that was fixing it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = join(process.cwd(), "src/components/queries");
const SHEETS = ["queryPanel.css", "queryCard.css", "queryCentreGrid.css"];

/** ⚠️ COMMENTS FIRST. Every one of these files DISCUSSES the selectors it retired. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("⚠️ no base selector is declared twice in one sheet", () => {
  for (const file of SHEETS) {
    it(`${file}`, () => {
      let src = decls(readFileSync(join(HERE, file), "utf8"));
      /**
       * ⚠️ AT-RULE BLOCKS COME OUT FIRST, and this was a false positive before it was a guard: the
       * sweep flagged `.qcc-grid` and `.qcc--enter` as duplicated when the second declaration of
       * each is inside `@media (max-width: 980px)` and `@media (prefers-reduced-motion)`. Those are
       * VARIANTS — the whole point of a media query is to restate a rule under a condition — and a
       * check that calls them duplicates is one people learn to rebaseline instead of read.
       */
      src = src.replace(/@[a-z-]+[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
      /* base rules only — a `:hover` or a descendant selector is a different rule. */
      const bases = [...src.matchAll(/^\s*(\.[a-zA-Z0-9_-]+)\s*\{/gm)].map((m) => m[1]);
      const seen = new Map<string, number>();
      for (const b of bases) seen.set(b, (seen.get(b) ?? 0) + 1);
      const dupes = [...seen].filter(([, n]) => n > 1).map(([sel, n]) => `${sel} ×${n}`);
      expect(bases.length, `${file} parsed no rules — the sweep is vacuous`).toBeGreaterThan(10);
      expect(dupes, `${file} declares a base selector more than once: ${dupes.join(", ")}`).toEqual([]);
    });
  }
});

describe("⚠️ the panel's chrome is not tinted, and the ladder starts below it", () => {
  const css = decls(readFileSync(join(HERE, "queryPanel.css"), "utf8"));
  const rule = (sel: string) => {
    const m = new RegExp(`(?:^|\\n)\\s*\\${sel}\\s*\\{([^}]*)\\}`).exec(css);
    return m ? m[1] : "";
  };

  it("the top bar states parchment and reads no band token", () => {
    const bar = rule(".qpn-bar");
    expect(bar, ".qpn-bar is missing").not.toBe("");
    expect(bar).toContain("#fdfaf5");
    /* ⚠️ THE BAR MAY NOT READ `--band-a`. That is the seam: the tint is set on the panel root so
       the BAND can paint it, and any other element reading it takes the query's colour. */
    expect(bar, "the top bar reads the ladder token").not.toContain("--band-a");
  });

  it("the ladder paints only SEMANTIC state surfaces — the band, and the Agent tab's swatch", () => {
    /* §4 widened this from [.qpn-band]: the history row's swatch IS the query's band tint by
       design (the brief's "state swatch"), so it is a second legitimate reader. The law is
       unchanged — no CHROME (bar, tabs, buttons) reads a ladder token; the readers are named
       exactly so a third one fails here and states its case. */
    const readers = [...css.matchAll(/^\s*(\.[a-zA-Z0-9_.\s-]+?)\s*\{[^}]*var\(--band-a/gm)].map((m) => m[1].trim());
    expect(readers, `--band-a is read by ${readers.join(", ")}`).toEqual([".qpn-band", ".qat-sw"]);
  });

  it("⚠️ the progress track has its own name, and it is not the bar's", () => {
    /* §5 retired the drawer's own track — QueryTimeline's `.tl-wbar` draws the wait now — so the
       surviving law is the original one: the TOP BAR never wears a track's rules, and the retired
       class does not come back under the bar's name. The 7px assertion followed its subject out. */
    expect(css, "the progress track is back on the top bar's class").not.toMatch(/(?:^|\n)\s*\.qpn-bar\s*\{[^}]*height:\s*7px/);
    expect(css, "the retired track class has returned").not.toMatch(/\.qpn-progbar\s*\{/);
  });
});

/**
 * ⚠️ NOTHING ON `#/queries` OPENS THE LEGACY `EDITING QUERY` SHEET.
 *
 * The panel's materials `Edit` called `openEditQuery`, which slides in `EditQueryDrawer` — the
 * hole-punched surface Phase 4 exists instead of. So the new page quietly handed the reader back to
 * the old one, and it looked like a feature rather than a regression.
 *
 * ⚠️ ASSERTED OVER THE LIVE BRANCH ONLY. `Queries.tsx` still contains the retired record view until
 * Phase 6 deletes it, and that branch has its own `Edit` button — unreachable, since the grid is
 * always the page. Slicing to the live branch is what stops this passing or failing for the wrong
 * reason; the whole-file count is reported so the dead one cannot grow.
 */
describe("⚠️ the legacy edit sheet is unreachable from the live page", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
  const src = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /** The live branch: from the grid's ternary to the `) : (` that opens the retired record view. */
  const liveBranch = (() => {
    const from = src.indexOf("{GRID_IS_THE_PAGE ? (");
    expect(from, "the page's view switch is gone — this slice is unanchored").toBeGreaterThan(-1);
    const to = src.indexOf("\n        ) : (", from);
    expect(to, "the record branch's opener is gone — the slice would run to end of file")
      .toBeGreaterThan(from);
    return src.slice(from, to);
  })();

  it("the live branch calls nothing that opens it", () => {
    expect(liveBranch, "the live page still opens the legacy edit sheet").not.toContain("openEditQuery");
  });

  /**
   * RETARGETED (drawer cut 2, §1) — the law this held was "the panel does not hand the reader to
   * the legacy sheet". The in-place materials toggle it pointed at is withdrawn by decision 1
   * (every timeline edit goes through the fork); the surviving claim is that the drawer's
   * Tracking tab mounts the SHARED timeline with the ⋯ on — the same TimelineRows FocusFlow
   * renders bare (todoSheet.test.ts holds that half).
   */
  it("the drawer's tracking tab is the shared timeline, ⋯ on", () => {
    const mount = (() => {
      const at = liveBranch.indexOf("tracking={(() => {");
      expect(at, "the drawer's tracking mount is missing").toBeGreaterThan(-1);
      const end = liveBranch.indexOf("notesTab=", at);
      expect(end, "the notes tab no longer bounds the tracking slice").toBeGreaterThan(at);
      return liveBranch.slice(at, end);
    })();
    expect(mount).toContain("<QueryTimeline");
    /* §3 — the ⋯ opens the desk at the fork directly; onEntryFork is what makes it render at all */
    expect(mount, "the ⋯ is off — corrections unreachable from the drawer").toContain("onEntryFork={(entry, trigger)");
    expect(mount, "the desk's ring is unwired").toContain("highlightId={correcting?.entry.activityId");
  });

  it("⚠️ and the only surviving caller is inside the branch Phase 6 deletes", () => {
    /* If this count grows, a new live path has appeared and the slice above may not cover it. */
    const total = (src.match(/openEditQuery\(/g) ?? []).length;
    expect(total, `openEditQuery is called ${total} times; expected 1 (the retired record view)`).toBe(1);
  });

  /**
   * RETARGETED (drawer cut 2, §5) — the in-place editors these two cases pinned are WITHDRAWN by
   * decision 1: every timeline edit goes ⋯ → CorrectionFork → edit form → consequence preview.
   * The three verbs survive with new homes — correct is the fork's first branch, "something
   * changed" its second (routing to Record response), delete is the edit form's Remove — and the
   * law worth keeping is the FUNNEL: no editActivity call is reachable from the drawer except
   * through the fork's branch.
   */
  it("every timeline edit funnels through the fork — no direct editActivity survives", () => {
    const calls = [...src.matchAll(/editActivity\(/g)].length;
    /* exactly two: the desk's commit, and its undo closure — both inside CorrectionEdit's onSave */
    expect(calls, `editActivity is called ${calls} times; expected 2 (commit + undo)`).toBe(2);
    const at = src.indexOf("<CorrectionDesk");
    const end = src.indexOf("</CorrectionDesk>");
    const desk = src.slice(at, end);
    expect([...desk.matchAll(/editActivity\(/g)].length, "an editActivity call escaped the desk").toBe(2);
  });

  it("the ⋯ and the dotted method both open the desk at the fork", () => {
    expect(src).toMatch(/onEntryFork=\{\(entry, trigger\)[\s\S]{0,220}step: "fork"/);
    expect(src).toMatch(/onEditSendMethod=\{sentActivity[\s\S]{0,320}step: "fork"/);
    /* the withdrawn shortcuts are GONE, not merely unwired */
    for (const dead of ["cycleSendMethod", "openRungDateEdit", "toggleQueryMaterial", "setPanelMatsEdit"]) {
      expect(src, `${dead} survives — a second editing route beside the fork`).not.toContain(dead);
    }
  });
});

/* ══ drawer cut 2 · §1 — the tabbed body ═══════════════════════════════════════════════════════ */
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryPanel } from "./QueryPanel";
import { cardFacts } from "../../lib/queryCardFacts";
import { QueryStatus } from "../../types";

const draw = (status: QueryStatus, extra: Partial<React.ComponentProps<typeof QueryPanel>> = {}) =>
  renderToStaticMarkup(
    React.createElement(QueryPanel, {
      open: true,
      facts: cardFacts({ id: "q1", status, dateSent: "2026-04-03" } as never, new Date("2026-09-01")),
      status,
      name: "Priya Raman", agency: "Raman Literary", initials: "PR",
      sentLabel: "3 Apr 2026", viaLabel: "Email",
      manuscriptTitle: "Murphy's Day Out",
      manuscriptMeta: "Thriller · 50,000 words",
      versionLabel: "Version 2 · Mar 2026",
      position: { index: 2, total: 26 },
      primaryLabel: "Record response",
      onClose: () => {}, onStep: () => {},
      elapsed: { value: "13", unit: "days", caption: "waiting so far" },
      expectedLabel: "12 Sept",
      tracking: React.createElement("div", { className: "fixture-track" }, "the timeline"),
      noteCount: 1,
      ...extra,
    }),
  );

describe("§1 · the tabbed body", () => {
  const css = readFileSync(join(process.cwd(), "src/components/queries/queryPanel.css"), "utf8");
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("the manuscript title appears exactly once in the drawer — in the header", () => {
    const html = draw(QueryStatus.PARTIAL_REQUESTED);
    const hits = html.split("Murphy&#x27;s Day Out").length - 1;
    expect(hits, `the title renders ${hits} times`).toBe(1);
    /* and it is the header's line, above the tab rail — not a body row */
    expect(html).toMatch(/qpn-ms[\s\S]*?qpn-tabs/);
  });

  it("no MountPanel and no framed section inside the drawer body", () => {
    const src = readFileSync(join(process.cwd(), "src/components/queries/QueryPanel.tsx"), "utf8");
    expect(src).not.toContain("MountPanel");
    const html = draw(QueryStatus.QUERIED);
    for (const cls of ["qpn-frame", "qpn-sband", "qpn-sect"]) {
      expect(html, `${cls} survives in the rendered drawer`).not.toMatch(new RegExp(`["\\s]${cls}["\\s]`));
    }
  });

  it("the timeline renders straight on parchment — the tracking node, unframed", () => {
    const html = draw(QueryStatus.QUERIED);
    expect(html).toContain("fixture-track");
    expect(html).toMatch(/qpn-track/);
  });

  /**
   * ⚠️ THE UNDERLINE AND THE ACCENT ARE ONE VARIABLE, asserted at the stylesheet where the
   * binding lives: `.qpn-tab--on` reads `--stage-accent` and nothing else, and the accent map
   * derives each family's accent from the DEEPEST step of its own hue (decision 3 — out-3, in-3,
   * offer, closed; never a new token). Three stages then agree by construction: the rendered root
   * carries the stage class, the class sets the var, the underline reads the var.
   */
  it("the active tab underline reads --stage-accent, mapped to the deepest step per family", () => {
    expect(decls).toMatch(/\.qpn-tab--on[^{]*\{[^}]*border-bottom-color:\s*var\(--stage-accent/);
    /* §3 moved the map to queryCard.css, folded into each stage class's ONE rule — the card, the
       drawer and the correction desk all wear `qcc--s-*`, so the map has one home and the house
       one-rule-per-selector invariant holds. Same law: accent = the family's deepest step. */
    const cardCss = readFileSync(join(process.cwd(), "src/components/queries/queryCard.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [stage, deep] of [["out-1", "out-3"], ["out-2", "out-3"], ["in-1", "in-3"], ["in-2", "in-3"], ["offer", "offer"], ["closed", "closed"]] as const) {
      expect(cardCss, `qcc--s-${stage} does not derive its accent from ${deep}`)
        .toMatch(new RegExp(`\\.qcc--s-${stage}[^{]*\\{[^}]*--stage-accent:\\s*var\\(--stage-${deep}\\)`));
    }
    for (const stage of ["out-1", "in-2", "closed"]) {
      const html = draw(stage === "out-1" ? QueryStatus.QUERIED : stage === "in-2" ? QueryStatus.FULL_REQUESTED : QueryStatus.REJECTED);
      expect(html, `the root does not carry qcc--s-${stage}`).toContain(`qcc--s-${stage}`);
    }
  });

  it("the notes count pill omits itself at zero", () => {
    expect(draw(QueryStatus.QUERIED, { noteCount: 0 })).not.toMatch(/qpn-tabn/);
    expect(draw(QueryStatus.QUERIED, { noteCount: 3 })).toContain(">3</span>");
  });
});

/* ══ log-sheet run · §1 — form mode ═══════════════════════════════════════════════════════════ */
describe("§1 (log sheet) · form mode replaces the body, not the drawer", () => {
  const drawForm = (over: Partial<React.ComponentProps<typeof QueryPanel>["form"]> = {}) =>
    renderToStaticMarkup(
      React.createElement(QueryPanel, {
        open: true,
        mode: "form",
        form: {
          nth: 3, manuscriptTitle: "Murphy's Day Out",
          ticks: { agent: true, date: false, materials: false },
          sentence: React.createElement("span", null, "the sentence"),
          canSave: true,
          onCancel: () => {}, onSave: () => {}, onSaveAnother: () => {},
          body: React.createElement("div", { className: "fixture-sheet" }, "the sheet"),
          ...over,
        },
        facts: cardFacts({ id: "g", status: QueryStatus.QUERIED, dateSent: "2026-09-01" } as never, new Date("2026-09-05")),
        status: QueryStatus.QUERIED,
        name: "", agency: "", initials: "", sentLabel: "", viaLabel: "",
        position: null, primaryLabel: "", onClose: () => {}, onStep: () => {},
        elapsed: { value: "", unit: "", caption: "" }, expectedLabel: "",
        tracking: null, noteCount: 0,
      }),
    );

  it("the drawer widens to 660 — the class is on, and the class is the width", () => {
    expect(drawForm()).toMatch(/["\s]qpn--wide["\s]/);
    const css = readFileSync(join(process.cwd(), "src/components/queries/queryPanel.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.qpn--wide\s*\{\s*width:\s*660px/);
  });

  it("the top bar carries the sheet's chrome and NONE of the detail actions", () => {
    const html = drawForm();
    expect(html).toContain("Logging new query");
    expect(html).toContain("Your 3rd query for Murphy");
    for (const verb of ["Mark sent", "Nudge", "Mark closed", "Previous query", "Next query"]) {
      expect(html, `${verb} leaked into form mode`).not.toContain(verb);
    }
    /* no band, no identity, no tabs — the body IS the sheet */
    for (const cls of ["qpn-band", "qpn-head", "qpn-tabs", "qpn-ms"]) {
      expect(html, `${cls} renders in form mode`).not.toMatch(new RegExp(`["\\s]${cls}["\\s]`));
    }
    expect(html).toContain("fixture-sheet");
  });

  it("the ticks and the footer are the contract — save gated on the agent", () => {
    const html = drawForm();
    expect(html).toMatch(/Agent[\s\S]*Date[\s\S]*Materials/);
    expect(html).toContain("Save query");
    expect(html).toContain("Save &amp; log another");
    const off = drawForm({ canSave: false });
    expect(off).toMatch(/disabled[^>]*>Save query|Save query<\/button>/);
    expect((off.match(/disabled=""/g) ?? []).length, "the two saves do not gate together").toBeGreaterThanOrEqual(2);
  });
});

describe("§1 (log sheet) · the routes open the right step", () => {
  const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("#/queries/new is consumed into openCreate, agent param and all", () => {
    expect(page).toContain('h.startsWith("#/queries/new")');
    expect(page).toMatch(/get\("agent"\)[\s\S]{0,220}openCreate\(\{ agentId: agentId \|\| null \}\)/);
  });

  it("a seeded agent lands at step 2; a bare open at step 1", () => {
    expect(page).toContain("setCreateStep(seedAgent ? 2 : 1)");
  });

  it("nothing opens the old journey sheet — the mount is gated dead until §4 deletes it", () => {
    const at = page.indexOf("<QueryJourneySheet");
    expect(at).toBeGreaterThan(-1);
    const before = page.slice(Math.max(0, at - 400), at);
    expect(before, "the journey mount is reachable again").toContain("{false && (");
  });
});
