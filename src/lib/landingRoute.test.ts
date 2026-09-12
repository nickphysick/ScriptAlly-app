/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Where a first-ever load lands (empty-states pack, Phase 4).
 *
 * ⚠️ THIS FILE EXISTS TO SETTLE A PREMISE, AND THE PREMISE IS FALSE. The pack states that "new
 * accounts land on Contact list instead of Dashboard" and asks for a routing fix, with the
 * instruction: prove it red first, and if it is already green say so and skip. It is already green.
 * A first-ever load with empty persistence resolves to `/dashboard` through every one of the four
 * routes that can decide it, and there is no last-visited route stored anywhere in `src/`.
 *
 * ⚠️ WHAT ACTUALLY PUTS A NEW ACCOUNT ON THE CONTACT LIST IS DELIBERATE, COMMENTED AND NOT A BUG.
 * Onboarding writes `sessionStorage["scriptally_post_onboarding_tab"]` on five of its exits, three
 * of them to `"agents"`, and `App.tsx` reads and clears it once. The code argues for it in its own
 * words — "Onboarding ends where the real work starts", "research-first, no query pipeline yet",
 * and, at the fifth exit, "Dashboard is the absence of a hatch." Changing it would be changing
 * onboarding's branch behaviour, which is a product decision and is outside this pack's scope by
 * its own do-not-touch list.
 *
 * ⚠️ SO WHAT IS LOCKED HERE IS THE DEFAULT, NOT A FIX. The value of the file is that the next
 * person to be told "new accounts land on the wrong page" can read which half is true: the default
 * is Dashboard and cannot drift; the hatch is a choice five call sites make on purpose.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sliceBetween } from "../test/sliceBetween";

/**
 * ⚠️ `pathFor` IS READ FROM SOURCE, NOT IMPORTED, AND THE REASON IS RECORDED IN THIS REPO ALREADY.
 * It lives in `App.tsx`, which transitively imports `lib/firebase`, which calls `getAuth` at module
 * scope — and the node test environment cannot initialise the SDK. Importing it did not fail a
 * case: it stopped the whole file LOADING with `auth/invalid-api-key` and reported "no tests", which
 * greps as zero failures. `railNav.test.ts` avoids the same wall the same way, by asserting against
 * the bridge's vocabulary rather than calling into it.
 */

