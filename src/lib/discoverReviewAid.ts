/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — a DEV-ONLY review aid. Prod keeps `DISCOVER_LIVE = false`, so nobody can see the live page there;
 * this lets a dev build show each state:
 *
 *   window.__SA_DV_STATE = "live" | "done" | "none" | "empty"   — the page over the FIXTURE below, in memory
 *   window.__SA_DV_LIVE  = 1                                    — the live page over the account's REAL data
 *
 * ⚠️ IT FABRICATES INPUT, NEVER OUTPUT. The fixture is a catalogue, a manuscript and some decisions; every figure,
 *    sentence and order on the page still comes out of `scout.ts`, so a review screenshot is evidence about the app.
 * ⚠️ AND A FIXTURE REVIEW NEVER WRITES. Its store is in memory: an add makes no agent, a pass no document, a share
 *    no submission. Reload and it is as it was.
 * ⚠️ THE GATE IS AT THE CALL SITE (`import.meta.env.MODE !== "production"` in DiscoverPage), so a production build
 *    folds the branch away and this module is absent from the bundle. Verified by grepping `dist/`, not by reading.
 */
import { Manuscript, ManuscriptStatus, SubmissionMethod, SubmissionStatus, type Agent, type CommunityAgent } from "../types";
import { decisionDoc, type ScoutDecision } from "./scout";
import type { ScoutIO } from "./scoutStore";

export type ReviewState = "live" | "done" | "none" | "empty";

type AidWindow = Window & { __SA_DV_STATE?: string; __SA_DV_LIVE?: unknown; __SA_DV_HOLD_MS?: unknown };
const aidWindow = (): AidWindow | null => (typeof window === "undefined" ? null : (window as AidWindow));

export function reviewState(): ReviewState | null {
  const s = aidWindow()?.__SA_DV_STATE;
  return s === "live" || s === "done" || s === "none" || s === "empty" ? s : null;
}
export const reviewLive = (): boolean => Boolean(aidWindow()?.__SA_DV_LIVE);
/** `window.__SA_DV_HOLD_MS = n` holds the loading face for n ms after mount, so it can be measured against the page
 *  that replaces it. It fabricates input (whether the data has answered), never output. */
export const reviewHoldMs = (): number => {
  const v = Number((aidWindow() as unknown as { __SA_DV_HOLD_MS?: unknown } | null)?.__SA_DV_HOLD_MS);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 60_000) : 0;
};

/* ⚠️ LAZY, NOT MODULE-SCOPE: top-level calls are side effects to a bundler, which then keeps this whole module in a
   production build even though nothing there imports from it (lock E1 found the fixture shipping). */
