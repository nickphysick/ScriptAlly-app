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
  notes: [],
  onOpenNoteboard: noop,
  onPrev: null,
  onNext: null,
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
  onBack: noop,
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
    expect(html).toContain('<div class="msp-hsn">1</div><div class="msp-hsl">Queries sent</div>');
    expect(html).toContain('<div class="msp-hsn">0</div><div class="msp-hsl">Responses</div>');
    // The stat strip is gone from this variant, not merely restyled.
    expect(html).not.toContain("msv-statn");
  });

  /**
   * ⚠️ A COUNT OF NOUGHT IS STATED; A DATE NOBODY HAS IS NOT. `0 queries sent` is a fact the writer
   * needs. `Querying since` has no date behind it until something has gone out, and a dash there
   * would be the app asserting a start it does not know — so the clause omits itself, and its
   * separator goes with it because the separator is a `::before` rather than an element.
   */
  it("omits Querying since where nothing has been sent, and states it where something has", () => {
    expect(doss({ queries: [] })).not.toContain("Querying since");
    expect(doss({ queries: [] })).toContain('<div class="msp-hsn">0</div><div class="msp-hsl">Queries sent</div>');
    expect(doss()).toContain("Querying since");
  });

  /* Genres arrive already resolved; the dossier must not be handed raw ids to print. */
  it("prints the genre labels it is given, and no stored id", () => {
    const html = doss({ genres: ["Adult", "Literary fiction"] });
    expect(html).toContain("Literary fiction");
    expect(html).not.toContain("literary-fiction");
  });

  it("offers the way back to the shelf", () => {
    expect(doss()).toContain("All manuscripts");
    expect(doss()).toContain("mlib-back");
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
