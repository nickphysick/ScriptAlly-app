/**
 * Item 1 of the clean-up pass (28 Sep): nothing is written behind the writer's back after a change.
 * The runtime repair in db.tsx is deleted; "Added" rows are keyed by id; nothing re-creates a row the
 * writer deleted. The rendered half is tests/e2e/recordCleanup.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const db = decls(read("src/lib/db.tsx"));

describe("the runtime repair is gone", () => {
  it("no effect in the provider writes a status step or an 'Added' row", () => {
    expect(db).not.toContain("[QueryHawk Backfill]");
    expect(db).not.toMatch(/const backfill = async/);
    expect(db).not.toMatch(/act-status-\$\{/);
    expect(db).not.toMatch(/act-added-ms-\$\{ms\.id\}/);
  });
  it("a save triggers no repair reads: no effect keyed on the data lists reads a query's log", () => {
    /* every useEffect whose dependency list names `queries` or `activities` — none may read a log */
    const effects = [...db.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[([^\]]*)\]\);/g)];
    expect(effects.length, "the effect scan found nothing — the pattern is stale").toBeGreaterThan(5);
    const keyed = effects.filter((m) => /\b(queries|activities)\b/.test(m[2]));
    for (const m of keyed) expect(m[1], `an effect on [${m[2]}] reads a query's log`).not.toMatch(/"queries",\s*\w+(\.id)?,\s*"activity"/);
  });
  it("adding an agent writes its 'Added' row under the agent's own id", () => {
    const add = db.slice(db.indexOf("const addAgent = async"), db.indexOf("const addAgent = async") + 4000);
    expect(add).toMatch(/id: `act-added-agent-\$\{id\}`,\s*activityType: ActivityType\.AGENT_ADDED/);
  });
});

describe("a deleted step stays deleted", () => {
  it("the Tracking delete path no longer chases a re-created rung", () => {
    const q = decls(read("src/components/Queries.tsx"));
    expect(q).not.toMatch(/const healed = log\.docs\.filter/);
  });
});
