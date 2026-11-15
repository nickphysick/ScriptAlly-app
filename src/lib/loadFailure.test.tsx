/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overnight fixes v1, Part 2. A failed read is a fourth state, distinct from empty. These are the pure half and the
 * loader's source half. The rendered half is tests/e2e/onfLoadFail.measure.ts (LF1–LF4).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { downReads, loadFailedWords, loadFailure, retryingOnly } from "./loadFailure";
import { LoadFailed } from "../components/notes/LoadFailed";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the words follow the Your notes pattern", () => {
  it("one read down names it; more than one names the account; none is null", () => {
    expect(loadFailedWords(["queries"])).toBe("We couldn’t load your queries. Try again?");
    expect(loadFailedWords(["agents"])).toBe("We couldn’t load your agents. Try again?");
    expect(loadFailedWords(["manuscripts"])).toBe("We couldn’t load your manuscript. Try again?");
    expect(loadFailedWords(["queries", "agents"])).toBe("We couldn’t load your account. Try again?");
    expect(loadFailedWords([])).toBeNull();
  });
  it("the Your notes line is the pattern (the same curly apostrophe, the same question)", () => {
    expect(src("src/lib/yourNotes.ts")).toContain('export const LOAD_FAILED = "We couldn’t load your notes. Try again?";');
  });
});

describe("which reads are down", () => {
  it("failed and retrying are both down; absent reads as ok", () => {
    expect(downReads({ queriesRead: "failed" })).toEqual(["queries"]);
    expect(downReads({ queriesRead: "retrying", manuscriptsRead: "failed" })).toEqual(["queries", "manuscripts"]);
    expect(downReads({})).toEqual([]);
    expect(downReads({ agentsRead: "failed" }, ["queries"])).toEqual([]);
    expect(downReads({ queriesRead: (() => {}) as unknown as "ok" }), "a stand-in value is not a failure").toEqual([]);
  });
  it("the button waits only while every down read is retrying", () => {
    expect(retryingOnly({ queriesRead: "retrying" }, ["queries"])).toBe(true);
    expect(retryingOnly({ queriesRead: "retrying", agentsRead: "failed" }, ["queries", "agents"])).toBe(false);
    expect(loadFailure({ queriesRead: "ok", agentsRead: "ok", manuscriptsRead: "ok" })).toBeNull();
    expect(loadFailure({ queriesRead: "failed" })).toEqual({ down: ["queries"], words: "We couldn’t load your queries. Try again?", busy: false });
  });
});

describe("LoadFailed is the Your notes error's markup, exactly", () => {
  it("the same classes, role and button, in the .yn scope", () => {
    const html = renderToStaticMarkup(<LoadFailed words="We couldn’t load your queries. Try again?" onRetry={() => {}} probe="queries" />);
    expect(html).toBe('<div class="yn" data-load-failed="queries"><div class="yn-empty" data-yn="error" role="alert"><p>We couldn’t load your queries. Try again?</p><button type="button" class="yn-btn">Try again</button></div></div>');
  });
  it("the Your notes page draws its error through it", () => {
    const page = src("src/components/notes/YourNotesPage.tsx");
    expect(page).toContain('<LoadFailed words={LOAD_FAILED} onRetry={retry} probe="your-notes" />');
    expect(page, "no second copy of the markup").not.toContain('data-yn="error"');
  });
});

describe("the loader never resolves a failed read to an empty list (source)", () => {
  const db = src("src/lib/db.tsx");
  for (const [name, setter] of [["queries", "setQueriesRead"], ["agents", "setAgentsRead"], ["manuscripts", "setManuscriptsRead"]] as const) {
    it(`${name}: the error callback marks the read failed before it reports`, () => {
      const at = db.indexOf(`handleFirestoreError(error, OperationType.GET, \`users/\${uid}/${name}\`)`);
      expect(at, "the subject is there").toBeGreaterThan(0);
      const cb = db.slice(db.lastIndexOf("(error) => {", at), at);
      expect(cb).toContain(`${setter}("failed")`);
    });
    it(`${name}: a loaded snapshot sets the read back to ok, and a retry re-subscribes`, () => {
      expect(db).toMatch(new RegExp(`if \\(snapshotIsLoaded\\(snap\\)\\) \\{ \\w+ = true; markCollectionsLoaded\\(\\); ${setter}\\("ok"\\); \\}`));
      expect(db).toContain(`${setter}("retrying"); sub`);
    });
    it(`${name}: the forced-fault aid is gated at its call site`, () => {
      expect(db).toContain(`const forced = import.meta.env.MODE !== "production" ? forcedReadFault("${name}") : null;`);
    });
  }
  it("the context carries the read states and the retry", () => {
    for (const k of ["queriesRead,", "manuscriptsRead,", "retryReads,", "agentsRead,"]) expect(db).toContain(`        ${k}`);
  });
});

describe("each page draws the error before its day-one or empty state (source)", () => {
  it("the Query Centre: the error state comes first, and the header shows no counts", () => {
    const q = src("src/components/Queries.tsx");
    expect(q).toMatch(/const state155: State155 \| null = qcLoadFail \? \{ kind: "error"/);
    expect(q).toContain("counts={showGridSkeleton || qcLoadFail ? null :");
    expect(q.indexOf("const qcLoadFail = useLoadFailure();")).toBeLessThan(q.indexOf("const state155: State155"));
  });
  it("the Dashboard, the To-do list, Analytics and /import", () => {
    const d = src("src/components/dashboard/v58/Dash58.tsx");
    expect(d).toContain("{loadFail ? <LoadFailed words={loadFail.words}");
    expect(src("src/components/Dashboard.tsx")).toContain("loadFailure={loadFailure}");
    const td = src("src/components/todo/ws/TodoWorkspace.tsx");
    expect(td).toContain("{loadFail ? <LoadFailed words={loadFail.words}");
    expect(td).toContain("<WsHeader56 todo={loadFail ? null : all.length}");
    expect(src("src/components/QueryAnalytics.tsx")).toMatch(/if \(anFail\) \{\n\s+body = <LoadFailed/);
    expect(src("src/components/import/ImportPage.tsx")).toContain("if (importFail && !inFlow) {");
  });
});
