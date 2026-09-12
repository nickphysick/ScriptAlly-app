/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — the editorial empty state, and the three-state gate in front of it.
 *
 * ⚠️ THE GATE IS LOCKED AS A PURE FUNCTION, NOT BY SCRAPING THE COMPONENT. Its hardest case —
 * "the writer has just pressed Add your first agent, so nothing is on file and the empty state
 * must still stand down" — is a state a static render cannot reach: this repo has no jsdom, so
 * nothing here can press a button. A source lock reading the predicate off `AgentList.tsx` would
 * prove the predicate was WRITTEN, never that it decides anything, and it would fail by
 * construction the day the code moved file. `contactListState` is called instead.
 *
 * ⚠️ AND THE RENDERED HALF IS STILL ASSERTED, because a correct derivation nothing mounts is the
 * other half of the same fault. Both, or neither is worth having.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserPlan, SubmissionMethod, SubmissionStatus } from "../../types";
import { contactListState } from "../../lib/agentList";
import { RAIL_GROUPS } from "../shell/railNav";
import {
  CLE_CARD_FULL, CLE_CARD_GAPS, CLE_CLOSING, CLE_EXAMPLE_TAG, CLE_GROUPS, CLE_HERO, CLE_HERO_NOTE,
  CLE_RAIL_SEGMENTS, CLE_ROWS,
} from "./ContactListEmptyState";

/* ── the db under test's control, so `collectionsReady` can be false ── */
const state: Record<string, unknown> = {
  currentUser: { id: "u1", name: "Nick Physick", email: "n@example.com", plan: UserPlan.FREE, homeCountry: "GB" },
  collectionsReady: true,
  agents: [], queries: [], manuscripts: [], activities: [], packages: [], versions: [],
  notes: [], tasks: [], userTasks: [], taskFlags: [], dismissedTasks: [], communityAgents: [],
};
const asyncNoop = async () => undefined;
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () =>
    new Proxy(state, {
      get: (t, k) => (typeof k === "symbol" ? undefined : k in t ? t[k as string] : asyncNoop),
      has: () => true,
    }),
}));
vi.mock("../../lib/firebase", () => ({
  db: {}, auth: {}, handleFirestoreError: () => {},
  OperationType: { CREATE: "create", UPDATE: "update", DELETE: "delete", LIST: "list", GET: "get", WRITE: "write" },
}));
/* ⚠️ THE NO-OPS ARE INLINE. `vi.mock` factories are hoisted above every `const` in the file, so a
   shared helper referenced at factory-EVALUATION time (rather than inside a lazy getter) is in its
   temporal dead zone and the mock throws before a single test collects. */
vi.mock("firebase/firestore", () => ({
  collection: () => ({}), doc: () => ({}), onSnapshot: () => () => {},
  setDoc: async () => undefined, deleteDoc: async () => undefined, deleteField: () => ({}),
}));
vi.mock("../toast/ToastProvider", () => ({
  useToast: () => ({ showToast: () => {}, showConfirm: () => {} }),
  ToastProvider: ({ children }: { children?: React.ReactNode }) => children as React.ReactElement,
}));

import { AgentList } from "./AgentList";

const AGENT = {
  id: "a1", userId: "u1", name: "Ada Reader", agency: "Reader & Co", email: "ada@example.com",
  website: "", genres: ["Literary Fiction"], mswlNotes: "",
  submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [], dateAdded: "2026-01-02T00:00:00.000Z", lastCheckedDate: "2026-01-02T00:00:00.000Z",
};

const render = () =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={["/agents"]}>
      <AgentList onNavigate={() => {}} />
    </MemoryRouter>,
  );

/** Visible words only — attributes and class names are not copy. */
const text = (html: string) => html.replace(/<[^>]*>/g, " ");
/** …and with React's text entities decoded, so an apostrophe in a name can be matched. */
const words = (html: string) =>
  text(html).replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

beforeEach(() => {
  state.agents = [];
  state.collectionsReady = true;
});

/* ══════════════════════════════════════════════════════════════════════════ */

