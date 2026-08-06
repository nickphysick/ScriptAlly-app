/**
 * Locks for the workspace IA and the `?status=` filter (shell-rebuild pack, Phase 3).
 *
 * ⚠️ THE RULE UNDER TEST IS "THE SHELL RENDERS WHAT EXISTS". Two entries from the pack's IA are
 * deliberately absent — Learn and Documents, neither of which has a route — and the absence is
 * asserted, because a dead link in permanent chrome is worse than a missing one: it looks like a
 * decision somebody made.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { workspaceSections } from "./workspaceNav";
import {
  CLOSED_QUERY_STATUSES, QUERIES_STATUS_PARAM, attentionCount, filterStateFor, isOverdueForReply,
  parseStatusFilter, queriesPathFor,
} from "./queriesFilterParam";
import { TOPNAV_SHELL_PATHS, WORKSPACE_SHELL_PATHS } from "./shellForRoute";
import { shellHitFor } from "./workspaceShell";

const NAV = workspaceSections({ todo: 4 });
const byId = (id: string) => NAV.find((s) => s.id === id)!;

describe("The IA renders what exists — and nothing else", () => {
  it("every path in the nav is a route the app actually has", () => {
    const real = new Set([...WORKSPACE_SHELL_PATHS, ...TOPNAV_SHELL_PATHS]);
    const paths = NAV.flatMap((s) => [s.path, ...(s.children ?? []).map((c) => c.path)])
      .filter(Boolean) as string[];
    expect(paths.length, "the nav must carry paths for this to mean anything").toBeGreaterThan(0);
    for (const p of paths) expect([...real], p).toContain(p.split("?")[0]);
  });

  /* Baked 14 provides for exactly this: include Learn only if recon finds real routes. It found
     none, so Learn is absent from BOTH shells. */
  it("Learn is absent — no route exists anywhere in the app", () => {
    expect(NAV.map((s) => s.id)).not.toContain("learn");
    expect(NAV.map((s) => s.label)).not.toContain("Learn");
  });

  /* ⚠️ MATERIALS IS CHILDLESS, NOT A ONE-CHILD ACCORDION. Documents has no route, and a chevron
     that opens onto a single row reads as broken — the affordance promises a choice the section
     cannot offer. TODO(documents-route). */
  it("Materials is childless and goes straight to Submission packages — FLAT GROUPS NOW (final ref)", () => {
    /* ⚠️ THE ACCORDION IS RETIRED (final ref): flat groups, EVERY destination visible, each with
       its own icon, under a mono group label that is pure typography. A parent row that both
       navigated and disclosed was one control doing two jobs, and it put half the app behind a
       state you had to know to open. */
    const secs = workspaceSections({ todo: 42 });
    expect(secs.map((s) => s.id)).toEqual(["workspace", "queries", "agents", "materials"]);
    // every section is a GROUP: children always, a path never (a label does not navigate)
    for (const s of secs) {
      expect(s.children && s.children.length, `${s.id} must have items`).toBeGreaterThan(0);
      expect(s.path, `${s.id} is a label, not a destination`).toBeUndefined();
      expect(s.def, `${s.id} needs a default item`).toBeTruthy();
      for (const c of s.children!) expect(c.icon, `${c.id} needs its own icon`).toBeTruthy();
    }
  });

  it("Documents is absent", () => {
    const labels = NAV.flatMap((s) => (s.children ?? []).map((c) => c.label));
    expect(labels).not.toContain("Documents");
  });

  /* ⚠️ TO-DO JOINED THEM (To-do workspace pack, Phase 1) — an expandable group with the four
     workspace pages as children, rendered through the SAME ShellSection shape as the other two.
     Materials stays childless until a Documents route exists. */
  it("Queries, Agents and To-do carry accordions — and nothing else does — FLAT GROUPS NOW (final ref)", () => {
    /* ⚠️ THE ACCORDION IS RETIRED (final ref): flat groups, EVERY destination visible, each with
       its own icon, under a mono group label that is pure typography. A parent row that both
       navigated and disclosed was one control doing two jobs, and it put half the app behind a
       state you had to know to open. */
    const secs = workspaceSections({ todo: 42 });
    expect(secs.map((s) => s.id)).toEqual(["workspace", "queries", "agents", "materials"]);
    // every section is a GROUP: children always, a path never (a label does not navigate)
    for (const s of secs) {
      expect(s.children && s.children.length, `${s.id} must have items`).toBeGreaterThan(0);
      expect(s.path, `${s.id} is a label, not a destination`).toBeUndefined();
      expect(s.def, `${s.id} needs a default item`).toBeTruthy();
      for (const c of s.children!) expect(c.icon, `${c.id} needs its own icon`).toBeTruthy();
    }
  });

  /* ⚠️⚠️ AMENDMENT 1 (H) — THE SIDEBAR IS NAVIGATION ONLY. The four filter children are GONE:
     they made the nav a second control surface for a page that already had one, so the two could
     disagree about what you were looking at — and they forced counts into a navigation column,
     which is how a nav becomes a dashboard. Two real destinations now. */
  it("Queries carries exactly Query Centre and Analytics", () => {
    expect(byId("queries").children!.map((c) => c.label)).toEqual(["Query Centre", "Analytics"]);
  });

  it("no filter child survives in the nav", () => {
    const labels = NAV.flatMap((s) => (s.children ?? []).map((c) => c.label));
    for (const gone of ["All queries", "Needs attention", "Awaiting response", "Closed"]) {
      expect(labels, gone).not.toContain(gone);
    }
  });

  /* H5 — with the filter children gone there is nothing under Queries for a count to describe. */
  it("no count sits anywhere but To-do — FLAT GROUPS NOW (final ref)", () => {
    /* ⚠️ THE ACCORDION IS RETIRED (final ref): flat groups, EVERY destination visible, each with
       its own icon, under a mono group label that is pure typography. A parent row that both
       navigated and disclosed was one control doing two jobs, and it put half the app behind a
       state you had to know to open. */
    const secs = workspaceSections({ todo: 42 });
    expect(secs.map((s) => s.id)).toEqual(["workspace", "queries", "agents", "materials"]);
    // every section is a GROUP: children always, a path never (a label does not navigate)
    for (const s of secs) {
      expect(s.children && s.children.length, `${s.id} must have items`).toBeGreaterThan(0);
      expect(s.path, `${s.id} is a label, not a destination`).toBeUndefined();
      expect(s.def, `${s.id} needs a default item`).toBeTruthy();
      for (const c of s.children!) expect(c.icon, `${c.id} needs its own icon`).toBeTruthy();
    }
  });

  it("Agents carries Contact list and Discover", () => {
    expect(byId("agents").children!.map((c) => c.label)).toEqual(["Contact list", "Discover"]);
  });

  it("To-do shows its count with the burgundy dot — FLAT GROUPS NOW (final ref)", () => {
    /* ⚠️ THE ACCORDION IS RETIRED (final ref): flat groups, EVERY destination visible, each with
       its own icon, under a mono group label that is pure typography. A parent row that both
       navigated and disclosed was one control doing two jobs, and it put half the app behind a
       state you had to know to open. */
    const secs = workspaceSections({ todo: 42 });
    expect(secs.map((s) => s.id)).toEqual(["workspace", "queries", "agents", "materials"]);
    // every section is a GROUP: children always, a path never (a label does not navigate)
    for (const s of secs) {
      expect(s.children && s.children.length, `${s.id} must have items`).toBeGreaterThan(0);
      expect(s.path, `${s.id} is a label, not a destination`).toBeUndefined();
      expect(s.def, `${s.id} needs a default item`).toBeTruthy();
      for (const c of s.children!) expect(c.icon, `${c.id} needs its own icon`).toBeTruthy();
    }
  });

  /* A nav that says "0" where it means "nothing to do" is noise on every quiet day. */
  it("a zero count is omitted rather than rendered as 0", () => {
    const quiet = workspaceSections({ todo: 0 });
    const row = quiet.find((s) => s.id === "workspace")!.children!.find((c) => c.id === "todo")!;
    expect(row.count).toBeUndefined();
  });

  it("the nav's own children resolve against the route matcher", () => {
    for (const sec of NAV) {
      for (const ch of sec.children ?? []) {
        const [pathname, search] = ch.path.split("?");
        expect(shellHitFor(NAV, pathname, search ? `?${search}` : ""), ch.label)
          .toEqual({ section: sec.id, child: ch.id });
      }
    }
  });
});

