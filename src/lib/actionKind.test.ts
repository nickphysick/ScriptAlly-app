/**
 * THE ACTION KINDS AND THEIR DESKS (v65 §E ruling): exactly one implementation per kind,
 * resolvable by name — and the resolver reads the app's own CTA engine rather than a second
 * status table.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTION_KINDS, DESK_FOR_KIND, actionKindFor } from "./actionKind";
import { DEEDS } from "./calendarPill";
import { getPrimaryAction } from "./queryPrimaryAction";
import { QueryStatus } from "../types";

describe("⚠️ EXACTLY ONE IMPLEMENTATION PER KIND, RESOLVABLE BY NAME", () => {
  /* every .tsx in src/, so a second desk anywhere in the tree is caught — not only a second one
     in the folder the first lives in */
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : []);
  const files = walk(join(process.cwd(), "src"));

  it.each(Object.entries(DESK_FOR_KIND))("%s resolves to exactly one component named %s", (kind, name) => {
    /* the DECLARATION, not a mention: an import or a JSX mount names it too */
    const decl = new RegExp(`export const ${name}\\s*:|export function ${name}\\b`);
    const owners = files.filter((f) => !f.endsWith(".test.tsx") && decl.test(readFileSync(f, "utf8")));
    expect(owners.map((f) => f.replace(process.cwd() + "/", "")),
      `${kind} must have exactly one implementation`).toHaveLength(1);
  });

  it("⚠️ AND NO FIFTH THING — no ActionSheet component exists anywhere", () => {
    /* the ruling: action-journey.html is the specification the desks conform to, not a fifth
       component to build. This is the lock that keeps that true. */
    const offenders = files.filter((f) => /export (const|function) ActionSheet\b/.test(readFileSync(f, "utf8")));
    expect(offenders, "an ActionSheet component was built — the desks are the implementation").toEqual([]);
  });

  it("every kind is either owned by a desk or is the sheetless task tick", () => {
    for (const k of ACTION_KINDS) {
      if (k === "task") continue;
      expect(DESK_FOR_KIND[k], `${k} has no desk`).toBeTruthy();
    }
    expect(Object.keys(DESK_FOR_KIND).length + 1, "a kind gained or lost a desk").toBe(ACTION_KINDS.length);
  });
});

describe("the resolver reads the app's own derivations", () => {
  it("a task is a task whatever its status says", () => {
    expect(actionKindFor({ isTask: true, status: QueryStatus.QUERIED })).toBe("task");
    expect(actionKindFor({ isTask: true, status: QueryStatus.PARTIAL_REQUESTED })).toBe("task");
  });

  it("every nudge deed the board can word resolves to nudge", () => {
    for (const deed of [DEEDS.nudge, DEEDS.them, "Nudge", "Nudge again"]) {
      expect(actionKindFor({ isTask: false, deed }), deed).toBe("nudge");
    }
  });

  it("a cap sourced from a window or a reminder is a nudge — the board's own two nudge sources", () => {
    expect(actionKindFor({ isTask: false, capSource: "window" })).toBe("nudge");
    expect(actionKindFor({ isTask: false, capSource: "reminder" })).toBe("nudge");
  });

  it("⚠️ EVERY STATUS AGREES WITH `getPrimaryAction` — a send is a send on the same terms", () => {
    /* the whole enum, so a status added later cannot quietly resolve to the wrong desk */
    for (const status of Object.values(QueryStatus)) {
      const want = getPrimaryAction(status).kind === "mark-sent" ? "marksent" : "respond";
      expect(actionKindFor({ isTask: false, status, capSource: "sendBy" }), status).toBe(want);
    }
  });

  it("the send deeds resolve to marksent, not to a nudge", () => {
    for (const [status, deed] of [
      [QueryStatus.PARTIAL_REQUESTED, DEEDS.partial],
      [QueryStatus.FULL_REQUESTED, DEEDS.full],
      [QueryStatus.REVISE_RESUBMIT, DEEDS.revision],
    ] as const) {
      expect(actionKindFor({ isTask: false, status, deed, capSource: "sendBy" }), deed).toBe("marksent");
    }
  });
});
