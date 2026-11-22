/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Moved out of App.tsx (split v1, phase 4) so the public site can navigate without importing the app.
 * App re-exports it, so `import { pathFor } from "../App"` still works.
 */
/**
 * Maps a legacy (tab, subPageName) navigation call onto a router path. This is the write side of
 * the navigate bridge — existing onNavigate call sites keep their old vocabulary; the read side
 * (path → props) lives in AppContent. Focus-form interceptions never reach this function.
 */
/**
 * ⚠️ EXPORTED SO IT CAN BE LOCKED. An unregistered tab falls through to `/dashboard`, which
 * is silent: the link works, it simply goes home. `/queries/analytics` was a live dead link
 * for exactly that reason, agreed to exist by four surfaces and denied by the one the router
 * asks. `marketingLinks.test.ts` now asserts every destination the public chrome offers.
 */
export function pathFor(tab: string, subPageName?: string): string {
  switch (tab) {
    case "landing": return "/"; // marketing front door (wordmarks navigate here from any tier)
    case "dashboard": return "/dashboard";
    case "queries": {
      // Named database aliases land on the desk; any OTHER subpage value is a query id
      // (NavSearch deep-selection) — carried through ?q= exactly as Queries'
      // "unrecognised subpage = id" contract expects. (The orphaned QueriesLanding and its
      // ?view=landing niche are deleted — Tier 2 · Phase 5.)
      const dbAliases = ["Query database", "Queries database", "All queries", "Hub"];
      if (subPageName && !dbAliases.includes(subPageName)) return `/queries?q=${encodeURIComponent(subPageName)}`;
      return "/queries";
    }
    case "todo": return "/todo";
    case "agents": return subPageName === "Discover new agents" ? "/agents/discover" : "/agents";
    case "manuscripts": {
      /* Submission packages v26: the page lives under Queries now (/manuscripts/packages redirects) */
      if (subPageName === "Submission packages") return "/queries/packages";
      /* the dashboard's quick action — the packages page's New package dialog */
      if (subPageName === "New package") return "/queries/packages?tab=builder";
      if (subPageName === "Comparable titles") return "/manuscripts/comps";
      if (subPageName === "Versions") return "/manuscripts/versions";
      if (subPageName === "Query letters") return "/materials/letters";
      return "/manuscripts";
    }
    // Two pricing surfaces, and they answer different questions: PUBLIC /pricing is the shop
    // window (marketing tier, writes nothing, sells nothing yet); /plans is the signed-in view of
    // your own account. Consolidating them is a separate decision.
    case "pricing": return "/pricing";
    case "plans": return "/plans";
    // Public legal documents — routes rather than static files, because hosting rewrites ** to
    // /index.html and a file at these paths would be served the app instead.
    case "terms": return "/terms";
    case "privacy": return "/privacy";
    // Company pages — public, marketing tier, reachable from the shared footer on every page.
    case "about": return "/about";
    case "contact": return "/contact";
    // The founding-writers offer — the landing hero's panel and the sealed band both point here,
    // and it is the nav's CTA until launch. Deliberately not a nav LINK: it is the call to
    // action, not a section of the site.
    case "founders": return "/founders";
    case "import": return "/import";
    case "help": return "/help";
    case "account": return "/account";
    default: return "/dashboard";
  }
}