function fixtureData() {
  const NOW = Date.now();
  const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

  const ca = (id: string, name: string, agency: string, city: string, country: string, weeks: number, method: SubmissionMethod,
    nrmn: boolean, lists: number, queried: number, genres: string[], wish: string, mats: string[], site: string, verifiedDaysAgo: number,
    status: SubmissionStatus = SubmissionStatus.OPEN): CommunityAgent => ({
    id, name, agency, email: "", website: site, city, country, genres, mswlNotes: wish, starRating: 3, submissionStatus: status,
    responseTimeWeeks: weeks, noResponseMeansNo: nrmn, submissionMethod: method, materialsWanted: mats,
    dateAdded: daysAgo(200), lastCheckedDate: daysAgo(verifiedDaysAgo), notes: "", contributedByCount: lists,
    lastVerifiedDate: daysAgo(verifiedDaysAgo), dataSource: "community", communityQueryCount: queried,
  });

  const E = SubmissionMethod.EMAIL;
  const F = SubmissionMethod.ONLINE_FORM;

  /** The mock's six picks — every line bound to a CommunityAgent field, as the mock's own data note says. */
  const PICKS: CommunityAgent[] = [
    ca("dvfx-ew", "Eleanor Whitcombe", "Marsh & Tide Literary", "London", "GB", 8, E, true, 23, 14, ["Literary Fiction", "Book Club Fiction", "Upmarket", "Memoir"],
      "I'm drawn to quiet, character-led novels about family and memory, particularly anything rooted in coastal communities or small towns. Send me the voice first.",
      ["Query letter", "Synopsis", "First 3 chapters"], "marshandtide.co.uk", 6),
    ca("dvfx-tr", "Tomasz Rilke", "Greyfriars Agency", "Edinburgh", "GB", 6, E, false, 17, 9, ["Literary Fiction", "Historical", "Speculative"],
      "Give me a novel that happens over a single day, told in one voice I can't shake. Scottish and northern settings especially welcome.",
      ["Query letter", "First 50 pages"], "greyfriarsagency.co.uk", 9),
    ca("dvfx-ps", "Priya Sandhu", "Northlight Literary", "Manchester", "GB", 10, E, true, 31, 22, ["Literary Fiction", "Upmarket", "Crime & Thriller"],
      "Literary fiction with a working-class heart and a close third that gets right under the skin. I want to be moved and I want it to be funny.",
      ["Query letter", "Synopsis", "First 10,000 words"], "northlightliterary.com", 4),
    ca("dvfx-ho", "Hal Okonjo", "Coldharbour & Vane", "London", "GB", 12, F, true, 12, 6, ["Literary Fiction", "Crime & Thriller", "Non-fiction"],
      "Open to most literary fiction with a strong sense of place. Less keen on campus novels or anything set in publishing.",
      ["Query letter", "Synopsis", "First 3 chapters"], "coldharbourvane.com", 15),
    ca("dvfx-md", "Marguerite Delacroix", "Quill & Fathom", "Bristol", "GB", 8, E, false, 8, 4, ["Book Club Fiction", "Literary Fiction", "Historical"],
      "Big-hearted book club reads and literary novels with a hook. Boats, tides, islands — I grew up on one and I never say no to the sea.",
      ["Query letter", "First 3 chapters"], "quillandfathom.co.uk", 7),
    ca("dvfx-sf", "Sam Ferrier", "Larkspur Literary", "Dublin", "IE", 4, E, false, 5, 3, ["Literary Fiction", "Irish Fiction", "Short Stories"],
      "Irish and British literary fiction. I have a weakness for stories about fathers and sons who can't say the thing. Short story collections welcome alongside a novel.",
      ["Query letter", "Synopsis", "First 3 chapters"], "larkspurliterary.ie", 3),
  ];

  const PASSED: CommunityAgent[] = [
    ca("dvfx-rv", "Rosalind Vane", "Harrow & Finch", "London", "GB", 12, E, true, 14, 7, ["Literary Fiction", "Historical"], "Historical fiction with a literary edge; anything set before 1900.", ["Query letter", "Synopsis", "First 3 chapters"], "harrowfinch.co.uk", 16),
    ca("dvfx-dm", "Dev Mistry", "Ashgrove Literary", "Leeds", "GB", 6, E, false, 9, 5, ["Literary Fiction", "Crime & Thriller"], "Propulsive literary crime; I like a plot.", ["Query letter", "First 50 pages"], "ashgrovelit.com", 12),
    ca("dvfx-hs", "Helena Strand", "Strand & Partners", "London", "GB", 8, F, true, 21, 12, ["Literary Fiction", "Upmarket"], "Upmarket fiction with a big emotional engine.", ["Query letter", "Synopsis", "First 3 chapters"], "strandpartners.co.uk", 18),
    ca("dvfx-om", "Oisín Murray", "Blackwater Agency", "Cork", "IE", 10, E, false, 6, 2, ["Literary Fiction", "Irish Fiction"], "Irish voices, rural settings, dark humour.", ["Query letter", "First 3 chapters"], "blackwateragency.ie", 10),
    ca("dvfx-cp", "Clare Pennock", "Lantern Row", "Norwich", "GB", 8, E, true, 11, 6, ["Book Club Fiction", "Literary Fiction"], "Warm book club novels with something to say.", ["Query letter", "Synopsis", "First 10,000 words"], "lanternrow.co.uk", 5),
  ];

  /** Nine agents the fixture writer has already added (so the header's "Added" row has something to count). */
  const ADDED: CommunityAgent[] = ["bh", "jl", "rk", "am", "cw", "fo", "ln", "pd", "sg"].map((k, i) =>
    ca(`dvfx-add-${k}`, `Added Agent ${i + 1}`, `Fixture Agency ${i + 1}`, "London", "GB", 8, E, false, 3, 1, ["Literary Fiction"], "", ["Query letter"], "", 20));

  const FIXTURE_MS: Manuscript = {
    id: "dvfx-ms", userId: "dvfx", title: "Murphy's Day Out", genre: "Literary Fiction", subGenres: ["Book Club Fiction"], ageCategory: "Adult",
    wordCount: 82000, logline: "A family day out on the coast turns into a reckoning with memory, grief and the communities that hold us.",
    comps: [], status: ManuscriptStatus.QUERYING, statusChangedDate: daysAgo(40),
  } as Manuscript;

  /** Three agents on the fixture writer's list that are not in the catalogue — the share notice's subject. */
  const FIXTURE_AGENTS: Agent[] = [
    { id: "dvfx-mine-1", name: "Ruth Calder", agency: "Calder & Lyle", website: "calderlyle.co.uk", genres: ["Literary Fiction"], mswlNotes: "Character-led literary fiction.", responseTimeWeeks: 8, noResponseMeansNo: true, notes: "Met at a festival — private." } as unknown as Agent,
    { id: "dvfx-mine-2", name: "Joe Pask", agency: "Pask Literary", genres: ["Crime"], responseTimeWeeks: 6 } as unknown as Agent,
    { id: "dvfx-mine-3", name: "Anya Brook", agency: "Brookside", genres: ["Book Club Fiction"] } as unknown as Agent,
  ];
  return { NOW, PICKS, PASSED, ADDED, FIXTURE_MS, FIXTURE_AGENTS };
}

