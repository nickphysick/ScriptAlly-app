/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the dossier.
 *
 * ⚠️ THIS FILE IS THE POINT OF THE EXTRACTION. While the dossier lived inline in `AllManuscripts` it
 * was reachable only by clicking a library card, and this repo's specs read source with no jsdom —
 * so nothing executed it. Phase 1 recorded that as a gap; Phase 2 found the gap had already bitten,
 * with a `/* … *\/` block sitting in JSX children position and rendering as literal text through a
 * green typecheck, a green build and 4,632 green tests. The first assertion below is that one.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManuscriptDossier, ManuscriptDossierProps } from "./ManuscriptDossier";
import { MANUSCRIPT_TABS, DEFAULT_MANUSCRIPT_TAB } from "./ManuscriptTabs";
import { pitchAssets } from "../../lib/manuscriptPitch";
import { Manuscript, ManuscriptStatus, Query, QueryStatus } from "../../types";

const ms = (over: Partial<Manuscript> = {}): Manuscript =>
  ({
    id: "m1", userId: "u", title: "Murphy's Day Out",
    genre: "thriller", ageCategory: "Young Adult", wordCount: 50000,
    logline: "Murphy catches a fly", comps: [],
    status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-01-05T00:00:00.000Z",
    ...over,
  } as Manuscript);

const q = (over: Partial<Query> = {}): Query =>
  ({
    id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
    status: QueryStatus.QUERIED, dateSent: "2026-06-20T00:00:00.000Z",
    personalisationNotes: "", sendMethod: "Email",
    ...over,
  } as Query);

const noop = () => {};
const BASE: ManuscriptDossierProps = {
  manuscript: ms(),
  genres: ["Young Adult", "Thriller"],
  queries: [q()],
  versions: [],
  packages: [],
  activities: [],
  today: "2026-08-25",
  onSaveBookVersions: noop,
  elevatorPitch: "When fourteen-year-old Murphy pockets a fly that shouldn't exist, the men who lost it come looking.",
  agentName: (id) => (id === "a1" ? "T. Marsh" : "Agent not recorded"),
  synopsis: null,
  onSaveSynopsis: noop,
  notes: [],
  onOpenNoteboard: noop,
  comps: [],
  isPro: false,
  scoutAvailable: true,
  pitchAssets: pitchAssets(ms(), []),
  pitch: { kind: "none" },
  pitchText: null,
  synopsisVersionCount: 0,
  synopsisDate: null,
  onSavePitch: noop,
  now: Date.parse("2026-08-13T00:00:00.000Z"),
  currentYear: 2026,
  tab: DEFAULT_MANUSCRIPT_TAB,
  onTabChange: noop,
  onRemoveComp: noop,
  onAddComp: noop,
  onCopyPitch: noop,
  onOpenPlans: noop,
  onOpenQueriesHub: noop,
  onOpenPackageBuilder: noop,
};

const doss = (over: Partial<ManuscriptDossierProps> = {}) =>
  renderToStaticMarkup(React.createElement(ManuscriptDossier, { ...BASE, ...over }));

