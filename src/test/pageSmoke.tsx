/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE SHARED HARNESS FOR PAGE SMOKE TESTS — the tripwire for a page that does not load.
 *
 * Every page test in this repo reads SOURCE. A source-string test cannot see a runtime crash, and
 * this app has shipped one: a `const` declared BELOW a component's `return` was read by the JSX
 * above it, sat in the temporal dead zone, and threw a ReferenceError on every render — through a
 * fully green suite, on a page carrying a warning comment against exactly that mistake.
 *
 * So these tests RENDER. `renderToStaticMarkup`, the db hook mocked to an empty-but-complete
 * state, effects not running (which is fine — TDZ, undefined reads and bad destructures all live
 * on the pure render path).
 *
 * ⚠️ ASSERT ALMOST NOTHING ABOUT APPEARANCE. These are tripwires, not design tests. A smoke that
 * pins layout becomes the next false red, and a false red that fires on every honest change is
 * how a suite stops being read. One distinctive chrome string per page is the whole contract:
 * enough to prove the page is not an empty shell that merely failed to crash.
 *
 * Usage — vi.mock is hoisted, so each test file declares its own mocks and points them here:
 *
 *   vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
 *   vi.mock("../toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());
 *
 * then calls `renderPage(<SomePage … />)`.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan, QueryStatus, ManuscriptStatus, SubmissionStatus, SubmissionMethod } from "../types";

/**
 * ⚠️ `localStorage` DOES NOT EXIST in this repo's node test environment, and several pages read a
 * persisted preference during render (the active-manuscript key above all). A page that throws
 * here is not telling us anything about itself, so the harness supplies an in-memory one as a
 * module side effect — it runs on import, which is before any render.
 *
 * Deliberately EMPTY at the start of each file: a smoke that depended on a stored value would be
 * asserting the store, not the page.
 */
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    },
  });
}

/** The signed-in user every smoke renders as: complete, free plan, nothing pending. */
export const SMOKE_USER = {
  id: "smoke-user",
  name: "Nick Physick",
  email: "smoke@example.com",
  plan: UserPlan.FREE,
  onboardingComplete: true,
  queriesTheme: "cappuccino",
  homeCountry: "GB",
};

/**
 * The empty-but-complete db state. Every COLLECTION is listed explicitly — a page that maps over
 * one must get an array, not a stand-in. Everything else (the ~50 write methods) falls through the
 * proxy below to an async no-op, so this stub does not need editing every time the context grows.
 */
const DB_DATA: Record<string, unknown> = {
  currentUser: SMOKE_USER,
  authReady: true,
  collectionsReady: true,
  smartImportUsage: null,
  manuscripts: [],
  versions: [],
  packages: [],
  agents: [],
  communityAgents: [],
  queries: [],
  activities: [],
  journalEntries: [],
  notes: [],
  dismissedTasks: [],
  taskFlags: [],
  tasks: [],
  userTasks: [],
};

const asyncNoop = async () => undefined;

/**
 * ⚠️ The proxy answers UNKNOWN keys with an async no-op, deliberately. The alternative — an
 * explicit list of every method — rots the day someone adds one, and the failure would be a
 * confusing render crash inside an unrelated page rather than a clear "you forgot the stub".
 * Known data keys always win, so a collection can never come back as a function.
 */
export const dbStub: Record<string, unknown> = new Proxy(DB_DATA, {
  get(target, key) {
    if (typeof key === "symbol") return undefined;
    if (key in target) return target[key as string];
    return asyncNoop;
  },
  has: () => true,
});

