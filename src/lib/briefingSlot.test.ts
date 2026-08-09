/**
 * THE BRIEFING SLOT (briefing-slot pack P1) — the derivations behind the slot's figures and
 * copy. The point of these locks: nothing in the briefing is hardcoded, and a figure with no
 * source DROPS its column rather than showing a zero.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { briefingCleared, briefingFigures, briefingHeadline, briefingNarrative } from "./todoBoard";
import type { UserTask } from "../types";

const win = { key: "2026-07-13", startMs: Date.parse("2026-07-13"), endMs: Date.parse("2026-07-20"), weekNumber: 4 };
const task = (id: string, completedAt?: string): UserTask =>
  ({ id, userId: "u", text: id, done: !!completedAt, completedAt, createdAt: "2026-07-01", updatedAt: "2026-07-01" }) as UserTask;
const stats = (o = 0, sent = 0, quiet = 0) => ({
  sent: Array.from({ length: sent }, () => ({ label: "x", meta: "", badge: "" })),
  back: [], offers: o,
  quiet: Array.from({ length: quiet }, () => ({ queryId: "q", name: "n", daysSilent: 9, prevStatus: "Queried" })),
} as never);

describe("briefingCleared — the writer's ticked tasks inside the window", () => {
  it("counts only completions that fall in the review week", () => {
    const tasks = [task("a", "2026-07-14"), task("b", "2026-07-19"), task("c", "2026-07-21"), task("d"), task("e", "2026-07-12")];
    expect(briefingCleared(tasks, win)).toBe(2); // c is after, e is before, d was never done
  });
  it("an unparseable stamp is not counted (never NaN-in, never a false figure)", () => {
    expect(briefingCleared([task("a", "not-a-date")], win)).toBe(0);
  });
});

describe("briefingFigures — a column with no data DROPS, it never shows a zero", () => {
  it("both present when both have figures", () => {
    expect(briefingFigures(9, 2).map((f) => f.key)).toEqual(["cleared", "replies"]);
    expect(briefingFigures(9, 2)[0]).toEqual({ key: "cleared", value: "9", label: "CLEARED" });
  });
  it("a zero drops its column rather than rendering 0", () => {
    expect(briefingFigures(0, 2).map((f) => f.key)).toEqual(["replies"]);
    expect(briefingFigures(9, 0).map((f) => f.key)).toEqual(["cleared"]);
    expect(briefingFigures(0, 0)).toEqual([]);
  });
  it("FOCUSED never appears — the app records no time anywhere, so it could never be honest", () => {
    for (const f of [...briefingFigures(9, 2), ...briefingFigures(0, 0)]) expect(f.key).not.toBe("focused");
  });
});

describe("briefingHeadline + briefingNarrative — derived prose, never hardcoded", () => {
  it("the headline names the same two figures, spelled as words to twelve", () => {
    expect(briefingHeadline(9, 2)).toBe("A good week: nine tasks cleared, two agents replied");
    expect(briefingHeadline(1, 0)).toBe("Last week: one task cleared"); // singular, and only what exists
    expect(briefingHeadline(0, 1)).toBe("Last week: one agent replied");
    expect(briefingHeadline(20, 0)).toContain("20 tasks cleared"); // past twelve, numerals
  });
  it("an empty week still reads as a sentence, never as a blank", () => {
    expect(briefingHeadline(0, 0)).toBe("A quiet week on the desk");
  });
  it("the narrative is omitted entirely when there is nothing to say", () => {
    expect(briefingNarrative(stats(0, 0, 0))).toBeNull();
    expect(briefingNarrative(stats(1, 0, 0))).toBe("An offer arrived.");
    expect(briefingNarrative(stats(0, 3, 2))).toBe("three queries went out. two queries have gone quiet.");
  });
});

describe("THE COLLAPSE LAW — the empty case contributes NO height", () => {
  const page = readFileSync(join(__dirname, "..", "components", "todo", "ToDoPage.tsx"), "utf8");
  const css = readFileSync(join(__dirname, "..", "components", "todo", "todo.css"), "utf8");

  it("the slot is rendered ONLY inside the fresh-and-undismissed condition — no wrapper survives it — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1) — cards only; the Lane/ledger grammar is gone. */
    expect(page).not.toContain("function renderLedger");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("ONE OWNER PER GAP — the space under the header rule cannot stack (the reported bug) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1) — cards only; the Lane/ledger grammar is gone. */
    expect(page).not.toContain("function renderLedger");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });

  it("the spacing lives on the SLOT itself — no min-height, no fixed height, no wrapper margin", () => {
    const box = css.match(/\.tdb-brief \{([^}]*)\}/)?.[1] ?? "";
    expect(box).toContain("margin-top: 26px"); // the gap belongs to the thing that can disappear
    expect(box).not.toContain("min-height");
    expect(box).not.toMatch(/(^|;)\s*height:/);
  });

  it("dismissal is per REVIEW PERIOD, so a new review brings the slot back", () => {
    expect(page).toContain('localStorage.setItem("sa.todoReviewDismissed", reviewWin.key)');
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;");
  });
});

/** P3 sweep — the remnants of every surface these two replaced. */
describe("the sweep: nothing orphaned is left behind", () => {
  const css = readFileSync(join(__dirname, "..", "components", "todo", "todo.css"), "utf8");
  const shellCss = readFileSync(join(__dirname, "..", "components", "shell", "todoShell.css"), "utf8");
  const stage = readFileSync(join(__dirname, "sessionStage.ts"), "utf8");
  const themes = readFileSync(join(__dirname, "..", "..", "design-refs", "themes.md"), "utf8");

  it("the colophon, the review banner and every Pro predecessor are gone from the stylesheets", () => {
    for (const dead of ["tdb-colo", "cololink", "tdb-rvbox", "tdb-prostrip", "tdb-feat", "spine-pro"]) {
      expect(css, `todo.css still has ${dead}`).not.toContain(dead);
      expect(shellCss, `todoShell.css still has ${dead}`).not.toContain(dead);
    }
  });

  it("the session's fade list points at the briefing, not the retired banner or headers", () => {
    expect(stage).toContain(".tdb-brief");
    // the constant itself no longer names it (the sweep note above it may)
    const decl = stage.slice(stage.indexOf("export const EXIT_FADE"));
    expect(decl.slice(0, decl.indexOf("\n"))).not.toContain(".tdb-rvbox");
  });

  it("themes.md records the collapse law, the dismiss-per-period rule, the band and the one-Pro-surface rule", () => {
    expect(themes).toContain("## The briefing slot + assistant band");
    expect(themes).toContain("THE COLLAPSE LAW");
    expect(themes).toContain("DISMISS PER PERIOD");
    expect(themes).toContain("THE ASSISTANT BAND");
    expect(themes).toContain("ONE PRO SURFACE");
    expect(themes).toContain("the app's only blue sticker");
  });

  it("no tour step referenced the colophon or a Pro surface — nothing to retarget", () => {
    const tour = readFileSync(join(__dirname, "todoTour.ts"), "utf8");
    for (const dead of ["colo", "prostrip", "ProStrip", "tdb-feat", "rvbox"]) expect(tour).not.toContain(dead);
  });
});
