/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE STRUCTURAL CASE — the shape of the crash, checked in every page at once.
 *
 * `ToDoPage.tsx` shipped a page that would not load: a `const` declared BELOW the component's
 * `return` was read by the JSX above it, so it sat in the temporal dead zone and threw a
 * ReferenceError on every render. The file carried a warning comment against exactly that. The
 * comment stopped nothing, the suite stayed green, and dev showed "something went wrong".
 *
 * The render smokes catch it wherever a page can be rendered. This catches it by SHAPE, in every
 * page component in the app, including the ones a render smoke would have to work hard to reach.
 * Two checks for one fault, deliberately: the render proves the page runs, this proves nobody has
 * written the pattern back in.
 *
 * ⚠️ A FUNCTION IS NOT A CONST. Function declarations hoist; that is why the fix for this bug is
 * always "make it a function", and why this check only looks at `const`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Every page component in the app — the same census the smoke files render. */
export const PAGE_SOURCES = [
  "components/Dashboard.tsx",
  "components/Queries.tsx",
  "components/QueryAnalytics.tsx",
  "components/Agents.tsx",
  "components/agents/AgentList.tsx",
  "components/DiscoverNewAgents.tsx",
  "components/AllManuscripts.tsx",
  "components/manuscripts/ComparableTitlesPage.tsx",
  "components/SubmissionPackages.tsx",
  "components/ImportCsv.tsx",
  "components/AccountSettings.tsx",
  "components/PlansPage.tsx",
  "components/HelpCentre.tsx",
  "components/Pricing.tsx",
  "components/Auth.tsx",
  "components/Onboarding.tsx",
  "components/todo/ToDoPage.tsx",
  "components/todo/TodoTodayPage.tsx",
  "components/todo/TodoPlaceholderPage.tsx",
  "marketing/Landing.tsx",
  "marketing/MarketingShell.tsx",
  "components/shell/AppShell.tsx",
];

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");

/**
 * Find every `const` declared after a component's returned JSX that that JSX names.
 *
 * ⚠️ THE OBVIOUS VERSION OF THIS CHECK LOOKS IN THE WRONG HALF, and the first draft here did:
 * it split the file at `return (` and searched the part ABOVE for the reference. But the JSX is
 * part of the return statement — it is BELOW that line, not above it. Splitting there compares
 * the trailing consts against the hooks and handlers, which is the one region that genuinely
 * cannot be in the TDZ. The self-tests at the foot of this file exist because that draft passed
 * on every page in the app while detecting nothing.
 *
 * So the regions are: the enclosing function's body, split into the RETURNED JSX (`return (` …
 * `);`) and the TRAILING body after it. A const in the trailing body that the JSX names is in the
 * temporal dead zone for the whole render.
 *
 * Scoping matters too — a file with several components must not compare component B's consts
 * against component A's JSX — so each return is bounded by its own enclosing declaration.
 */
export function postReturnConstsReadByRender(src: string): string[] {
  const found: string[] = [];
  const lines = src.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (!/^ {2}return \(/.test(lines[i])) continue;

    // Forwards to the column-0 `}` (or `};`) that closes the enclosing function.
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\}/.test(lines[j])) { end = j; break; }
    }
    // The returned JSX runs to its own `  );` — everything after that is the trailing body.
    let closed = end;
    for (let j = i + 1; j < end; j++) {
      if (/^ {2}\);/.test(lines[j])) { closed = j; break; }
    }

    const jsx = lines.slice(i, closed + 1).join("\n");
    const trailing = lines.slice(closed + 1, end).join("\n");

    for (const m of trailing.matchAll(/^ {2}const (\w+)/gm)) {
      const name = m[1];
      if (new RegExp(`\\b${name}\\b`).test(jsx)) found.push(name);
    }
  }
  return found;
}

describe("⚠️ no page reads a post-return const from its render (the crash's shape)", () => {
  for (const rel of PAGE_SOURCES) {
    it(`${rel} declares nothing below its return that the JSX above it touches`, () => {
      const src = read(rel);
      expect(src.length, `${rel} must be readable`).toBeGreaterThan(0);
      expect(
        postReturnConstsReadByRender(src),
        `declared below the return but read by the render — this throws on every render`,
      ).toEqual([]);
    });
  }
});

describe("the structural check itself detects the bug it exists for", () => {
  /**
   * ⚠️ A TRIPWIRE NOBODY HAS SEEN TRIP IS A GUESS. This is the real ToDoPage shape — the render
   * calling a helper that is declared, as a const, after the return.
   */
  it("flags a const declared below the return and called by the JSX above it", () => {
    const bugged = [
      "export const Page: React.FC = () => {",
      "  const rows = useRows();",
      "  return (",
      "    <div>{renderRows(rows)}</div>",
      "  );",
      "  const renderRows = (r: Row[]) => r.map((x) => <span key={x.id} />);",
      "};",
    ].join("\n");
    expect(postReturnConstsReadByRender(bugged)).toEqual(["renderRows"]);
  });

  it("does NOT flag a hoisted function — which is the whole reason the fix is 'make it a function'", () => {
    const fixed = [
      "export const Page: React.FC = () => {",
      "  const rows = useRows();",
      "  return (",
      "    <div>{renderRows(rows)}</div>",
      "  );",
      "  function renderRows(r: Row[]) { return r.map((x) => <span key={x.id} />); }",
      "};",
    ].join("\n");
    expect(postReturnConstsReadByRender(fixed)).toEqual([]);
  });

  it("does NOT flag a const belonging to a DIFFERENT component further down the file", () => {
    const twoComponents = [
      "export const First: React.FC = () => {",
      "  return (",
      "    <div>{label}</div>",
      "  );",
      "};",
      "",
      "export const Second: React.FC = () => {",
      "  const label = 'hello';",
      "  return <p>{label}</p>;",
      "};",
    ].join("\n");
    // `label` is Second's own, declared above ITS return — First naming it is a different fault
    // (an undefined identifier), not this one, and this check must not claim it.
    expect(postReturnConstsReadByRender(twoComponents)).toEqual([]);
  });
});