describe("contactListState — loading, blank, list", () => {
  it("is `settling` before the collections have delivered, so nothing first-run is painted", () => {
    expect(contactListState({ collectionsReady: false, agentCount: 0, adding: false })).toBe("settling");
  });

  it("is `blank` once they have and nothing is on file", () => {
    expect(contactListState({ collectionsReady: true, agentCount: 0, adding: false })).toBe("blank");
  });

  it("is `list` with an agent on file", () => {
    expect(contactListState({ collectionsReady: true, agentCount: 1, adding: false })).toBe("list");
  });

  /**
   * THE CASE THE COUNT ALONE GETS WRONG. `onAddAgent` mints an unsaved stub that lives in the grid
   * and not in `agents`, so a blank account that has just pressed the empty state's own button
   * still has `agentCount === 0`. If this returned "blank" the new card would be created, focused
   * and scrolled to behind the very page that offered it.
   */
  it("stands down the moment a card is being added, though nothing is on file yet", () => {
    expect(contactListState({ collectionsReady: true, agentCount: 0, adding: true })).toBe("list");
  });

  /** A collection that has arrived outranks a flag still waiting on its siblings. */
  it("shows the list rather than blanking a page that already has something to draw", () => {
    expect(contactListState({ collectionsReady: false, agentCount: 3, adding: false })).toBe("list");
  });
});

describe("the page mounts each state", () => {
  it("renders the feature-led empty state on a blank account", () => {
    const html = render();
    expect(html).toContain(CLE_HERO.heading);
    /* ⚠️ RETARGETED (Phase 3): the six-row explainer band is retired and its heading is asserted
       ABSENT in "the copy" below. The second claim here is that the page is the full feature-led
       one rather than a hero alone — so it names the LAST block, which is the one a truncated
       render would lose. */
    expect(html).toContain(CLE_CLOSING.heading);
  });

  /**
   * ⚠️ THE TOOLBAR IS ABSENT, NOT DISABLED. Not one of its controls does anything against nothing
   * on file.
   *
   * ⚠️ `Add new agent` LEAVES THIS LIST AND THE CASE IS STRONGER FOR IT. The label was standing in
   * for "the toolbar is not here", and the moment the action moved to the MASTHEAD — where it is
   * correct, and shows on a blank account too — the proxy failed on a page that was behaving
   * exactly as designed. A claim about a control ROW is asserted on the row.
   */
  it("…with no toolbar, because none of its controls has anything to act on", () => {
    const html = render();
    /* the control is "Filter" since the toolbar became the Query Centre's (Phase 6) */
    for (const control of ["Filter", "Group", "Sort"]) {
      expect(html, `${control} rendered against an empty list`).not.toContain(control);
    }
    expect(html, "the toolbar rendered against an empty list").not.toContain("agl-toolbar");
    /* ⚠️ AND THE MASTHEAD'S PRIMARY IS PRESENT, which is the other half of the same fact: the page
       still offers the one thing a blank account can do. Asserted here so the proxy cannot come
       back as "no `Add new agent` anywhere". */
    expect(html, "the blank account lost the one action it can take").toContain("Add new agent");
  });

  it("renders NEITHER the empty state nor the toolbar while the collections settle", () => {
    state.collectionsReady = false;
    const html = render();
    expect(html).not.toContain(CLE_HERO.heading);
    expect(html).not.toContain("Filter");
  });

  it("returns the toolbar and drops the empty state as soon as there is one agent", () => {
    state.agents = [AGENT];
    const html = render();
    expect(html).toContain("Filter");
    expect(html).not.toContain(CLE_HERO.heading);
  });

  /** The masthead is untouched by all of this — it states the page in every state. */
  it("keeps the page header in the blank state", () => {
    expect(render()).toContain("Contact list");
  });

  /**
   * ⚠️ THE RETIRED DOORWAY IS GONE, NOT DEMOTED. Two first-run states for one condition is one of
   * them to keep in step, and the old dashed box carried three of the new page's words.
   */
  it("has retired the dashed welcome box", () => {
    expect(render()).not.toContain("Your agent list starts here");
  });

  /** …while the filtered-empty state, which is a different claim, survives. */
  it("keeps the no-match state, which only a populated list can reach", () => {
    const page = readFileSync(join(__dirname, "AgentList.tsx"), "utf8");
    expect(page).toContain("No agents match.");
  });
});

