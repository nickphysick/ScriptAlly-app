/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the DEV-only hash surfaces (`#/status-dots`, `#/notes-lab`, …).
 *
 * These never reach a production build (`import.meta.env.DEV` is false there), so a crash costs a
 * developer their review surface rather than a user their page. They are smoked anyway because
 * they are where design decisions get made: a lab that will not load is a decision that does not
 * get taken, and it fails silently for exactly as long as nobody opens it.
 *
 * See `src/test/pageSmoke.tsx` for why these assert almost nothing.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage } from "./pageSmoke";

vi.mock("../lib/db", async () => (await import("./pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("./pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("./pageSmoke")).toastMock());

import { StatusDotDemo } from "../components/StatusDotDemo";
import { NotesLab } from "../components/notes/NotesLab";
import { DiaryLab } from "../components/dashboard/DiaryLab";
import { LabReading, LabImporting, LabOverview, LabReview } from "../components/onboarding/OnbLabImport";
import { SidebarShell } from "../components/shell/SidebarShell";

const surfaces: [hash: string, chrome: string, node: () => React.ReactElement][] = [
  ["#/status-dots", "StatusDot", () => <StatusDotDemo />],
  ["#/notes-lab", "Notes — lab", () => <NotesLab />],
  ["#/diary-lab", "Dates for the diary", () => <DiaryLab />],
  /* The import's steps live in `#/onb-lab` now (onboarding v5 part 2). The five older routes —
     #/import-review, #/import-review-dupes, #/import-loader, #/scatter-loader, #/reconcile-card —
     are deleted with their harnesses; each lab screen below is the payload one of them showed. */
  ["#/onb-lab?s=reading", "Reading your file", () => <LabReading hold="work" />],
  ["#/onb-lab?s=importing", "Setting up your dashboard", () => <LabImporting done={false} loop={false} />],
  ["#/onb-lab?s=overview", "", () => <LabOverview fx="review" title="Murphy's Day Out" />],
  ["#/onb-lab?s=review", "", () => <LabReview fx="review" />],
  ["#/onb-lab?s=review&fx=dupes", "", () => <LabReview fx="dupes" />],
];

describe("the DEV-only review surfaces render", () => {
  for (const [hash, chrome, node] of surfaces) {
    it(`${hash} renders without throwing`, () => {
      expect(() => renderPage(node())).not.toThrow();
    });
    if (chrome) {
      it(`${hash} produces its own chrome`, () => {
        expect(renderPage(node())).toContain(chrome);
      });
    }
  }
});

/**
 * ⚠️ THREE DEV HARNESSES CANNOT BE SMOKED, AND IT IS ONE FAULT WITH ONE SHAPE: each is a
 * module-private `const` inside `App.tsx` (`DrawerLab`, `ReadingPaneLab`, `ShellLab`), so no test
 * can import them. Exporting them is a one-line change each, but it is a change to App.tsx made
 * purely for tests, so it is FLAGGED rather than taken (reports/app-smoke.md). The two import
 * loaders' harnesses were on this list until onboarding v5 part 2 moved them into the lab, where
 * they are exported and smoked above.
 */
describe("the harnesses that cannot be imported — their payloads are smoked instead", () => {
  it("App.tsx keeps those three harnesses module-private, which is WHY they are not smoked", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    for (const name of ["DrawerLab", "ReadingPaneLab", "ShellLab"]) {
      expect(src, `${name} must be declared in App.tsx`).toContain(`const ${name}`);
      expect(src, `${name} is exported now — give it a real smoke and drop this exemption`)
        .not.toContain(`export const ${name}`);
    }
  });

  it("the five older import routes and their harnesses are gone from App.tsx", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    for (const gone of ["#/import-review", "#/import-loader", "#/scatter-loader", "#/reconcile-card", "ImportingLoaderDevHarness", "ScatterLoaderDevHarness"]) {
      expect(src, gone).not.toContain(gone);
    }
  });

  it("#/shell-lab's payload (SidebarShell) renders", () => {
    expect(() => renderPage(
      <SidebarShell activeTab="queries" onNavigate={() => {}} breadcrumb={["Queries Hub"]}><div /></SidebarShell>,
    )).not.toThrow();
  });
});
