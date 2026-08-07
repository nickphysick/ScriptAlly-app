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
  // tasks-pages P3/P4: the placeholder retired with its last consumer; the real pages join
  "components/todo/TodoCalendarPage.tsx",
  "components/todo/TodoNoteboardPage.tsx",
  "marketing/Landing.tsx",
  "marketing/MarketingShell.tsx",
  "components/shell/AppShell.tsx",
];

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");

/**
 * Find every `const` declared below a component's `return (` that the RENDER can reach.
 *
 * ⚠️ THIS CHECK HAS BEEN WRONG TWICE, IN OPPOSITE DIRECTIONS, AND BOTH VERSIONS WERE GREEN.
 * The history is the specification, so it is written down:
 *
 *   1. The original split the file at `return (` and searched the part ABOVE for the reference.
 *      But the reference lives in a render helper defined BELOW the return, so it looked in a
 *      region that could not contain the answer.
 *   2. The correction searched the returned JSX instead — right region for a direct call, still
 *      wrong for the real bug, because the JSX does not name the const either.
 *
 * ⚠️ WHAT THE REAL BUG ACTUALLY LOOKED LIKE (`ToDoPage`, 6 Aug — geometry verified against the
 * pre-fix file at `c0698c4^`): the component's `return (` is at line 933. Its JSX calls
 * `renderPageHeader()` — a HOISTED FUNCTION, so calling it from above its definition is legal.
 * `renderPageHeader` is defined at 1119 and reads `boardSubtitle` at 1135. `boardSubtitle` is a
 * `const` at 1594. Execution never reaches 1594 before returning at 933, so the const is in the
 * temporal dead zone when the helper runs, and the page throws on every render.
 *
 * ⚠️ AND `tsc` CANNOT SEE IT. Used-before-declaration (TS2448) fires only when the reference is in
 * the SAME scope as the declaration. Here it is inside a nested function, which TypeScript treats
 * as legal because it cannot know the function is called during render. A direct
 * `description={helper()}` in the JSX IS caught by tsc — so that shape, the tempting one to test
 * with, proves nothing about the guard. This is the one the render smoke exists for.
 *
 * So the rule follows the RENDER'S CALL GRAPH: start at the returned JSX, take every helper it
 * names, transitively take the helpers those name, and flag any `const` below the return that
 * anything in that closure reads. A helper reachable only from an event handler is NOT flagged —
 * it runs after the render has finished, when the const is initialised, which is legal and common.
 *
 * Scoping matters too — a file with several components must not compare component B's consts
 * against component A's render — so each return is bounded by its own enclosing declaration.
 */
export function postReturnConstsReadByRender(src: string): string[] {
  const found: string[] = [];
  const lines = src.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (!/^ {2}return \(/.test(lines[i])) continue;

    // Backwards to the enclosing top-level declaration; forwards to the `}` that closes it.
    let start = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (/^(export )?(const|function|async function) \w/.test(lines[j])) { start = j; break; }
    }
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\}/.test(lines[j])) { end = j; break; }
    }
    const body = lines.slice(start, end);
    const returnAt = i - start;

    // The returned JSX runs from `return (` to its own `  );`.
    let closed = body.length - 1;
    for (let j = returnAt + 1; j < body.length; j++) {
      if (/^ {2}\);/.test(body[j])) { closed = j; break; }
    }
    const jsx = body.slice(returnAt, closed + 1).join("\n");

    /** The source of a 2-space helper (`function f()` or `const f = …`), start to its closing `  }`. */
    const helperBody = (name: string): string | null => {
      const at = body.findIndex((l) =>
        new RegExp(`^ {2}(function ${name}\\b|(const|let) ${name}\\s*=)`).test(l));
      if (at === -1) return null;
      let stop = body.length;
      for (let j = at + 1; j < body.length; j++) {
        if (/^ {2}(\}|\);|\})/.test(body[j])) { stop = j; break; }
      }
      return body.slice(at, stop + 1).join("\n");
    };

    // Transitive closure of everything the render can reach, starting from the JSX.
    const identifiers = (text: string) => new Set(text.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []);
    const reached = new Set<string>();
    let frontier = [...identifiers(jsx)];
    let renderText = jsx;
    while (frontier.length) {
      const next: string[] = [];
      for (const name of frontier) {
        if (reached.has(name)) continue;
        reached.add(name);
        const src2 = helperBody(name);
        if (!src2) continue;
        renderText += "\n" + src2;
        next.push(...identifiers(src2));
      }
      frontier = next;
    }

    for (const m of body.slice(closed + 1).join("\n").matchAll(/^ {2}const (\w+)/gm)) {
      const name = m[1];
      if (new RegExp(`\\b${name}\\b`).test(renderText)) found.push(name);
    }
  }
  return found;
}

/* ⚠️ 30s, BECAUSE THIS CHECK IS GENUINELY SLOW ON THE BIGGEST PAGES — not because it hangs.
   It walks the render's call graph and then regex-tests every post-return `const` against the
   render text, which on `Queries.tsx` (thousands of lines) measures ~7.6s idle and ~9.3s with a
   dev server running: over the 5s default, so it went red on a tree where nothing had changed and
   passed earlier the same day on the same commit. A guard that flips with machine load is a guard
   people learn to ignore, and this one exists to catch a crash that ships silently. */
describe("⚠️ no page reads a post-return const from its render (the crash's shape)", () => {
  for (const rel of PAGE_SOURCES) {
    it(`${rel} declares nothing below its return that the JSX above it touches`, { timeout: 30_000 }, () => {
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
   * ⚠️ THE ACTUAL SHAPE OF THE ACTUAL BUG — the case both earlier versions of this check missed,
   * and the case `tsc` cannot see. Reduced from `ToDoPage.tsx` at `c0698c4^`, geometry preserved:
   * the JSX calls a HOISTED function; that function reads a `const`; the `const` is declared below
   * the return, so execution never reaches it before the render runs.
   *
   * Verified against the real pre-fix file during the build of this check, not just this fixture:
   * it returns ["boardSubtitle"] on `c0698c4^`'s ToDoPage.tsx and [] on the fixed one.
   */
  it("flags the REAL shape — a hoisted helper the render calls, reading a post-return const", () => {
    const asItShipped = [
      "export const Page: React.FC = () => {",
      "  const tiles = useTiles();",
      "  return (",
      "    <div>{renderPageHeader()}</div>",
      "  );",
      "",
      "  function renderPageHeader() {",
      "    return <PageHeader description={boardSubtitle} />;",
      "  }",
      "",
      "  const boardSubtitle = `${tiles.urgent} urgent`;",
      "};",
    ].join("\n");
    expect(postReturnConstsReadByRender(asItShipped)).toEqual(["boardSubtitle"]);
  });

  /**
   * ⚠️ THE MIRROR CASE, and the reason the check follows the call graph rather than flagging every
   * post-return const: a helper reached only from an EVENT HANDLER runs after the render has
   * finished, when the const is initialised. That is legal, common, and must never go red — a
   * tripwire that fires on correct code is removed within a week.
   */
  it("does NOT flag a const read only by a handler the render never calls", () => {
    const fine = [
      "export const Page: React.FC = () => {",
      "  return (",
      "    <div onClick={openThing}>x</div>",
      "  );",
      "",
      "  function unrelatedLater() {",
      "    return draftLabel;",
      "  }",
      "",
      "  const draftLabel = 'saved';",
      "};",
    ].join("\n");
    expect(postReturnConstsReadByRender(fine)).toEqual([]);
  });

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
