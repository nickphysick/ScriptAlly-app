/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the DEV-only hash surfaces (`#/status-dots`, `#/notes-lab`, `#/pkg-lab`, …).
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
import { PkgLab } from "../components/packages/PkgLab";
import { DiaryLab } from "../components/dashboard/DiaryLab";
import { SmartImportReview } from "../components/onboarding/SmartImportReview";
import { REVIEW_FIXTURE } from "../components/onboarding/SmartImportReviewFixture";
import { ReconcileCardDevPreview } from "../components/onboarding/ReconcileCard";
import { ImportingLoader } from "../components/onboarding/ImportingLoader";
import { ScatterSettleLoader } from "../components/onboarding/ScatterSettleLoader";
import { SidebarShell } from "../components/shell/SidebarShell";

const surfaces: [hash: string, chrome: string, node: () => React.ReactElement][] = [
  ["#/status-dots", "StatusDot", () => <StatusDotDemo />],
  ["#/notes-lab", "Notes — lab", () => <NotesLab />],
  ["#/pkg-lab", "Package Workshop", () => <PkgLab />],
  ["#/diary-lab", "Dates for the diary", () => <DiaryLab />],
  ["#/import-review", "", () => <SmartImportReview result={REVIEW_FIXTURE} userName="Nick" onSkip={() => {}} />],
  ["#/reconcile-card", "Duplicates", () => <ReconcileCardDevPreview />],
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
 * ⚠️ FIVE DEV HARNESSES CANNOT BE SMOKED, AND IT IS ONE FAULT WITH ONE SHAPE: each is a
 * module-private `const` inside `App.tsx` (`ImportingLoaderDevHarness`, `ScatterLoaderDevHarness`,
 * `DrawerLab`, `ReadingPaneLab`, `ShellLab`), so no test can import them. Exporting them is a
 * one-line change each, but it is a change to App.tsx made purely for tests, so it is FLAGGED
 * rather than taken (reports/app-smoke.md).
 *
 * The reason is asserted here rather than dropped — and the harnesses' PAYLOADS are smoked, which
 * is where the code that can actually break lives. A wrapper that only picks props and flips a
 * boolean on an interval is not what breaks; the component it wraps is.
 */
describe("the harnesses that cannot be imported — their payloads are smoked instead", () => {
  it("App.tsx keeps those five harnesses module-private, which is WHY they are not smoked", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    for (const name of [
      "ImportingLoaderDevHarness", "ScatterLoaderDevHarness",
      "DrawerLab", "ReadingPaneLab", "ShellLab",
    ]) {
      expect(src, `${name} must be declared in App.tsx`).toContain(`const ${name}`);
      // If this ever fails because the harness gained an `export`, delete it from this list and
      // give it a real render smoke above — the reason for the exemption has gone.
      expect(src, `${name} is exported now — give it a real smoke and drop this exemption`)
        .not.toContain(`export const ${name}`);
    }
  });

  it("#/import-loader's payload (ImportingLoader) renders", () => {
    expect(() => renderPage(<ImportingLoader complete={false} onProceed={() => {}} userName="Nick" />)).not.toThrow();
  });

  it("#/scatter-loader's payload (ScatterSettleLoader) renders", () => {
    expect(() => renderPage(
      <ScatterSettleLoader cards={[]} complete={false} total={0} onProceed={() => {}} onTimeout={() => {}} />,
    )).not.toThrow();
  });

  it("#/shell-lab's payload (SidebarShell) renders", () => {
    expect(() => renderPage(
      <SidebarShell activeTab="queries" onNavigate={() => {}} breadcrumb={["Queries Hub"]}><div /></SidebarShell>,
    )).not.toThrow();
  });
});
