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
import { CLE_HERO, CLE_ROWS, CLE_STAGES, CLE_CLOSING, cleRowText } from "./ContactListEmptyState";

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
  it("renders the editorial empty state on a blank account", () => {
    const html = render();
    expect(html).toContain(CLE_HERO.heading);
    expect(html).toContain("What makes a strong agent record?");
  });

  /**
   * ⚠️ THE TOOLBAR IS ABSENT, NOT DISABLED. Not one of its six controls does anything against
   * nothing on file, and the seventh — Add new agent — is the empty state's own hero button.
   */
  it("…with no toolbar, because none of its controls has anything to act on", () => {
    const html = render();
    for (const control of ["Filters", "Group", "Sort", "Add new agent"]) {
      expect(html).not.toContain(control);
    }
  });

  it("renders NEITHER the empty state nor the toolbar while the collections settle", () => {
    state.collectionsReady = false;
    const html = render();
    expect(html).not.toContain(CLE_HERO.heading);
    expect(html).not.toContain("Filters");
  });

  it("returns the toolbar and drops the empty state as soon as there is one agent", () => {
    state.agents = [AGENT];
    const html = render();
    expect(html).toContain("Filters");
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

describe("the copy", () => {
  it("runs six rows, numbered 01 through 06", () => {
    expect(CLE_ROWS.map((r) => r.n)).toEqual(["01", "02", "03", "04", "05", "06"]);
  });

  it("alternates the copy side, starting on the left", () => {
    expect(CLE_ROWS.map((r) => r.flip)).toEqual([false, true, false, true, false, true]);
  });

  it("runs three named stage plates, each carrying the illustrator's brief", () => {
    expect(CLE_STAGES.map((s) => s.slot)).toEqual([
      "agent-stage-add", "agent-stage-discover", "agent-stage-track",
    ]);
    const html = render();
    for (const s of CLE_STAGES) expect(html).toContain(s.slot);
  });

  /**
   * ⚠️ ONE SAMPLE RECORD ACROSS ALL SIX SCENES. The section is a single agent record being
   * assembled field by field; a second name in row four breaks the only idea the rows share.
   */
  it("illustrates one agent, not six", () => {
    const html = render();
    expect(html.match(/Amara Osei/g)?.length).toBe(2);   // rows 01 and 06
    expect(html).toContain("Osei Literary");
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
    const all = [CLE_HERO.body, ...CLE_STAGES.map((s) => s.body), ...CLE_ROWS.map(cleRowText)].join(" ");
    expect(all).toContain("acknowledgements");
    expect(CLE_ROWS.map((r) => r.title)).toContain("Personalisation notes");
    expect(all).not.toMatch(/\b\w+iz(e|es|ed|ing|ation)\b/);
  });

  /** ⚠️ THE APP REPORTS, IT NEVER APPRAISES — and an empty state is where that slips. */
  it("states what the fields are for without praising the reader or their book", () => {
    const all = [CLE_HERO.body, ...CLE_ROWS.map(cleRowText)].join(" ").toLowerCase();
    expect(all).not.toMatch(/\b(brilliant|amazing|incredible|stunning|masterpiece)\b/);
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

  it("closes with the handwritten note and both doors out", () => {
    const html = render();
    expect(html).toContain(CLE_CLOSING.note);
    expect(html).toContain(CLE_CLOSING.link);
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
   * ⚠️ THE GAP UNDER THE MASTHEAD IS THE GRID'S ALONE. A page that pads its own first row ADDS to
   * the token rather than replacing it — measured elsewhere as 92px and 154px against a 70px
   * token, on pages whose own declarations read perfectly.
   */
  it("puts no top padding on its first row", () => {
    const hero = decls(css).match(/\.cle-hero\s*\{[^}]*\}/)?.[0];
    expect(hero).toBeTruthy();
    expect(hero).toMatch(/padding:\s*0\s/);
    expect(hero).not.toMatch(/padding-top/);
  });

  /**
   * ⚠️ THE ALTERNATION DOES NOT SURVIVE THE STACK. Below the breakpoint every row must read
   * copy-then-illustration: a reader scrolling one column meets heading-then-picture each time,
   * and a row that inverted there reads as a mistake rather than as rhythm.
   */
  it("puts the copy first on every row once the rows stack", () => {
    const stacked = decls(css).slice(decls(css).indexOf("@media (max-width: 1040px)"));
    expect(stacked).toContain(".cle-row.flip .cle-row-l { order: 1; }");
    expect(stacked).toContain(".cle-row.flip .cle-row-art { order: 2; }");
  });

  /**
   * ⚠️ THE ROTATIONS COME OFF AT PHONE WIDTHS. A tilted card that is already the full column wide
   * is a horizontal scrollbar, not a flourish, and row 06's note card overhangs by design.
   */
  it("flattens the tilted and overhanging cards below md", () => {
    const phone = decls(css).slice(decls(css).indexOf("@media (max-width: 767.98px)"));
    expect(phone).toMatch(/\.cle-card\s*\{[^}]*transform:\s*none/);
    expect(phone).toMatch(/\.cle-card--note\s*\{[^}]*position:\s*static/);
    expect(phone).toMatch(/\.cle-badge\s*\{[^}]*position:\s*static/);
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

  /** The one piece of motion on the page is gated. */
  it("gates its only transform behind prefers-reduced-motion", () => {
    const reduced = decls(css).slice(decls(css).indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".cle-btn-pink:hover { transform: none; }");
  });

  /**
   * ⚠️ EMPHASIS IS WEIGHT AND VALUE, NEVER HUE. A sentence that changes colour mid-way reads as
   * two things — the law the headings carry, applied to the paragraph beneath them.
   */
  it("emphasises with the page's own ink, never a second colour", () => {
    const strong = decls(css).match(/\.cle-row-p strong\s*\{[^}]*\}/)?.[0];
    expect(strong).toBeTruthy();
    expect(strong).toContain("var(--cle-ink-body)");
  });
});
