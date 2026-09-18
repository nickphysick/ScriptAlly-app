/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashboard's empty state — the faded-example pattern's derivations (empty-states pack, Phase 1;
 * ref `design-refs/scriptally-empty-states-v2.html`, the Dashboard screen).
 *
 * ⚠️ THE DASHBOARD'S EMPTY MOMENT IS ZERO **QUERIES**, NOT `runStage === "day-one"`. `runStage`
 * returns day-one only with no queries AND no manuscripts, and the ref is plainly drawn for an
 * account that HAS a manuscript: its manuscript card is populated, and its first getting-started
 * task renders DONE reading "The Backpack on the Seat is on the shelf". Gating the pack on day-one
 * would have shown none of it to the account it was designed for — the commonest first-run state
 * there is, a writer who has added their book and not yet written to anybody.
 *
 * ⚠️ AND IT IS THE MANUSCRIPT-SCOPED SET, because every figure the empty state sits beside is
 * scoped. `OneScreenDashboard` derives `scopedQueries` once and hands it down; this reads the same
 * array, so the empty state cannot appear beside a count it does not describe.
 *
 * ⚠️ NOTHING HERE IS STORED, AND THE GETTING-STARTED ROWS ARE NOT TASKS. They are a projection of
 * "does this record exist" over data the page already holds — no rows are written to the to-do
 * store, there is no manual tick, and `assembleBoardColumns` never sees them, so the To-do page's
 * own counts cannot move. A stored onboarding checklist is a second answer to a question the
 * records already answer, and it goes stale the moment somebody deletes the thing it ticked.
 */
import { ComponentType, Manuscript, ManuscriptVersion, Query } from "../types";
import { PACKAGE_MATERIALS } from "./manuscriptPackages";
import { manuscriptComps } from "./comps";

/* ══════════════════════════ the stat tiles' caveat lines — RETIRED ══════════════════════════
   `COUNTER_CAVEAT` and `counterCaveat` went with the three stat cards they captioned (dashboard
   header, stage 1, 17 Sep). The header that replaced the cards states "0 queries out" as a plain
   figure, because zero is true there; it carries no caveat. */

/* ══════════════════════════ the getting-started list ══════════════════════════ */

export type GettingStartedKey =
  | "manuscript"
  | "agent"
  | "query"
  | "materials"
  | "comps";

export interface GettingStartedSpec {
  key: GettingStartedKey;
  /** the ref's `.deed` */
  deed: string;
  /** the ref's `.deed small`, while the row is outstanding */
  note: string;
  /** the ref's `.go` chip — the page the deed is done on */
  chip: string;
  /** the bridge's `handleNavigate` tab, and its sub-page where the route needs one */
  tab: string;
  sub?: string;
}

/**
 * The five deeds, in the ref's order, with the ref's own wording.
 *
 * ⚠️ THE `materials` DEED NAMES THREE THINGS AND THE MODEL CARRIES TWO. `PACKAGE_MATERIALS` is
 * Query Letter and Synopsis; sample pages was retired as a package material (D9 — "a package is a
 * covering letter, a synopsis and a VERSION, and the portion that actually went is the agency's
 * decision, recorded on the query"). The wording is the ref's and is Nick's to settle; what must
 * not happen is a done-state that invents a third slot, so the tick reads `PACKAGE_MATERIALS`
 * ITSELF rather than a list restated here. Restore sample pages to that constant and this row
 * follows it with no edit.
 */
export const GETTING_STARTED: readonly GettingStartedSpec[] = [
  {
    key: "manuscript",
    deed: "Add your first manuscript",
    note: "Even a working title and a word count is enough to start.",
    chip: "Manuscripts",
    tab: "manuscripts",
  },
  {
    key: "agent",
    deed: "Add an agent to your contact list",
    note: "Even one is enough to start. Discover has UK agents to browse.",
    chip: "Contact list",
    tab: "agents",
  },
  {
    key: "query",
    deed: "Log your first query",
    note: "Already tracking in a spreadsheet? Import it and pick up where you left off.",
    chip: "Query Centre",
    tab: "queries",
  },
  {
    key: "materials",
    deed: "Add your query letter, synopsis and opening sample",
    note: "So each query records exactly what was sent.",
    chip: "Submission packages",
    tab: "manuscripts",
    sub: "Submission packages",
  },
  {
    key: "comps",
    deed: "Add three comparable titles",
    note: "Most agents ask for them; they go straight into your packages.",
    chip: "Comparable titles",
    tab: "manuscripts",
    sub: "Comparable titles",
  },
];

/** How many comps the `comps` deed asks for — stated once, so the copy and the tick agree. */
export const COMPS_TARGET = 3;

export interface GettingStartedRow extends GettingStartedSpec {
  done: boolean;
  /** the ref's `li.done .deed small` — what the row says once the record exists */
  doneNote: string | null;
}