/**
 * ⚠️ ONE SEEDED RECORD OF EACH KIND — because an empty page and a populated page are OFTEN NOT THE
 * SAME COMPONENT. Dashboard, Queries and the Agent list each branch to a first-run state when
 * there is nothing to show; smoking only the empty state would leave the render path that
 * actually derives things — the one where a TDZ or a bad destructure lives — never executed.
 *
 * Deliberately the thinnest record that satisfies the types. This is not a fixture library: a
 * smoke that needed rich data to pass would be asserting the data.
 *
 * ⚠️ EVERY STATUS COMES FROM ITS ENUM, never a hand-typed string. The first draft of this seed
 * used `status: "Query Sent"` — not a `QueryStatus` value — and the page rendered perfectly while
 * quietly counting the query into no bucket at all. A seed that no derivation recognises tests the
 * empty path twice and reports it as coverage of the populated one.
 */
const SEED_MANUSCRIPT = {
  id: "m1", userId: SMOKE_USER.id, title: "The Smoke Test", genre: "Literary Fiction",
  ageCategory: "Adult", wordCount: 82000, logline: "A page that would not load.",
  /* ⚠️ ONE REAL COMP, NOT `[]` — and this block's own warning above is why. Comparable titles
     branches on the comps COUNT: at zero it renders a first-visit marketing state and none of its
     derivations run, so an empty seed tested the empty path twice and reported it as coverage of
     the populated one. The entry carries a year and an axis because `compAgeLine` and `compFacets`
     both read them; a title-only comp would leave those two unexecuted. */
  comps: [{ title: "The Smoke Comp", author: "A N Author", year: 2021, media: "book", matchAxis: "structure · tone" }],
  status: ManuscriptStatus.QUERYING, statusChangedDate: "2026-01-05T00:00:00.000Z",
  createdDate: "2026-01-01T00:00:00.000Z",
};

const SEED_AGENT = {
  id: "a1", userId: SMOKE_USER.id, name: "Ada Reader", agency: "Reader & Co",
  email: "ada@example.com", website: "https://example.com", country: "GB", city: "London",
  genres: ["Literary Fiction"], mswlNotes: "", starRating: 4,
  submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  responseTimeWeeks: 8, materialsWanted: ["Query Letter"],
  dateAdded: "2026-01-02T00:00:00.000Z", lastCheckedDate: "2026-01-02T00:00:00.000Z",
};

const SEED_QUERY = {
  id: "q1", userId: SMOKE_USER.id, manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.QUERIED, dateSent: "2026-01-10T00:00:00.000Z", personalisationNotes: "",
  sendMethod: SubmissionMethod.EMAIL, responseDeadline: "2026-03-07T00:00:00.000Z",
  materialsWanted: ["Query Letter"],
};

/** The db stub with one manuscript, one agent and one query — the populated render path. */
export const seededDbStub: Record<string, unknown> = new Proxy(
  { ...DB_DATA, manuscripts: [SEED_MANUSCRIPT], agents: [SEED_AGENT], queries: [SEED_QUERY] },
  {
    get(target, key) {
      if (typeof key === "symbol") return undefined;
      if (key in target) return target[key as string];
      return asyncNoop;
    },
    has: () => true,
  },
);

/**
 * Strip `//` lines and block comments from a source string before matching against it.
 *
 * ⚠️ AN ABSENCE LOCK MUST NOT READ ITS OWN EXPLANATION. Tests that assert something is GONE are
 * routinely written next to a comment recording what went and why — so the comment necessarily
 * names the forbidden thing, the lock fails on its own documentation, and the obvious response to
 * that false alarm is to delete the explanation. Code is what these locks are about; prose about
 * code is not code.
 */
export const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

/**
 * ⚠️ THE SIGNED-OUT STUB — `currentUser: null`, the state a public route actually meets.
 *
 * Every other stub here supplies `SMOKE_USER`, which is right for workspace pages (they are all
 * behind the auth gate) and WRONG for the marketing tier. That gap had a cost: `/pricing` opened
 * with `if (!currentUser) return null`, so a logged-out visitor got an empty page inside the
 * marketing chrome — and its smoke test rendered it under a mock that always supplied a user, so
 * the test passed on a page that showed nothing. A public route must be smoked logged OUT.
 */