describe("the dossier renders one manuscript", () => {
  /**
   * ⚠️ THE FAULT THIS SPEC WAS BORN FROM. A block comment in JSX children position is TEXT, not a
   * comment — it renders. It is invisible to tsc, to the build and to every source-string test, and
   * it shipped. Any of these three markers appearing in the output means one has crept back.
   */
  it("leaks no comment syntax into the page", () => {
    const html = doss();
    expect(html).not.toContain("/*");
    expect(html).not.toContain("*/");
    expect(html).not.toContain("⚠️");
  });

  /**
   * ⚠️ THE FIGURES MOVED FROM A STAT STRIP TO ONE MONO LINE, which is the re-cut and not a loss.
   * They used to be `<div class="msv-statn">1</div>` in a three-cell column beside the title; the
   * profile states them as clauses in the hero's facts line, and both counts are still there.
   */
  it("states the manuscript's identity and its derived figures", () => {
    const html = doss();
    expect(html).toContain("Murphy&#x27;s Day Out");
    expect(html).toContain("Young Adult");
    expect(html).toContain("Thriller");
    expect(html).toContain("50,000 words");
    /* ⚠️ RETARGETED TO THE STRIP. The figures left the record card in the same edit that added the
       five-figure strip under the tab rail; the claim — that the page states the REAL derived
       numbers rather than constants — is unchanged, and the markup that carries them moved. */
    expect(html).toContain('<div class="msp-fign">1</div><div class="msp-figl">Queries sent</div>');
    expect(html).toContain('<div class="msp-fign">0</div><div class="msp-figl">Responses</div>');
    // The stat strip is gone from this variant, not merely restyled.
    expect(html).not.toContain("msv-statn");
  });

  /**
   * ⚠️ A COUNT OF NOUGHT IS STATED; A DATE NOBODY HAS IS NOT — and the strip inherits that split
   * rather than dropping it. `0 queries sent` is a fact the writer needs. `Last sent` has no date
   * behind it until something has gone out, and the strip writes `—` there, which is the form
   * `plateStatCells` already uses for `Last activity`: it reads as "this has not happened" rather
   * than asserting a date.
   *
   * ⚠️ `Querying since` IS RETIRED WITH THE HERO'S ROW. Its omit-the-whole-cell rule existed because
   * an omitted cell had to take its own divider with it; the strip has five fixed cells and omits
   * none, so there is nothing left to hang.
   */
  it("states nought as a fact and dashes a date it does not have", () => {
    const empty = doss({ queries: [] });
    expect(empty).toContain('<div class="msp-fign">0</div><div class="msp-figl">Queries sent</div>');
    expect(empty).toContain('<div class="msp-fign">—</div><div class="msp-figl">Last sent</div>');
    expect(empty, "the retired since cell came back").not.toContain("Querying since");
    expect(doss(), "a book with a sent query still dashes its last-sent").not.toContain('<div class="msp-fign">—</div><div class="msp-figl">Last sent</div>');
  });

  /* Genres arrive already resolved; the dossier must not be handed raw ids to print. */
  it("prints the genre labels it is given, and no stored id", () => {
    const html = doss({ genres: ["Adult", "Literary fiction"] });
    expect(html).toContain("Literary fiction");
    expect(html).not.toContain("literary-fiction");
  });

  it("offers the way back to the shelf", () => {
    /* ⚠️ INVERTED (amendment 3). The link pointed at the library grid; the sidebar switcher and the
       hero's chevrons are the two routes to another book now, and neither is a list to go back to. */
    expect(doss()).not.toContain("All manuscripts");
    expect(doss()).not.toContain("mlib-back");
  });



  /* Editing is opt-in on the plate, and the dossier is the caller that opts in. */
  it("hands the plate its editors when the page supplies them", () => {
    const withEdit = doss({
      plateEdit: {
        onTitle: noop, onWordCount: noop,
        genre: { ageCategory: "Adult", ids: ["thriller"], personal: [], onCreatePersonal: async () => ({ ok: false, reason: "x" }), onSave: noop },
      },
    });
    expect(withEdit).toContain("msv-platetitle editable");
    /* …and stays read-only without them, so neither mode is an accident. */
    expect(doss()).not.toContain("editable");
  });

  it("hides Send a query on a shelved manuscript, and greys its pill", () => {
    const html = doss({ manuscript: ms({ shelved: true }) });
    expect(html).toContain("msv-statuspill grey");
    expect(html).toContain("Shelved");
    expect(html).not.toContain("Send a query");
  });
});

/**
 * ⚠️ THE LIFECYCLE CASES MOVED WITH THE MENU, THEY DID NOT LAPSE (amendment 2). Shelve, reactivate,
 * the guarded delete and "Edit details" — the only route to status, shelved reason and notes — used
 * to be asserted here because the ⋯ was in the hero. The hero carries no actions now and the ⋯ is
 * `ManuscriptActions` in the page's control row, so the assertions live in `manuscriptActions.test.tsx`.
 * Written down because a case that simply disappears from a spec is indistinguishable from a rule
 * that was dropped.
 */
/**
 * ⚠️ THE NAME APPEARS ONCE IN THE PAGE BODY, AND THIS ASSERTION WAS GREEN ON ARRIVAL — which is
 * worth saying rather than implying it caught something. The brief asks for the title to be removed
 * from a sticky tab rail that carries a mini cover, a name and a status dot. That rail is in the
 * MOCKUP; it was never built. When Nick chose Type A in amendment 1, the page-local sticky rail was
 * dropped in favour of the shared grid's pinning slab, so `.msp-tabs` is plain content with no
 * `position: sticky` and no title in it. There was nothing to remove.
 *
 * ⚠️ IT IS STILL WORTH LOCKING, because the duplication it forbids is the kind that arrives by
 * accretion — a collapsed-state title, a breadcrumb echo, a card header — and each addition looks
 * reasonable on its own.
 *
 * ⚠️ COUNTED IN TEXT, NOT IN THE MARKUP. The title legitimately appears in an `aria-label` on the
 * edit affordance ("Edit title — …"), which is one name for a screen reader and not a second
 * printing of it. Counting raw HTML would forbid the accessible label.
 */