export interface GettingStartedInput {
  manuscripts: readonly Manuscript[];
  agentCount: number;
  queryCount: number;
  versions: readonly ManuscriptVersion[];
  /** the manuscript the page is scoped to; null when the writer has none */
  activeManuscript: Manuscript | null;
}

/**
 * The five rows with their done-states, each derived from whether the underlying record exists.
 *
 * ⚠️ THE TWO MANUSCRIPT-BOUND DEEDS ARE SCOPED, AND THEY ARE UNDONE WITH NO MANUSCRIPT. Materials
 * and comps are facts about a BOOK, so with no book there is nothing they could be true of — and
 * the first deed already says to add one. Reading them across every manuscript would tick "add
 * three comparable titles" for the book you are looking at because a different book has three.
 */
export const gettingStartedRows = (i: GettingStartedInput): GettingStartedRow[] => {
  const ms = i.activeManuscript;
  const have = new Set<ComponentType>(
    ms ? i.versions.filter((v) => v.manuscriptId === ms.id).map((v) => v.componentType) : [],
  );
  const comps = ms ? manuscriptComps(ms).length : 0;

  const done: Record<GettingStartedKey, boolean> = {
    manuscript: i.manuscripts.length > 0,
    agent: i.agentCount > 0,
    query: i.queryCount > 0,
    materials: !!ms && PACKAGE_MATERIALS.every((t) => have.has(t)),
    comps: comps >= COMPS_TARGET,
  };

  return GETTING_STARTED.map((s) => ({
    ...s,
    done: done[s.key],
    doneNote: done[s.key] ? doneNote(s.key, { title: ms?.title ?? null, comps }) : null,
  }));
};

/**
 * What a finished row says.
 *
 * ⚠️ IT STATES THE RECORD, NOT PRAISE. The ref's own line is "Done — *The Backpack on the Seat* is
 * on the shelf", which names the thing that now exists; the house rule is that the app reports and
 * never appraises, so none of these congratulates anybody. A manuscript with no title falls back to
 * the bare fact rather than printing an empty emphasis.
 */
const doneNote = (
  key: GettingStartedKey,
  ctx: { title: string | null; comps: number },
): string => {
  switch (key) {
    case "manuscript":
      return ctx.title ? `Done — ${ctx.title} is on the shelf.` : "Done — your manuscript is on the shelf.";
    case "agent":
      return "Done — your contact list has started.";
    case "query":
      return "Done — your first query is logged.";
    case "materials":
      return "Done — your materials are on file.";
    case "comps":
      return `Done — ${ctx.comps} comparable titles on file.`;
    default: {
      /* the house exhaustiveness idiom — a new deed fails to compile until it says what it reads */
      const unhandled: never = key;
      return unhandled;
    }
  }
};

/**
 * The to-do card's badge while the getting-started list is showing — the OUTSTANDING count.
 *
 * ⚠️ IT COUNTS WHAT IS LEFT, WHICH IS WHY THE REF READS 4 OVER FIVE ROWS. A badge stating the
 * total would never move as the writer worked through the list, and the one thing this block is
 * for is showing that it does.
 */
export const gettingStartedOpen = (rows: readonly GettingStartedRow[]): number =>
  rows.reduce((n, r) => (r.done ? n : n + 1), 0);

/** The ref's `.todo .foot` line, and the ref's eyebrow beside the badge. */
export const GETTING_STARTED_FOOT =
  "these tick themselves off as you go — no need to come back and mark them";
export const GETTING_STARTED_EYEBROW = "Getting started";

/* ══════════════════════════ the activity feed's first-run line ══════════════════════════ */

/**
 * What the feed says on an account with nothing in it yet.
 *
 * ⚠️ THE THREE GHOST LANES ARE RETIRED WITH THE ACTIVITY COLUMN THEY SAT IN (v16, 18 Sep), and
 * `FEED_GHOST_OPACITY` went with them. They drew a fading example UNDER whatever the feed held; the
 * v16 feed is a dated list in a scroller, and a drawn example beneath live entries reads as more
 * entries — the fault the community tile's own note records about sitting a strip under a long card.
 *
 * ⚠️ AND THE CONSTANT IS RENAMED RATHER THAN KEPT, because `FEED_GHOST_CAVEAT` was a caveat ABOUT
 * the lanes: a name that outlives its subject is read as fact by whoever meets it next, and the
 * sentence is no longer a caveat at all — it is the feed's own first-run line, and it is what the
 * empty feed says in place of counting days nothing happened in.
 */
export const FEED_FIRST_RUN_LINE =
  "every send, reply and note you record lands here — the feed becomes your querying history";

/* ══════════════════════════ the chart's faded example ══════════════════════════ */

/** The ref's centred CTA over the faded example. */
export const CHART_EMPTY_CTA = "Log your first query";