export const signedOutDbStub: Record<string, unknown> = new Proxy(
  { ...DB_DATA, currentUser: null },
  {
    get(target, key) {
      if (typeof key === "symbol") return undefined;
      if (key in target) return target[key as string];
      return asyncNoop;
    },
    has: () => true,
  },
);

/**
 * Factory for `vi.mock("…/lib/db", …)`.
 *
 * The hook reads a module-level switch rather than taking an argument, because `vi.mock` is
 * hoisted and its factory cannot close over anything a test sets later. `useSignedOutDb()` flips
 * it, so ONE test file can cover both the logged-out and signed-in renders of the same route.
 */
let seeded = false;
let signedOut = false;

/** Render as a logged-out visitor until `restoreSmokeUser()`. Pair them in beforeEach/afterEach. */
export const useSignedOutDb = () => { signedOut = true; };
export const restoreSmokeUser = () => { signedOut = false; };

export const dbMock = () => ({
  useScriptAllyDb: () => (signedOut ? signedOutDbStub : seeded ? seededDbStub : dbStub),
  DbProvider: ({ children }: { children?: React.ReactNode }) => children as React.ReactElement,
});

/**
 * Factory for `vi.mock("…/toast/ToastProvider", …)`. The real provider portals to `document.body`,
 * which does not exist under this repo's node test environment — so it is stubbed rather than
 * wrapped. (Its own behaviour is covered by its own tests.)
 */
export const toastMock = () => ({
  useToast: () => ({ showToast: () => {}, showConfirm: () => {} }),
  ToastProvider: ({ children }: { children?: React.ReactNode }) => children as React.ReactElement,
});

/**
 * Factory for `vi.mock("…/lib/firebase", …)`.
 *
 * ⚠️ `lib/firebase` calls `initializeApp` and `getAuth` AT MODULE LOAD, so merely importing a page
 * that touches Firestore directly throws `auth/invalid-api-key` under the test env — before any
 * component runs. The four names it exports are stubbed; nothing in a static render calls them.
 */
export const firebaseMock = () => ({
  db: {},
  auth: {},
  handleFirestoreError: () => {},
  OperationType: {
    CREATE: "create", UPDATE: "update", DELETE: "delete",
    LIST: "list", GET: "get", WRITE: "write",
  },
});

/** Render a page inside the router every page assumes, against the EMPTY state. */
export function renderPage(node: React.ReactNode, route = "/dashboard"): string {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>);
}

/**
 * Render against the POPULATED state (one manuscript, one agent, one query).
 *
 * The flag is reset in a `finally` rather than by the caller: a leaked `seeded = true` would
 * silently turn a later file's empty-state smoke into a populated one, and both would still pass —
 * which is precisely the kind of quiet wrongness this pack exists to remove.
 */
export function renderPageSeeded(node: React.ReactNode, route = "/dashboard"): string {
  seeded = true;
  try {
    return renderToStaticMarkup(<MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>);
  } finally {
    seeded = false;
  }
}

/** The no-op navigate bridge pages take as a prop. */
export const noNavigate = () => {};

/** The id of the seeded manuscript — for the pages that scope themselves through localStorage. */
export const SEED_MANUSCRIPT_ID = "m1";

/**
 * Point the shared active-manuscript key at the seeded manuscript.
 *
 * ⚠️ Comparable titles and the Package Workshop scope themselves through
 * `scriptally_active_manuscript_id`, NOT through a prop — so seeding the db alone leaves them on
 * their "no manuscript yet" branch and the populated render never runs. A smoke that passed there
 * would be reporting the empty path twice.
 */
export const setActiveManuscript = (id: string | null = SEED_MANUSCRIPT_ID) => {
  if (id === null) localStorage.removeItem("scriptally_active_manuscript_id");
  else localStorage.setItem("scriptally_active_manuscript_id", id);
};
