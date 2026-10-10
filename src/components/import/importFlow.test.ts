/**
 * IP1 · P2 — one import flow. Every host mounts `ImportFlow`; none keeps a second copy of the
 * import's handlers or of the loaders' mounts.
 * Named mutation: leave `handleImport` in BranchB.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const code = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const FLOW = "src/components/import/ImportFlow.tsx";
/** The files that host the import. The Import page joins the list when it exists (Phase 2). */
export const HOSTS = ["src/components/onboarding/BranchB.tsx", "src/components/import/ImportPage.tsx"].filter((f) => existsSync(resolve(process.cwd(), f)));
const ONLY_IN_FLOW = ["const runMapping", "const handleImport", "const pickFile", "const pickTemplateFile", "<ScatterSettleLoader", "<ImportingLoader", "<SmartImportReview", "<ImportOverview", "commitSmartImport(", "runSmartImport(", "readTemplateFile(", "saveImportNotice(", "delay("];

describe("P2 · one import flow", () => {
  it("the flow holds the import's handlers and mounts", () => {
    const flow = code(FLOW);
    for (const s of ONLY_IN_FLOW) expect(flow, s).toContain(s);
  });
  it("every host mounts ImportFlow and keeps no copy of its own", () => {
    expect(HOSTS.length, "at least set-up hosts it").toBeGreaterThanOrEqual(1);
    for (const host of HOSTS) {
      const src = code(host);
      expect(src, `${host} mounts the flow`).toContain("<ImportFlow");
      for (const s of ONLY_IN_FLOW) expect(src, `${host} has no ${s}`).not.toContain(s);
    }
  });
});
