/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Today page's button laws and the board's empty-Today invitation (corrections fixes 6 + 8).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const today = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const boardCss = readFileSync(join(here, "todoBoard.css"), "utf8");
const headerCss = readFileSync(join(here, "..", "shell", "pageHeader.css"), "utf8");

describe("⚠️ Work the list is INK, and pink stays with creation (fix 6)", () => {
  it("carries the INK class, never the pink one", () => {
    /* tasks-pages P1: the PageHeader actions array became real buttons in the layout's tool row —
       ink = .tdb-btnp (the tailored solid), pink = .tdb-addb (creation only). Same law. */
    expect(today).toContain('className="tdt-ink"'); // the anchor (the slice law)
    const at = today.indexOf('className="tdt-ink"');
    const btn = today.slice(at, today.indexOf("</button>", at)); // the Work button's own JSX only
    expect(btn).toContain("Work the list");
    expect(btn).not.toContain("tdb-addb"); // ink stays ink; pink belongs to the ＋ Add beside it
  });

  it("its neighbour ＋ Add to today keeps the ghost — the page's pink belongs to creation", () => {
    const add = today.slice(today.indexOf('label: "Add to today"') - 100, today.indexOf('label: "Add to today"') + 200);
    expect(add).not.toContain("primary: true");
    expect(add).not.toContain("ink: true");
  });

  it("the ink token pair exists and is genuinely ink, not a dark pink", () => {
    expect(headerCss).toContain(".svh-btn-ink { background: #2a1a13;");
    expect(headerCss).toContain("color: #fdfaf5;");
  });
});

describe("⚠️ disabled at zero committed, in the HOUSE grammar (fix 6)", () => {
  it("is disabled exactly when nothing is committed", () => {
    expect(today).toContain("disabled={committed.length === 0}"); // tasks-pages P1: a real button now
  });

  it("the disabled treatment is paper + hairline + faint + not-allowed, NEVER opacity", () => {
    /* An opacity-dimmed control looks like a live one behind glass — you keep trying it. The
       house treatment says "this is not available" in the control's own materials. */
    const rule = headerCss.slice(headerCss.indexOf(".svh-btn:disabled,"), headerCss.indexOf(".svh-btn:disabled svg"));
    expect(rule).toContain("background: var(--shell-card)");
    expect(rule).toContain("border-color: var(--shell-line-soft)");
    expect(rule).toContain("cursor: not-allowed");
    expect(rule).not.toContain("opacity");
  });
});

describe("the empty Today column invites rather than just reporting (fix 8)", () => {
  it("carries ONE quiet line pointing at the bench, and it is a LINK not a card", () => {
    expect(board).toContain("— lift something from the bench");
    expect(board).toContain('href="/todo/today"');
    expect(board).toContain('col.id === "today" &&'); // only that column
  });

  it("it is muted and inline — a card here would look like work", () => {
    expect(boardCss).toContain(".tbd-lift {");
    expect(boardCss).toContain("color: #9a8e80");
    expect(board).not.toContain('className="tbd-card empty"');
  });
});