describe("the manuscript's name is printed once", () => {
  /**
   * ⚠️ STILL THE RECORD CARD'S PRINTING, AND THAT IS CURRENT RATHER THAN STALE. The plan was for the
   * masthead to carry the book and become the one printing; that work is stopped by the
   * coordination gate (`PageHeader`'s `mark` is a closed union of sixteen static page keys, and a
   * book cover cannot be one), so the card still holds the name and this assertion still points at
   * the right place. When the masthead does take it, this is what has to move — not be deleted.
   */
  /** Visible text only: attributes stripped, then tags. */
  const textOf = (html: string) =>
    html.replace(/<[^>]*>/g, "\u0000").split("\u0000").join(" ");

  it("appears exactly once in the rendered page body", () => {
    const title = "Murphy&#x27;s Day Out";
    const body = doss();
    const plain = textOf(body);
    const hits = plain.split(title).length - 1;
    expect(hits, `the name is printed ${hits} times`).toBe(1);
  });

  it("is not in the tab rail", () => {
    const rail = /<div class="msp-tabs"[\s\S]*?<\/div>/.exec(doss())?.[0] ?? "";
    expect(rail, "the tab rail is not on the page").not.toBe("");
    expect(rail).not.toContain("Murphy");
    /* …nor the rest of the mockup's rail furniture, which was never built. */
    for (const c of ["msp-mini", "msp-railtitle", "msp-dotstat"]) {
      expect(rail, `${c} arrived in the rail`).not.toContain(c);
    }
  });

  /** The accessible label is a name for a screen reader, not a second printing — it stays. */
  it("keeps the edit affordance's accessible label", () => {
    expect(doss({ plateEdit: BASE.plateEdit })).toBeTruthy();
  });
});

describe("the tab row", () => {
  it("renders the five tabs, opening on Overview", () => {
    const html = doss();
    for (const t of MANUSCRIPT_TABS) expect(html).toContain(t.label);
    expect(/aria-selected="true"[^>]*>Overview</.test(html)).toBe(true);
  });

  /**
   * ⚠️ THE RULE PHASE 2 HAD TO SUSPEND, RESTORED OVER ALL FIVE TABS. A tab is only allowed to exist
   * once something is behind it. It was suspended for exactly three commits while Overview, Journey
   * and Notes were being built, and the suspension was stated in the file rather than achieved by
   * loosening this into something that would pass and never be tightened again.
   */
  it("advertises no tab without a pane behind it", () => {
    for (const t of MANUSCRIPT_TABS) {
      const html = doss({ tab: t.key, comps: [{ title: "The Salt Path", year: 2018 }] });
      const pane = html.split('class="msp-pane"')[1] ?? "";
      expect(pane, `${t.label}: no pane element at all`).not.toBe("");
      expect(pane.trim().startsWith("></div>"), `${t.label} has nothing behind it`).toBe(false);
    }
  });

  it("renders each pane on its own tab, and only its own", () => {
    const overview = doss({ tab: "overview" });
    expect(overview).toContain("Elevator pitch");
    expect(overview).not.toContain("Current standing");

    const journey = doss({ tab: "journey" });
    expect(journey).toContain("Current standing");
    expect(journey).not.toContain("Elevator pitch");

    const comps = doss({ tab: "comps", comps: [{ title: "The Salt Path", year: 2018 }] });
    expect(comps).toContain("The Salt Path");
    expect(comps).not.toContain("Current standing");

    const notes = doss({ tab: "notes" });
    expect(notes).toContain("on this manuscript");
    expect(notes).not.toContain("The Salt Path");
  });
});

describe("the four Details derivations execute, which is what the smoke could no longer prove", () => {
  it("runs every one of them without throwing, on a populated manuscript", () => {
    expect(() =>
      doss({
        manuscript: ms({ comps: [{ title: "The Salt Path", year: 2018 }] }),
        queries: [q(), q({ id: "q2", status: QueryStatus.REJECTED })],
        comps: [{ title: "The Salt Path", year: 2018 }],
      })
    ).not.toThrow();
  });

  it("and on an empty one, where every derivation takes its absent branch", () => {
    expect(() => doss({ manuscript: ms({ logline: "" }), queries: [], comps: [] })).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE FIVE-FIGURE STRIP — under the tab rail, and the only place these figures are stated.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe("the figures strip", () => {
  it("states five cells under the tab rail, value over label", () => {
    const html = doss();
    const strip = html.slice(html.indexOf('class="msp-figstrip"'), html.indexOf('class="msp-pane"'));
    expect(strip, "the strip is not on the page").not.toBe("");
    expect((strip.match(/msp-figcell/g) ?? []).length).toBe(5);
    for (const label of ["Queries sent", "Responses", "Still open", "Agents holding", "Last sent"]) {
      expect(strip, `${label} is missing from the strip`).toContain(label);
    }
    /* Value above label: the numeral's div precedes the label's within each cell. */
    expect(strip.indexOf("msp-fign")).toBeLessThan(strip.indexOf("msp-figl"));
  });

  /**
   * ⚠️ IT SITS AFTER THE TAB RAIL AND BEFORE THE PANE, which is the whole of "under the tabs".
   * Rendered above the rail it would read as part of the record card's identity block.
   */
  it("sits between the tab rail and the pane", () => {
    const html = doss();
    expect(html.indexOf("msp-tabs")).toBeLessThan(html.indexOf("msp-figstrip"));
    expect(html.indexOf("msp-figstrip")).toBeLessThan(html.indexOf("msp-pane"));
  });

  /** ⚠️ AND THE FIGURES ARE STATED ONCE. Three of the five used to be on the record card too. */
  it("is the only place these figures are stated", () => {
    const html = doss();
    for (const label of ["Queries sent", "Responses"]) {
      expect(html.split(label).length - 1, `${label} is stated twice on the page`).toBe(1);
    }
  });
});