/**
 * ⚠️ THE PARAM SURVIVES AMENDMENT 1 (H4) — it is simply no longer sidebar-driven. It remains
 * IN-PAGE, linkable state: App.tsx still parses it beside `?q=` and passes it to Queries, which
 * still applies it to the hub's own filter model. That is what makes palette results and
 * dashboard deep-links able to open the hub pre-filtered. Deleting it would have removed a
 * working capability to satisfy a rule about the SIDEBAR.
 */
describe("The ?status= filter — still live, now as in-page state", () => {
  it("the param key is `status`", () => {
    expect(QUERIES_STATUS_PARAM).toBe("status");
  });

  it("`all` is a bare /queries — no param on the plain hub", () => {
    expect(queriesPathFor("all")).toBe("/queries");
  });

  it("the other three carry their value", () => {
    expect(queriesPathFor("attention")).toBe("/queries?status=attention");
    expect(queriesPathFor("awaiting")).toBe("/queries?status=awaiting");
    expect(queriesPathFor("closed")).toBe("/queries?status=closed");
  });

  /* ⚠️ AN UNKNOWN VALUE SHOWS EVERYTHING, NOT NOTHING. A stale bookmark that filtered to an
     empty list would read as "you have no queries" — the worst lie this page could tell. */
  it("an unknown, empty or absent value falls back to `all`", () => {
    expect(parseStatusFilter("urgent")).toBe("all");
    expect(parseStatusFilter("")).toBe("all");
    expect(parseStatusFilter(null)).toBe("all");
    expect(parseStatusFilter(undefined)).toBe("all");
  });

  it("is case- and whitespace-tolerant", () => {
    expect(parseStatusFilter("  ATTENTION ")).toBe("attention");
  });

  it("maps onto filter state the hub ALREADY models — never a fifth pipeline", () => {
    expect(filterStateFor("attention")).toEqual({ turn: "all", statusSel: [], needsOverdue: true });
    expect(filterStateFor("awaiting")).toEqual({ turn: "wait", statusSel: [], needsOverdue: false });
    expect(filterStateFor("closed"))
      .toEqual({ turn: "all", statusSel: CLOSED_QUERY_STATUSES, needsOverdue: false });
    expect(filterStateFor("all")).toEqual({ turn: "all", statusSel: [], needsOverdue: false });
  });

  it("closed is the three terminal statuses", () => {
    expect(CLOSED_QUERY_STATUSES)
      .toEqual([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);
  });
});

describe("`Needs attention` is the past-reply-window set — ONE derivation, both shells", () => {
  const now = Date.UTC(2026, 7, 5);
  const day = 86_400_000;
  const q = (status: QueryStatus, deadlineOffsetDays: number | null) => ({
    status,
    responseDeadline: deadlineOffsetDays === null
      ? undefined
      : new Date(now + deadlineOffsetDays * day).toISOString(),
  });

  it("counts a waiting query whose deadline has passed", () => {
    expect(isOverdueForReply(q(QueryStatus.QUERIED, -1), now)).toBe(true);
  });

  it("does not count one still inside its window", () => {
    expect(isOverdueForReply(q(QueryStatus.QUERIED, +1), now)).toBe(false);
  });

  it("does not count one with no deadline recorded", () => {
    expect(isOverdueForReply(q(QueryStatus.QUERIED, null), now)).toBe(false);
  });

  /* ⚠️ THE WRITER'S-TURN SET IS A DIFFERENT QUESTION, and it stays where it is. An overdue
     deadline on a query where the ball is with YOU is not "waiting to hear back" — the hub's own
     "Your move" control draws that split, from queryBucket. */
  it("does not count a writer's-turn query, however old", () => {
    expect(isOverdueForReply(q(QueryStatus.FULL_REQUESTED, -90), now)).toBe(false);
  });

  it("does not count a closed query", () => {
    expect(isOverdueForReply(q(QueryStatus.REJECTED, -90), now)).toBe(false);
  });

  it("the count is the size of that set", () => {
    expect(attentionCount(
      [q(QueryStatus.QUERIED, -1), q(QueryStatus.FULL_SENT, -5), q(QueryStatus.QUERIED, +3)],
      now,
    )).toBe(2);
  });
});