/**
 * Every sentence the page renders, joined — the population the copy laws sweep.
 *
 * ⚠️ IT IS BUILT FROM THE CONSTANTS RATHER THAN FROM THE RENDER, so a law cannot be satisfied by a
 * sentence failing to render. The old version swept two row bodies; this sweeps the whole table,
 * which is a wider net than the claim it replaces.
 */
const ALL_COPY = [
  CLE_HERO.heading, CLE_HERO.lede, CLE_HERO.cta, CLE_HERO.discoverLink, CLE_HERO.importLink,
  CLE_HERO.caveat, CLE_HERO_NOTE,
  CLE_CLOSING.heading, CLE_CLOSING.sub, CLE_CLOSING.cta, CLE_CLOSING.link,
  ...CLE_ROWS.flatMap((r) => [r.heading, r.sub, r.caveat]),
  ...Object.values(CLE_CARD_FULL).filter((v) => typeof v === "string").map(String),
  ...Object.values(CLE_CARD_GAPS).filter((v) => typeof v === "string").map(String),
  ...CLE_GROUPS.flatMap((g) => [g.name, ...g.cards.map((c) => c.line)]),
].join(" ");

describe("the copy", () => {
  /* ⚠️ RETARGETED (empty-states pack, Phase 3). The six numbered rows and the three stage plates
     are RETIRED with the editorial page; the ref draws a hero, two feature rows and a closing.
     Each of the old cases below is either restated for the new structure or turned into the
     statement that its subject is gone — never simply deleted, because an assertion removed is
     coverage nobody owns. */
  it("runs the ref's two feature rows, in its order", () => {
    expect(CLE_ROWS.map((r) => r.key)).toEqual(["gaps", "next"]);
    expect(CLE_ROWS.map((r) => r.heading)).toEqual(["Fill the gaps.", "Who's next?"]);
  });

  it("alternates the copy side, starting on the left", () => {
    expect(CLE_ROWS.map((r) => r.flip)).toEqual([false, true]);
  });

  it("⚠️ the six-row explainer band is GONE, not merely unrendered", () => {
    /* the pack names this removal: section 2, "Fill the gaps.", replaces it */
    const src = readFileSync(join(__dirname, "ContactListEmptyState.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).not.toContain("What makes a strong agent record?");
    expect(src).not.toContain("CLE_RECORD_HEADING");
    expect(render()).not.toContain("What makes a strong agent record?");
  });

  it("⚠️ the three illustrator stage plates are GONE — a retired commission, named", () => {
    /* `agent-stage-add`, `agent-stage-discover` and `agent-stage-track` were named briefs for
       artwork that never arrived. The ref draws no equivalent. This asserts they are not left
       half-present, and the run report records that reversing it is one `git show`. */
    const html = render();
    for (const slot of ["agent-stage-add", "agent-stage-discover", "agent-stage-track"]) {
      expect(html).not.toContain(slot);
    }
    expect(html).not.toMatch(/["\s`]cle-stage["\s`]/);
  });

  /**
   * ⚠️ ONE SAMPLE RECORD PER SECTION, which is the previous version's law with the sections
   * redrawn. The hero is Amara Osei complete; "Fill the gaps." is Aisha Kapoor incomplete. A
   * second name inside either would break the only idea that section has.
   */
  it("illustrates one agent per section", () => {
    const html = render();
    /* the hero's card, and the grouped strip below, which is a DIFFERENT claim (a list of many) */
    expect(html).toContain(CLE_CARD_FULL.name);
    expect(html).toContain(CLE_CARD_FULL.agency);
    expect(html).toContain(CLE_CARD_GAPS.name);
    expect(html).toContain(CLE_CARD_GAPS.agency);
    /* and the two cards are not the same person */
    expect(CLE_CARD_FULL.name).not.toBe(CLE_CARD_GAPS.name);
  });

  it("⚠️ draws no star rating anywhere — the pack forbids one in these illustrations", () => {
    const html = render();
    expect(html).not.toContain("★");
    expect(html).not.toContain("☆");
    expect(html).not.toMatch(/["\s`]cle-star["\s`]/);
  });

  it("⚠️ the rail's segment count and the copy that names it read ONE constant", () => {
    /* "Six fields make a strong record" over a five-segment rail is the drawn-count-disagrees
       fault in its smallest form */
    expect(CLE_RAIL_SEGMENTS).toBe(6);
    expect(CLE_ROWS.find((r) => r.key === "gaps")!.sub).toContain("Six fields");
    const html = render();
    expect((html.match(/class="cle-rail/g) ?? []).length).toBe(2);
  });

  it("⚠️ each group heading's count IS its own card list's length, never typed beside it", () => {
    /* the ref heads its last group "Idle · 3" and draws TWO cards under it */
    const html = render();
    for (const g of CLE_GROUPS) {
      expect(html).toContain(`${g.name} · ${g.cards.length}`);
      /* ⚠️ `text()` STRIPS TAGS AND NOT ENTITIES. React writes `'` as `&#x27;`, so a name with an
         apostrophe is never found by a raw comparison — which reported a rendered card as missing.
         `words()` decodes the three entities React emits for text. */
      for (const c of g.cards) expect(words(html)).toContain(c.who);
    }
    expect(html).not.toContain("Idle · 3");
  });

  it("every illustration says it is an example", () => {
    const html = render();
    const plates = (html.match(/class="cle-ill"/g) ?? []).length;
    expect(plates).toBe(3);
    expect((html.match(new RegExp(`>${CLE_EXAMPLE_TAG}<`, "g")) ?? []).length).toBe(plates);
  });

  it("⚠️ draws NO button inside an illustration — those are pictures of buttons", () => {
    /* ⚠️ SCOPED TO `.cle`, because the page around it has chrome of its own. Counting buttons in
       the whole document reported 7 for a section that renders 5, which is the measure-the-parts
       fault: the number was true about a subject nobody was asking after. */
    const html = render();
    const cle = html.slice(html.indexOf('class="cle"'));
    expect(cle.length, "the section was found").toBeGreaterThan(1000);
    /* its real buttons: hero CTA + Discover + Import, closing Discover + CTA */
    expect((cle.match(/<button/g) ?? []).length).toBe(5);
    /* and the drawn ones are spans */
    expect(cle).toContain("cle-b1");
    expect(cle).not.toMatch(/<button[^>]*cle-b1/);
  });

  /**
   * ⚠️ NO GENDERED PRONOUN FOR AN AGENT, ANYWHERE THE WRITER CAN READ IT. The app never stores an
   * agent's pronouns; this page invents a name and would otherwise invent a gender with it.
   */
  it("never genders the sample agent", () => {
    expect(text(render())).not.toMatch(/\b(he|him|his|she|her|hers)\b/i);
  });

  /** UK spelling, because the rest of the app is written in it. */
  it("is written in UK English", () => {
    /* ⚠️ THE SOURCE CHANGED, THE LAW DID NOT. The old version's "acknowledgements" lived in a row
       body that is retired; the -ize sweep is the durable half and now runs over every sentence the
       page renders, which is a wider net than the old one. */
    expect(ALL_COPY).not.toMatch(/\b\w+iz(e|es|ed|ing|ation)\b/);
  });

  /** ⚠️ THE APP REPORTS, IT NEVER APPRAISES — and an empty state is where that slips. */
  it("states what the fields are for without praising the reader or their book", () => {
    expect(ALL_COPY.toLowerCase()).not.toMatch(/\b(brilliant|amazing|incredible|stunning|masterpiece)\b/);
  });

  /**
   * ⚠️ THE DISCOVER LINK'S DESTINATION IS RECONCILED AGAINST THE RAIL'S TABLE, not asserted as a
   * literal on both sides — a pair of strings typed twice agrees until somebody renames the
   * sub-page, and then the rail still works while this link goes to the dashboard.
   */
  it("can reach Discover through the bridge the rail already uses", () => {
    const entry = RAIL_GROUPS.flatMap((g) => g.items).find((i) => i.path === "/agents/discover");
    expect(entry, "railNav still names the Discover route").toBeTruthy();
    expect(entry!.tab).toBe("agents");
    expect(entry!.sub).toBeTruthy();
  });

  it("closes with the ref's ask and both doors out", () => {
    const html = render();
    expect(html).toContain(CLE_CLOSING.heading);
    expect(html).toContain(CLE_CLOSING.sub);
    expect(html).toContain(CLE_CLOSING.link);
    expect(html).toContain(CLE_CLOSING.cta);
  });

  it("⚠️ the copy is the ref's, verbatim — read back from the artefact, never retyped", () => {
    const REF = readFileSync(
      join(process.cwd(), "design-refs/scriptally-empty-states-v3-feature-led.html"), "utf8",
    );
    const words = [
      CLE_HERO.heading, CLE_HERO.lede, CLE_HERO.cta, CLE_HERO.discoverLink, CLE_HERO.importLink,
      CLE_HERO.caveat, CLE_CLOSING.heading, CLE_CLOSING.sub, CLE_CLOSING.link,
      ...CLE_ROWS.flatMap((r) => [r.heading, r.sub, r.caveat]),
      CLE_CARD_FULL.name, CLE_CARD_FULL.wishlist, CLE_CARD_GAPS.name, CLE_HERO_NOTE,
    ];
    for (const w of words) expect(REF, `"${w}" is not the ref's`).toContain(w);
  });

  it("⚠️ and the apostrophes are the artefact's STRAIGHT ones, not smart quotes", () => {
    expect(ALL_COPY).not.toMatch(/[\u2018\u2019\u201c\u201d]/);
  });

  it("⚠️ DEVIATES from the ref on one sentence, deliberately: no gendered pronoun for an agent", () => {
    /* the ref's own add-inline button reads "Add her wishlist" about a name this app stores no
       pronouns for. On a real record that is a 50% error rate about a real person, in the one
       register where being wrong is least forgivable. The neutral form is the rest of the app's. */
    expect(CLE_CARD_GAPS.wishlistAdd).toBe("Add their wishlist");
    expect(CLE_CARD_GAPS.wishlistHint).toContain("their agency page");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   The stylesheet. Three laws that are cheap to break and silent when broken.
   ══════════════════════════════════════════════════════════════════════════ */

const css = readFileSync(join(__dirname, "contactListEmpty.css"), "utf8");
const agl = readFileSync(join(__dirname, "agentList.css"), "utf8");
/** ⚠️ A LOCK NEVER READS ITS OWN EXPLANATION — every retirement here is documented by naming what
 *  it retired, so the prose necessarily contains the forbidden token. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the stylesheet", () => {
  /**
   * ⚠️ EVERY `var(--x)` MUST RESOLVE. `calc()` on an undefined custom property yields NaN and CSS
   * says nothing — the declaration is simply dropped — and a plain `var()` on one leaves the
   * property at its initial value. This sheet reads a dozen `--agl-*` tokens defined in a
   * different file; one typo is an invisible, buildable, testable, entirely wrong page.
   */
  it("reads no token that nothing defines", () => {
    const defined = new Set(
      [...decls(css).matchAll(/(--[a-z0-9-]+)\s*:/g), ...decls(agl).matchAll(/(--[a-z0-9-]+)\s*:/g)]
        .map((m) => m[1]),
    );
    const read = [...decls(css).matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(read.length).toBeGreaterThan(20);           // the check measured something
    expect(read.filter((t) => !defined.has(t))).toEqual([]);
  });

  /**
   * ⚠️ THIS LOCK USED TO SAY THE OPPOSITE, AND THE REVERSAL IS THE POINT. It required
   * `padding: 0` on the hero, on the house law that the gap under the masthead is the grid's
   * alone — a page quietly padding its own first row is how two pages open at different heights
   * for no stated reason. The spacing pass departs from that deliberately: the grid pays
   * `--wpg-chrome-gap`, which is 16px, and 17px measured from the header rule to the headline is
   * right for a working page and crowded for a first-run editorial one.
   *
   * ⚠️ SO WHAT IS LOCKED HERE IS THE MECHANISM, NOT THE NUMBER. The total gap is a rendered fact
   * and is asserted on the page (`emptyStateSpacing.measure.ts`, 118px at 1280/1440/1728); a
   * declaration cannot see the grid's half of it and would be describing a page nobody serves.
   * What a source lock CAN hold is that the opening is PADDING — an adjacent margin collapses and
   * would be absorbed by whatever sits above, which is how a compensation that summed correctly
   * on paper came out 4px short in the browser.
   */
  it("pays its opening with padding, which cannot collapse — never a margin", () => {
    const hero = decls(css).match(/\.cle-hero\s*\{[^}]*\}/)?.[0];
    expect(hero).toBeTruthy();
    const pad = /padding:\s*([^;]+);/.exec(hero!)?.[1]?.trim();
    expect(pad, "the hero declares its own top padding").toBeTruthy();
    expect(parseFloat(pad!.split(/\s+/)[0]), "and it is a real opening, not a token gap").toBeGreaterThan(60);
    expect(hero).not.toMatch(/margin-top|margin:\s*\d/);
  });

  /**
   * ⚠️ THE STAGES STACK EARLIER THAN THE ROWS, AND THE TWO NUMBERS ARE NOT A DISAGREEMENT. Both
   * were 1040 while the stage grid capped at 1240; at 1000 the plates fit to 960 with every
   * heading still on two lines, so 1040 was collapsing a grid with room to spare. The rows are a
   * copy column beside an illustration and keep their own point.
   */
  it("stacks at one width, because there is one grid to stack", () => {
    /* ⚠️ RETARGETED (Phase 3). Two breakpoints existed because the stage grid capped at 1240 and
       the rows at 1040 — two grids with genuinely different room. The stages are retired, so the
       second number would be a breakpoint for nothing, and the honest claim is that only one
       remains. */
    const d = decls(css);
    expect(d).not.toContain("cle-stages-grid");
    expect(d).not.toContain("@media (max-width: 900px)");
    expect((d.match(/@media \(max-width:/g) ?? []).length).toBe(1);
    expect(d).toContain("@media (max-width: 1040px)");
  });

  /**
   * ⚠️ THE ALTERNATION DOES NOT SURVIVE THE STACK. Below the breakpoint every row must read
   * copy-then-illustration: a reader scrolling one column meets heading-then-picture each time,
   * and a row that inverted there reads as a mistake rather than as rhythm.
   */
  it("puts the copy first on every row once the rows stack", () => {
    /* ⚠️ THE CLAIM IS UNCHANGED AND ONLY THE SELECTORS MOVED (`cle-row-l`/`cle-row-art` became
       `cle-txt`/`cle-ill` with the restructure). Below the breakpoint every row must read
       copy-then-illustration: a reader scrolling one column meets heading-then-picture each time,
       and a row that inverted there reads as a mistake rather than as rhythm. */
    const stacked = decls(css).slice(decls(css).indexOf("@media (max-width: 1040px)"));
    expect(stacked).toContain(".cle-row--flip .cle-txt, .cle-row--flip .cle-ill { order: 0; }");
    /* and the flip itself is `order`, never a second markup order */
    expect(decls(css)).toContain(".cle-row--flip .cle-txt { order: 2; }");
    expect(decls(css)).not.toContain("direction: rtl");
  });

  /**
   * ⚠️ THE ROTATIONS COME OFF AT PHONE WIDTHS. A tilted card that is already the full column wide
   * is a horizontal scrollbar, not a flourish, and row 06's note card overhangs by design.
   */
  it("⚠️ has nothing tilted or overhanging left to flatten — the rotations are GONE", () => {
    /* ⚠️ RETARGETED, AND THE RETARGET IS THE STRONGER CLAIM. The old rule flattened rotated cards
       and absolutely-positioned badges at phone widths, because a tilted full-width card is a
       horizontal scrollbar rather than a flourish. The feature-led illustrations have no rotation
       and nothing hung past an edge, so the fault is now structurally impossible instead of
       corrected at one breakpoint — which is this repo's stated preference. */
    const d = decls(css);
    expect(d).not.toMatch(/transform:\s*rotate/);
    expect(d).not.toContain("cle-card--note");
    expect(d).not.toContain("cle-badge");
    /* and no `overflow-clip-margin`, which existed only to stop those shadows being sheared */
    expect(d).not.toContain("overflow-clip-margin");
  });

  /** …and the sideways belt: nothing decorative may open a horizontal scrollbar. */
  it("clips its own overflow on the x axis only", () => {
    const root = decls(css).match(/\.cle\s*\{[\s\S]*?\}/)?.[0];
    expect(root).toBeTruthy();
    expect(root).toContain("overflow-x: clip");
    /* `hidden` on one axis silently makes the other `auto`, which would put a second scroll
       container inside `.wpg-scroll`. `clip` is the only value that may differ from a visible pair. */
    expect(root).not.toContain("overflow-x: hidden");
  });

  /**
   * ⚠️ RETARGETED: THE PAGE HAS NO MOTION NOW, so there is nothing to gate. A reduced-motion block
   * guarding a transform nobody declares is a rule with no subject — the class this repo records as
   * silent in both directions — so the claim becomes the absence, which cannot go vacuous.
   */
  it("declares no motion at all, so there is nothing to gate", () => {
    const d = decls(css);
    expect(d).not.toMatch(/\btransition:/);
    expect(d).not.toMatch(/\banimation:/);
    expect(d).not.toContain("cle-btn-pink");
  });

  /**
   * ⚠️ EMPHASIS IS WEIGHT AND VALUE, NEVER HUE — the law is unchanged; what changed is that the
   * copy no longer emphasises anything. The retired six rows carried mid-sentence `<strong>` runs
   * (the reason `CleSeg` existed as a segment list rather than a string); the ref's two feature
   * subheadings are whole sentences. So the claim becomes the GENERAL one, which covers whatever
   * the page emphasises next: no `em`, `strong` or `b` in this sheet may set a colour of its own.
   */
  it("never colour-shifts an emphasis, wherever one appears", () => {
    const d = decls(css);
    /* ⚠️ THE SELECTOR MUST END IN THE EMPHASIS ELEMENT, not merely contain its letters. A bare
       `\bb\b` matches inside `.cle-rc-bd` and a leading `[^}]*` swallows the rule before it, so
       the first cut of this sweep reported an empty string as an offender — a true statement about
       nothing, which is the vacuous-probe fault this repo records. */
    const emphasisRules = d.match(/(?:^|\n)[^{}\n]*(?:^|\s)(?:strong|em|b)\s*\{[^}]*\}/g) ?? [];
    /* ⚠️ A FLOOR ON THE POPULATION FIRST — a sweep over an empty set is satisfied by finding
       nothing, which is the vacuous-green fault this repo records for every negative check. */
    expect(emphasisRules.length, "the sweep found no emphasis rules to check").toBeGreaterThan(1);
    for (const r of emphasisRules) {
      /* ⚠️ THE LAW PERMITS THE PAGE'S OWN INK AND FORBIDS A SECOND COLOUR — which is not the same
         as forbidding colour, and the first cut of this sweep got that backwards: it flagged
         `.cle-cc-in b` for reading `--cle-ink`, the exact token the original case REQUIRED. What is
         forbidden is a literal or a hue that is not one of the page's ink tokens. */
      const colour = /(?:^|[^-])color:\s*([^;]+);/.exec(r)?.[1]?.trim();
      if (!colour) continue;
      expect(colour, `an emphasis rule states a colour of its own: ${r}`)
        .toMatch(/^var\(--cle-ink[a-z-]*\)$/);
    }
    /* and the `em` the page does use — the card's book title — leans on style, not colour */
    const sv = d.match(/\.cle-rc-sv em\s*\{[^}]*\}/)?.[0];
    expect(sv, "the card's emphasis rule").toBeTruthy();
    expect(sv).toContain("font-style: italic");
  });
});
