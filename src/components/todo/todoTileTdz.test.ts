/**
 * ⚠️ THE ORDER RULE ON `/todo`, LOCKED — because a comment stating it did not stop it twice.
 *
 * `railGroups()` is a HOISTED function whose first render-time caller sits near the top of the
 * component, so anything it reads must be DECLARED above that call. `tsc` cannot see the fault:
 * the read happens inside a function boundary, and TypeScript has no way to know the function runs
 * during render.
 *
 * It has now happened twice in this one file.
 *   - Phase 6 (frame2): `viewFacts` declared four hundred lines down. Every render threw.
 *   - Phase 1 (QC-chassis): `nudgedBefore` declared eight hundred lines down, reached through the
 *     new `tileNarrow`. **This one reached dev**, because `tileNarrow` returns early while the
 *     selected tile is `all` — the initial state — so the read never happened until a reader
 *     clicked a tile, at which point the whole page fell into its error boundary with
 *     `Cannot access 'oc' before initialization`. tsc, 7,443 unit tests and a clean production
 *     build were green throughout. Only the rendered measurement found it.
 *
 * A warning comment describing exactly this sat FOUR LINES above the offending call site the whole
 * time. That is the house rule made flesh: a constraint worth a warning comment is worth a test.
 *
 * ⚠️ BOTH HALVES ARE ASSERTED, and the second is the one that keeps this honest. An ordering lock
 * over a consumer that has stopped reading its dependency passes forever — so each case asserts
 * that the chain STILL READS the name before asserting where it is declared.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(join(process.cwd(), "src/components/todo/ToDoPage.tsx"), "utf8");
const LINES = SRC.split("\n");

/** the component-scope declaration line (1-based) of a `const`, or -1 */
const declLine = (name: string): number => {
  const i = LINES.findIndex((l) => new RegExp(`^  const ${name}\\s*=`).test(l));
  return i === -1 ? -1 : i + 1;
};

/** the body of a component-scope hoisted `function`, brace-balanced */
const fnBody = (name: string): string => {
  const start = LINES.findIndex((l) => new RegExp(`^  function ${name}\\b`).test(l));
  if (start === -1) return "";
  let depth = 0;
  const out: string[] = [];
  for (let j = start; j < LINES.length; j++) {
    out.push(LINES[j]);
    depth += (LINES[j].match(/\{/g) ?? []).length - (LINES[j].match(/\}/g) ?? []).length;
    if (depth === 0 && j > start) break;
  }
  return out.join("\n");
};

/** the line of the first render-time call to `railGroups()` — the deadline every read must beat */
const firstCallerLine = (): number => {
  const i = LINES.findIndex((l) => /^  const allDockable\s*=.*railGroups\(\)/.test(l));
  return i === -1 ? -1 : i + 1;
};

describe("the /todo render-time order rule", () => {
  it("still has the shape this lock is about — a hoisted railGroups() called near the top", () => {
    /* the precondition, asserted so the cases below cannot pass over a file that changed shape */
    expect(fnBody("railGroups"), "railGroups() is no longer a component-scope hoisted function")
      .not.toBe("");
    expect(firstCallerLine(), "nothing matches `const allDockable = … railGroups()` any more — "
      + "find the new first render-time caller and retarget this lock to it").toBeGreaterThan(0);
  });

  /* ⚠️ THE CHAIN IS SPELLED OUT so a new link cannot join it unwatched. Each is a hoisted function
     `railGroups()` reaches; a read from any of them happens at the same moment. */
  const CHAIN = ["railGroups", "tileNarrow", "generatedGroups", "chipGroups", "taskGroups"];

  it("every const the railGroups() chain reads is declared above its first caller", () => {
    const deadline = firstCallerLine();
    const bodies = CHAIN.map((f) => fnBody(f)).join("\n");
    expect(bodies.length, "the chain's bodies came back empty — the functions were renamed")
      .toBeGreaterThan(500);

    const offenders: string[] = [];
    LINES.forEach((l, i) => {
      const m = /^  const ([A-Za-z_$][\w$]*)\s*=/.exec(l);
      if (!m) return;
      const line = i + 1;
      if (line <= deadline) return;
      if (new RegExp(`\\b${m[1]}\\b`).test(bodies)) {
        offenders.push(`${m[1]} (declared line ${line}, read by the chain, first call line ${deadline})`);
      }
    });
    expect(offenders,
      "A const the railGroups() chain reads is declared BELOW its first render-time caller. "
      + "That is a temporal dead zone tsc cannot see: the page will throw "
      + "'Cannot access X before initialization' the first time the chain actually reads it — "
      + "which may be on a branch that the default state does not take, so it can ship green. "
      + "Move the declaration above line " + deadline + ".").toEqual([]);
  });

  /* ── the ones that have actually bitten, named, so a regression says which one ──
     ⚠️ `nudgedBefore` LEFT THIS LIST IN PHASE 2, ON THIS LOCK'S OWN INSTRUCTION. It was the const
     whose position took the page down; Phase 2 deleted it outright, because the fact it computed
     now travels on the card as `reason` and the chain no longer reads anything about nudges. The
     "still read by the chain" half went red and said so in as many words, which is exactly what
     that half is for — an ordering assertion over a dependency nobody reads passes forever.

     The general sweep above still covers it and every future member: it needs no list, because it
     compares EVERY component-scope const against the chain's whole body. This named list is the
     smaller, louder claim — it says WHICH one broke — and a name only belongs in it while the
     chain genuinely reads it. */
  for (const dep of ["viewFacts"]) {
    it(`${dep} is still read by the chain, and is declared above the first caller`, () => {
      const bodies = CHAIN.map((f) => fnBody(f)).join("\n");
      /* half one — the lock is not vacuous: the chain really does read it */
      expect(new RegExp(`\\b${dep}\\b`).test(bodies),
        `${dep} is no longer read by the railGroups() chain. If that is deliberate, remove it from `
        + "this lock — but an ordering assertion over a dependency nobody reads passes forever, "
        + "which is the failure this half exists to prevent.").toBe(true);
      /* half two — and it is declared in time */
      const d = declLine(dep);
      expect(d, `${dep} has no component-scope const declaration`).toBeGreaterThan(0);
      expect(d, `${dep} is declared at line ${d}, BELOW the first render-time call to railGroups() `
        + `at line ${firstCallerLine()} — the TDZ that took the whole page down twice`)
        .toBeLessThan(firstCallerLine());
    });
  }
});
