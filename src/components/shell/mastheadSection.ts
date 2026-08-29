/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHICH SECTION IS THIS PAGE IN? ════════════════════════════════════════════════════════════
 *
 * The masthead's kicker pill names the page's SECTION — Querying, Tasks, Agents, Shelf. This is the
 * one thing that carries it to `PageHeader`.
 *
 * ⚠️ A CONTEXT AND NOT A ROUTER HOOK, AND THE REASON IS THIS REPO'S TEST ENVIRONMENT RATHER THAN
 * TASTE. `PageHeader` reading `useLocation()` directly is correct in the app and fatal everywhere
 * else: React Router throws outside a `<Router>`, and this repo's component specs render through
 * `renderToStaticMarkup` with no router at all (`vitest.config.ts` is `environment: "node"`; there
 * is no jsdom). Two whole spec files stopped LOADING the moment the hook went in — which is the
 * loudest possible version of the failure, and the quiet version would have been a page component
 * used somewhere outside the router tree.
 *
 * ⚠️ AND A PROP WAS THE OTHER OPTION, REJECTED. Ten pages each passing their own section name is a
 * second table keyed by route, and the first time a page moved section the pill and the breadcrumb
 * would disagree — which is the exact failure the shared crumb derivation exists to prevent.
 *
 * ⚠️ ABSENCE RENDERS NOTHING. A `PageHeader` outside the shell has no section, and the honest answer
 * is no pill: a bordered pill with no word in it is worse than no pill, and it is what any fallback
 * string would eventually produce.
 *
 * The pattern mirrors `mastheadBehaviour.ts` deliberately — same shape, same reasoning about who is
 * allowed to know a thing, so the two read as one idea rather than two.
 */
import { createContext, useContext } from "react";

export interface MastheadSection {
  /** The section's label, exactly as the breadcrumb says it, or null where the route has none. */
  section: string | null;
}

export const MastheadSectionContext = createContext<MastheadSection>({ section: null });

export const useMastheadSection = (): string | null => useContext(MastheadSectionContext).section;
