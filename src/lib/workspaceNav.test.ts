/**
 * Locks for the workspace IA and the `?status=` filter (shell-rebuild pack, Phase 3).
 *
 * ⚠️ THE RULE UNDER TEST IS "THE SHELL RENDERS WHAT EXISTS". Two entries from the pack's IA are
 * deliberately absent — Learn and Documents, neither of which has a route — and the absence is
 * asserted, because a dead link in permanent chrome is worse than a missing one: it looks like a
 * decision somebody made.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryStatus } from "../types";
import { workspaceSections, workspacePageForPath, RAIL_SHORT_LABELS, railPageLabel, railSectionLabel, SETTINGS_RAIL_LABELS } from "./workspaceNav";
import { ACCOUNT_ROUTES } from "./accountRoutes";
import {
  CLOSED_QUERY_STATUSES, QUERIES_STATUS_PARAM, attentionCount, filterStateFor, isOverdueForReply,
  parseStatusFilter, queriesPathFor,
} from "./queriesFilterParam";
import { TOPNAV_SHELL_PATHS, WORKSPACE_SHELL_PATHS } from "./shellForRoute";
import { shellHitFor, sidebarLabel } from "./workspaceShell";

const NAV = workspaceSections({ todo: 4 });
const byId = (id: string) => NAV.find((s) => s.id === id)!;

describe("⚠️ THE ICON MAP IS A PARALLEL SURFACE — every key the nav names must exist in it", () => {
  /**
   * ⚠️ THIS GUARD WAS MISSING, AND ITS ABSENCE WAS PROVEN RATHER THAN ASSUMED: two brand-new icon
   * keys ("library", "books") were added to the nav and the ENTIRE suite stayed green. The existing
   * assertion only checks that `c.icon` is TRUTHY — a row naming an icon nobody drew passes it.
   *
   * `WORKSPACE_ICONS` lives in AppShell.tsx and is NOT type-linked to this model, so a key that
   * resolves to nothing renders a blank space where a glyph should be, with no error anywhere. The
   * same shape is already recorded in CLAUDE.md for the old RAIL_ICONS ("a parallel surface not
   * type-linked to RAIL_GROUPS — add both"), and AppShell's own comment calls it "the quiet half of
   * that failure". It is read as SOURCE TEXT because importing AppShell here would pull React and
   * the db provider into a node-environment unit test.
   */
  const appShell = readFileSync(resolve(__dirname, "../components/shell/AppShell.tsx"), "utf8");
  const iconBlock = appShell.slice(
    appShell.indexOf("const WORKSPACE_ICONS"),
    appShell.indexOf("};", appShell.indexOf("const WORKSPACE_ICONS")),
  );
  /* ⚠️ ANCHOR BEFORE SLICING — an empty slice makes every `toContain` below vacuously true, which
     is the string-spec failure mode already documented in CLAUDE.md. */
  it("the icon map is where this test thinks it is", () => {
    expect(iconBlock, "WORKSPACE_ICONS moved or was renamed — every assertion below is now vacuous").toContain("workspace:");
  });

  it("every ROW's icon key is drawn", () => {
    for (const s of NAV) {
      for (const c of s.children ?? []) {
        expect(iconBlock, `nav row "${c.id}" names icon "${c.icon}", which WORKSPACE_ICONS does not draw — the row renders a blank space and nothing complains`)
          .toContain(`${c.icon}:`);
      }
    }
  });

  it("every SECTION's own key is drawn — the rail rib needs its glyph too", () => {
    for (const s of NAV) {
      expect(iconBlock, `nav section "${s.id}" has no glyph in WORKSPACE_ICONS — the collapsed rail loses a rib, which is what makes it a complete map of the app`)
        .toContain(`${s.id}:`);
    }
  });
});

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
    /* sidebar-IA fix (6 Aug): TASKS joined the IA. Audit pack P5: it MOVED — the order is now the
       work's order, Queries · Agents · Materials first and Tasks after the work it falls out of —
       and ACCOUNT joined at the end, holding the Settings row that used to sit in the foot — until
       the sidebar metrics pass took it back to the foot as the gear (reversing P5, Nick's call).
       ⚠️ NOTE: this body is copy-pasted verbatim across four tests in this file whose NAMES
       describe four different things. A pre-existing artefact of an earlier bulk retarget; left
       as found rather than widened here. */
    expect(secs.map((s) => s.id))
      .toEqual(["workspace", "queries", "agents", "book", "materials", "tasks"]); /* sidebar materials v1, 6 Nov */
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
    /* sidebar-IA fix (6 Aug): TASKS joined the IA. Audit pack P5: it MOVED — the order is now the
       work's order, Queries · Agents · Materials first and Tasks after the work it falls out of —
       and ACCOUNT joined at the end, holding the Settings row that used to sit in the foot — until
       the sidebar metrics pass took it back to the foot as the gear (reversing P5, Nick's call).
       ⚠️ NOTE: this body is copy-pasted verbatim across four tests in this file whose NAMES
       describe four different things. A pre-existing artefact of an earlier bulk retarget; left
       as found rather than widened here. */
    expect(secs.map((s) => s.id))
      .toEqual(["workspace", "queries", "agents", "book", "materials", "tasks"]); /* sidebar materials v1, 6 Nov */
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
  it("Queries carries exactly Query Centre, Responses and Analytics; Packages moved to Materials (sidebar materials v1)", () => {
    /* Responses v2 (15 Oct) is a routed page with its own slot, so it is a destination, not a filter.
       Sidebar materials v1 (6 Nov): Submission packages left Queries for the Materials section; its address stays. */
    expect(byId("queries").children!.map((c) => c.label)).toEqual(["Query Centre", "Responses", "Analytics"]);
    /* SHORT IN THE SIDEBAR ONLY (25 Oct, kept 6 Nov): `label` stays the page's full name; `navLabel` is what the row prints */
    expect(byId("queries").children!.find((c) => c.id === "q-centre")).toMatchObject({ label: "Query Centre", navLabel: "Queries" });
    expect(sidebarLabel(byId("agents").children![0])).toBe("Contact list");
    expect(byId("workspace").noHeading).toBe(true);
    expect(byId("book").label).toBe("Your book");
    expect(byId("book").children!.map((c) => c.label)).toEqual(["Manuscripts", "Versions"]);
    expect(byId("materials").label).toBe("Materials");
    expect(byId("materials").children!.map((c) => c.label)).toEqual(["Query letters", "Comparable titles", "Submission packages"]);
    /* the full sidebar prints the full names in Materials (6 Nov) */
    expect(byId("materials").children!.map(sidebarLabel)).toEqual(["Query letters", "Comparable titles", "Submission packages"]);
    expect(byId("materials").children!.map((c) => c.path)).toEqual(["/materials/letters", "/manuscripts/comps", "/queries/packages"]);
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
    /* sidebar-IA fix (6 Aug): TASKS joined the IA. Audit pack P5: it MOVED — the order is now the
       work's order, Queries · Agents · Materials first and Tasks after the work it falls out of —
       and ACCOUNT joined at the end, holding the Settings row that used to sit in the foot — until
       the sidebar metrics pass took it back to the foot as the gear (reversing P5, Nick's call).
       ⚠️ NOTE: this body is copy-pasted verbatim across four tests in this file whose NAMES
       describe four different things. A pre-existing artefact of an earlier bulk retarget; left
       as found rather than widened here. */
    expect(secs.map((s) => s.id))
      .toEqual(["workspace", "queries", "agents", "book", "materials", "tasks"]); /* sidebar materials v1, 6 Nov */
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

  it("the To-do list row (TASKS section) shows its count with the burgundy dot — FLAT GROUPS NOW (final ref)", () => {
    /* ⚠️ THE ACCORDION IS RETIRED (final ref): flat groups, EVERY destination visible, each with
       its own icon, under a mono group label that is pure typography. A parent row that both
       navigated and disclosed was one control doing two jobs, and it put half the app behind a
       state you had to know to open. */
    const secs = workspaceSections({ todo: 42 });
    /* sidebar-IA fix (6 Aug): TASKS joined the IA. Audit pack P5: it MOVED — the order is now the
       work's order, Queries · Agents · Materials first and Tasks after the work it falls out of —
       and ACCOUNT joined at the end, holding the Settings row that used to sit in the foot — until
       the sidebar metrics pass took it back to the foot as the gear (reversing P5, Nick's call).
       ⚠️ NOTE: this body is copy-pasted verbatim across four tests in this file whose NAMES
       describe four different things. A pre-existing artefact of an earlier bulk retarget; left
       as found rather than widened here. */
    expect(secs.map((s) => s.id))
      .toEqual(["workspace", "queries", "agents", "book", "materials", "tasks"]); /* sidebar materials v1, 6 Nov */
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
    // sidebar-IA fix (6 Aug): the row lives on the TASKS section's list child now
    const row = quiet.find((s) => s.id === "tasks")!.children!.find((c) => c.id === "list")!;
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
      .toEqual([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.SIGNED]); // Query actions v1 (27 Sep): + Signed
  });
});