const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const code = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const onboarding = readFileSync(join(process.cwd(), "src/components/Onboarding.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const KEY = "scriptally_post_onboarding_tab";

/**
 * `pathFor`'s body.
 *
 * ⚠️ TAKEN WITH `sliceBetween`, NOT `indexOf`. The first cut of this file wrote
 * `code.slice(code.indexOf("export const pathFor"))` — and the declaration is `export function`,
 * so `indexOf` returned -1, `slice(-1)` gave the last CHARACTER of the file, and two assertions
 * failed against an empty string while naming `pathFor`. That is the repo's recorded bounded-slice
 * trap doing it in the mild direction; the same miss with a `not.toContain` would have gone green.
 */
const PATH_FOR = sliceBetween(code, "export function pathFor", "\n}", "pathFor's body");

describe("Phase 4 · a first-ever load with empty persistence", () => {
  it("resolves to Dashboard through the tab bridge's default", () => {
    /* the switch's own `default`, which is what an unregistered tab falls through to */
    expect(PATH_FOR, "pathFor still switches on the tab").toContain("switch (tab)");
    expect(PATH_FOR).toMatch(/default:\s*return "\/dashboard";/);
  });

  it("resolves to Dashboard on an unknown path", () => {
    /* the guard sits below every early return, so this is the last word for any path the
       workspace does not name */
    expect(code).toContain("if (!WORKSPACE_PATHS.has(path)) {");
    const guard = code.slice(code.indexOf("if (!WORKSPACE_PATHS.has(path)) {"));
    expect(guard.slice(0, 120)).toContain('<Navigate to="/dashboard" replace />');
  });

  it("resolves to Dashboard once auth completes on a marketing route", () => {
    /* the pre-auth hashes are the auth transport; with a user present the journey finishes in the
       workspace rather than back on the landing page */
    const marketing = code.slice(code.indexOf("if (authHash) {"), code.indexOf("<MarketingShell"));
    expect(marketing).toContain('<Navigate to="/dashboard" replace />');
  });

  it("⚠️ persists NO last-visited route, so there is nothing to rehydrate", () => {
    /* the pack's fix is conditional on one existing ("rehydrate only if a route was genuinely
       stored"). Nothing in `src/` stores one — the only per-route memory is SCROLL position. */
    for (const name of ["lastRoute", "lastVisited", "last_route", "sa.route", "scriptally.route"]) {
      expect(app, `${name} would be a stored route`).not.toContain(name);
    }
  });
});

describe("Phase 4 · the hatch that actually sends a new account elsewhere", () => {
  it("is a session hatch, read once and cleared", () => {
    expect(code).toContain(`sessionStorage.getItem("${KEY}")`);
    expect(code).toContain(`sessionStorage.removeItem("${KEY}")`);
    /* ⚠️ CLEARED BEFORE IT IS USED, so a hatch cannot fire twice — asserted by order, because a
       remove that ran after a throw in `handleNavigate` would leave it armed for the next load. */
    const done = code.slice(code.indexOf(`const dest = sessionStorage.getItem("${KEY}")`));
    expect(done.indexOf("removeItem")).toBeLessThan(done.indexOf("handleNavigate(dest)"));
  });

  it("⚠️ and the absence of a hatch IS the Dashboard — there is no else branch", () => {
    /* the design, in `App.tsx`'s own words at the fifth writer: "Dashboard is the absence of a
       hatch". So onComplete navigates only when a destination was stored; with none, the app
       re-renders at its current path, which the auth-hash guard above has already made
       `/dashboard`. A literal `else` navigating anywhere would be a second answer. */
    const done = code.slice(
      code.indexOf(`const dest = sessionStorage.getItem("${KEY}")`),
      code.indexOf(`const dest = sessionStorage.getItem("${KEY}")`) + 400,
    );
    expect(done).not.toMatch(/\belse\b/);
  });

  it("⚠️ three onboarding exits choose the Contact list ON PURPOSE — the pack's premise, located", () => {
    /* Branch A's two exits (ready-to-query and still-writing) and Branch B's manual add. This is
       the whole of the behaviour the pack calls a bug, and it is five deliberate call sites. */
    const agents = onboarding.match(new RegExp(`sessionStorage\\.setItem\\("${KEY}", "agents"\\)`, "g")) ?? [];
    expect(agents.length, "the Contact-list hatch is written by three exits").toBe(3);
    /* and the other two go elsewhere, so "the hatch always means agents" is not the claim */
    expect(onboarding).toContain(`sessionStorage.setItem("${KEY}", "import")`);
    expect(onboarding).toContain(`sessionStorage.setItem("${KEY}", "plans")`);
  });

  it("⚠️ every hatch value is a tab the bridge can resolve — never a path", () => {
    /* a hatch holding "/agents" would go through `pathFor` as an unknown tab and land on the
       dashboard silently, which is the one failure mode this key has */
    const values = [...onboarding.matchAll(new RegExp(`setItem\\("${KEY}", "([^"]+)"\\)`, "g"))]
      .map((m) => m[1]);
    expect(values.length).toBeGreaterThan(3);
    /* the bridge's own case labels — a hatch value with no case falls through to the dashboard
       silently, which is the one failure mode this key has */
    for (const v of new Set(values)) {
      expect(v, `${v} looks like a path`).not.toMatch(/^\//);
      expect(PATH_FOR, `pathFor has no case for the hatch value "${v}"`).toContain(`case "${v}":`);
    }
  });
});