export interface ReviewFixture { catalogue: CommunityAgent[]; agents: Agent[]; manuscript: Manuscript; decisions: ScoutDecision[] }

export function reviewFixture(state: ReviewState): ReviewFixture {
  const { NOW, PICKS, PASSED, ADDED, FIXTURE_MS, FIXTURE_AGENTS } = fixtureData();
  const added = ADDED.map((a, i): ScoutDecision => ({ id: a.id, ...decisionDoc("added", NOW - (30 - i) * 86_400_000, FIXTURE_MS.id) }));
  const passed = PASSED.map((a, i): ScoutDecision => ({ id: a.id, ...decisionDoc("passed", NOW - (20 - i) * 86_400_000, FIXTURE_MS.id) }));
  if (state === "none") return { catalogue: [], agents: FIXTURE_AGENTS, manuscript: FIXTURE_MS, decisions: [] };
  const catalogue = [...PICKS, ...PASSED, ...ADDED];
  const decisions = state === "done"
    ? [...added, ...passed, ...PICKS.map((a, i): ScoutDecision => ({ id: a.id, ...decisionDoc("added", NOW - (10 - i) * 86_400_000, FIXTURE_MS.id) }))]
    : [...added, ...passed];
  return { catalogue, agents: FIXTURE_AGENTS, manuscript: FIXTURE_MS, decisions };
}

/** The in-memory store: the same interface as the Firestore one, and no write leaves the tab. */
export function memoryIO(start: ScoutDecision[]): ScoutIO {
  let decisions = start.slice();
  let shares = new Set<string>();
  const dl = new Set<(d: ScoutDecision[]) => void>();
  const sl = new Set<(s: Set<string>) => void>();
  const emit = () => { dl.forEach((f) => f(decisions.slice())); sl.forEach((f) => f(new Set(shares))); };
  const put = (d: ScoutDecision) => { decisions = [...decisions.filter((x) => x.id !== d.id), d]; };
  const drop = (id: string) => { decisions = decisions.filter((x) => x.id !== id); };
  return {
    subscribe(onD, onS) { dl.add(onD); sl.add(onS); queueMicrotask(emit); return () => { dl.delete(onD); sl.delete(onS); }; },
    async writeDecision(d) { put(d); emit(); },
    async restoreDecision(caId, before) { if (before) put(before); else drop(caId); emit(); },
    async bringBack(caId) { drop(caId); emit(); },
    async add(c) { return { ok: true, agentId: `dvfx-made-${c.id}` }; },
    async undoAdd(_agentId, caId, before) { if (before) put(before); else drop(caId); emit(); },
    scheduleIncrement() {}, cancelIncrement() {}, flushIncrements() {},
    async share(agents) { shares = new Set([...shares, ...agents.map((a) => a.id)]); emit(); return { shared: agents.map((a) => a.id), failed: [] }; },
    async setPrefs() {},
  };
}

/* ── The page's one entry ─────────────────────────────────────────────── */

export interface DevAid { face: "soon" | "live" | null; fixture: ReviewFixture | null; memory: ScoutIO | null; holdMs: number }

/**
 * Everything the page needs from the aid, in one call — so the page names this module only inside
 * `import.meta.env.MODE !== "production" ? devAid() : …`, a branch a production build folds away whole.
 * ⚠️ AN EARLY RETURN IS NOT ENOUGH: `if (MODE === "production") return …; reviewFixture(…)` kept the fixture in the
 *    production bundle (lock E1 found it); a ternary on the build constant is what the minifier drops.
 */
export function devAid(): DevAid {
  const st = reviewState();
  const holdMs = reviewHoldMs();
  if (st === "empty") return { face: "soon", fixture: null, memory: null, holdMs };
  if (st) { const fixture = reviewFixture(st); return { face: "live", fixture, memory: memoryIO(fixture.decisions), holdMs }; }
  return { face: reviewLive() ? "live" : null, fixture: null, memory: null, holdMs };
}