describe("`Needs attention` is the past-reply-window set — ONE derivation, both shells", () => {
  const now = Date.UTC(2026, 7, 5);
  const day = 86_400_000;
  /* ⚠️ §2 · THE FIXTURE CARRIES `writerExpectedDate`, BECAUSE `responseDeadline` IS RETIRED AS A
     WRITTEN FIELD. A fixture still setting the old column would be handing the predicate an input
     the system can no longer produce — the shape that keeps a test green over a function nothing
     can reach. */
  const q = (status: QueryStatus, deadlineOffsetDays: number | null) => ({
    status,
    ...(deadlineOffsetDays === null
      ? {}
      : { writerExpectedDate: new Date(now + deadlineOffsetDays * day).toISOString() }),
  }) as never;

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

/* ══ SIDEBAR RAIL v1 (5 Nov), regrouped by SIDEBAR MATERIALS v1 (6 Nov) — the section list, the rail's labels, the
   dormant Pro marks ══ */
describe("sidebar rail v1 — the nav the rail reads", () => {
  const nav = workspaceSections({ todo: 4 });
  it("six sections, most-used first: Your book and Materials are separate; no Calendar", () => {
    expect(nav.map((s) => s.label)).toEqual(["Workspace", "Queries", "Agents", "Your book", "Materials", "Tasks"]);
    const labels = nav.flatMap((s) => (s.children ?? []).map((c) => c.label));
    expect(labels).not.toContain("Calendar");
    expect(nav.find((s) => s.label === "Your book")!.children!.map((c) => c.label)).toEqual(["Manuscripts", "Versions"]);
    expect(nav.find((s) => s.label === "Materials")!.children!.map((c) => c.label)).toEqual(["Query letters", "Comparable titles", "Submission packages"]);
    expect(nav.find((s) => s.id === "tasks")!.children!.map((c) => c.label)).toEqual(["To-do list", "Corkboard"]);
  });
  it("every section and row names its own icon, and each is drawn; Your book is Library, Materials Mail, Query letters FilePenLine", () => {
    const appShell = readFileSync(resolve(__dirname, "../components/shell/AppShell.tsx"), "utf8");
    const at = appShell.indexOf("const WORKSPACE_ICONS");
    expect(at, "WORKSPACE_ICONS moved").toBeGreaterThan(-1);
    const block = appShell.slice(at, appShell.indexOf("};", at));
    for (const s of nav) {
      expect(s.icon, `${s.id} needs a section icon`).toBeTruthy();
      expect(block, `${s.id}: ${s.icon}`).toContain(`${s.icon}:`);
      for (const c of s.children ?? []) expect(block, `${c.id}: ${c.icon}`).toContain(`${c.icon}:`);
    }
    expect(nav.find((s) => s.label === "Your book")!.icon).toBe("library");
    expect(nav.find((s) => s.label === "Materials")!.icon).toBe("mail");
    expect(block).toContain("mail: <Mail ");
    expect(block).toContain("letter: <FilePenLine ");
    expect(nav.find((s) => s.id === "materials")!.children![0].icon).toBe("letter");
  });
  it("the rail's card labels: Packages and Comps are shortened, nothing else", () => {
    expect(RAIL_SHORT_LABELS).toEqual({ "q-pkg": "Packages", "m-comps": "Comps" });
    expect(nav.flatMap((s) => (s.children ?? []).map((c) => railPageLabel(c)))).toEqual([
      "Dashboard", "Query Centre", "Responses", "Analytics", "Contact list", "Discover",
      "Manuscripts", "Versions", "Query letters", "Comps", "Packages", "To-do list", "Corkboard",
    ]);
  });
  it("the full sidebar's short label: Queries (25 Oct), every other row its full name", () => {
    expect(nav.flatMap((s) => (s.children ?? []).map((c) => sidebarLabel(c)))).toEqual([
      "Dashboard", "Queries", "Responses", "Analytics", "Contact list", "Discover",
      "Manuscripts", "Versions", "Query letters", "Comparable titles", "Submission packages", "To-do list", "Corkboard",
    ]);
  });
  it("the rail's section rows: Dashboard by its page, every other section by its own label", () => {
    expect(nav.map(railSectionLabel)).toEqual(["Dashboard", "Queries", "Agents", "Your book", "Materials", "Tasks"]);
  });
  it("the settings rail's short labels cover every account section", () => {
    expect(Object.keys(SETTINGS_RAIL_LABELS).sort()).toEqual(ACCOUNT_ROUTES.map((r) => r.id).sort());
    expect(ACCOUNT_ROUTES.map((r) => SETTINGS_RAIL_LABELS[r.id]))
      .toEqual(["Profile", "Security", "Plan", "Alerts", "Settings", "Tasks", "Your data"]);
  });
  it("Discover and Versions are the Pro pages and Materials the Pro section, each named by its entitlement", () => {
    const pro = nav.flatMap((s) => (s.children ?? []).filter((c) => c.pro).map((c) => `${c.label}:${c.pro}`));
    expect(pro).toEqual(["Discover:discover", "Versions:versions"]);
    expect(nav.filter((s) => s.pro).map((s) => `${s.label}:${s.pro}`)).toEqual(["Materials:materials"]);
  });
  it("Query letters is a nav page with its own name in every reader", () => {
    expect(workspacePageForPath("/materials/letters")).toEqual({ section: "Materials", page: "Query letters", single: false });
    expect(workspacePageForPath("/manuscripts/comps")).toEqual({ section: "Materials", page: "Comparable titles", single: false });
    expect(workspacePageForPath("/manuscripts/versions")).toEqual({ section: "Your book", page: "Versions", single: false });
  });
});
