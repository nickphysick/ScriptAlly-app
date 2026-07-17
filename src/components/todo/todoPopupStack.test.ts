/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Today's-list pop-up stacking contract (fix pass Phase 3; ref todo-lanes-popup-fix.html):
 * the OUTSTANDING list owns the flexible height; the done band renders only when non-empty, sized
 * to content with its own cap; the pop-up grows with content up to a viewport cap. Locked as
 * source/rule-text (the repo's testing policy is logic-only — no component mounts, so the flex
 * contract and the spacer regression are pinned at the text layer; pixel behaviour is Nick's
 * in-browser check).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "todo.css"), "utf8");
const tsx = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("Today's-list pop-up stacking — fix pass P3", () => {
  it("the pop-up grows with content up to the viewport cap (max-height, never fixed height)", () => {
    const pop = rule(".tdb-pop");
    expect(pop).toContain("max-height: min(640px, calc(100vh - 120px))");
    expect(pop).not.toMatch(/(?<!max-)height:/);
  });

  it("the outstanding list owns the flexible height and scrolls internally", () => {
    const commit = rule(".tdb-tcommit");
    expect(commit).toContain("flex: 1 1 auto");
    expect(commit).toContain("min-height: 0");
    expect(commit).toContain("overflow-y: auto");
    expect(commit).not.toContain("max-height"); // the old 168px cap is gone
  });

  it("the done band is content-sized with its own cap — it never steals space", () => {
    const done = rule(".tdb-tdone");
    expect(done).toContain("flex: 0 0 auto");
    expect(done).toContain("max-height: 220px");
  });

  it("the done band renders only when non-empty (and shown — the P2 badge-toggle); the zero-done flex spacer is gone", () => {
    expect(tsx).toContain("{doneN > 0 && showDone && (");
    expect(tsx).not.toContain('doneN === 0 && <div className="tdb-tdone"');
  });

  it("header and footer are fixed rows", () => {
    expect(rule(".tdb-th")).toContain("flex: none");
    expect(rule(".tdb-tf")).toContain("flex: none");
  });
});
