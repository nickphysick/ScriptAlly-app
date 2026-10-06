/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LOCK 10 — EditAgentDrawer retires (Agent card v1 §8; the card is the only agent editor).
 *
 * The rendered half is in tests/e2e/agentCardV1.measure.ts (the Query Centre's "Edit agent" opens
 * the card over the page). This is the half no page can carry. The dashboard's data-quality door
 * (`TaskPanelCard`) sits under `renderTasksSidebarWidget`, which nothing calls, so it renders
 * nowhere. Its wiring is held here, and the target it computes is held against Housekeeping's own,
 * two derivations checked against each other, so a gap opens on the same tab and field from either door.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { sliceBetween } from "../../../test/sliceBetween";
import { dataNeedTarget } from "../../../lib/agentCardStore";
import { agentDataQualityNeeds, type AgentDataNeed } from "../../../lib/agentDataQuality";
import { GAP_TARGET } from "../../../lib/contactHousekeeping";

const SRC = resolve(process.cwd(), "src");
const read = (p: string) => readFileSync(resolve(SRC, p), "utf8");
/* code, not prose: every retirement here is documented by quoting what it retired */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe("lock 10 — the old agent drawer is gone", () => {
  it("EditAgentDrawer.tsx and EditAgentHost.tsx no longer exist", () => {
    expect(existsSync(resolve(SRC, "components/EditAgentDrawer.tsx"))).toBe(false);
    expect(existsSync(resolve(SRC, "components/EditAgentHost.tsx"))).toBe(false);
  });

  it("no source imports them, or the hook the host exported", () => {
    const files = sources(SRC);
    expect(files.length, "population first").toBeGreaterThan(300);
    const offenders = files.filter((f) => /\bEditAgentDrawer\b|\bEditAgentHost\b|\buseOpenEditAgent\b/.test(code(readFileSync(f, "utf8"))));
    expect(offenders).toEqual([]);
  });

  it("the dashboard's data-quality door opens the card at the agent's first gap, from the task", () => {
    const click = code(sliceBetween(read("components/Dashboard.tsx"), "const handleActionClick", "const handleDismiss", "TaskPanelCard's action"));
    expect(click).toMatch(/taskType === "data_quality_poor"/);
    expect(click).toMatch(/openAgentCard\(task\.relatedRecordId,\s*\{[^}]*dataNeedTarget\(agentDataQualityNeeds\(ag\)\)[^}]*from: "task"/);
  });

  it("the Query Centre's Edit agent opens the card from the QC", () => {
    expect(code(read("components/Queries.tsx"))).toMatch(/onEditAgent=\{\(\) => openAgentCard\(activeAgent\.id, \{ from: "qc" \}\)\}/);
  });
});

describe("dataNeedTarget — the data-quality task's landing", () => {
  /* inputs built through the real derivation, never a hand-written need list */
  const full = { responseTimeWeeks: 8, materialsWanted: ["Query letter"], mswlNotes: "Voice-led literary fiction." };
  const at = (a: Parameters<typeof agentDataQualityNeeds>[0]) => dataNeedTarget(agentDataQualityNeeds(a));

  it("lands on the FIRST gap the agent still has, in the needs' own order", () => {
    expect(at({ ...full, responseTimeWeeks: 0 })).toEqual({ tab: "work", focus: "reply" });
    expect(at({ ...full, materialsWanted: [] })).toEqual({ tab: "want", focus: "materials" });
    expect(at({ ...full, mswlNotes: "" })).toEqual({ tab: "want", focus: "wishlist" });
    expect(at({ responseTimeWeeks: 0, materialsWanted: [], mswlNotes: "" })).toEqual({ tab: "work", focus: "reply" });
  });

  it("with no gap left the task is stale, so it opens the quick view (null), not an editor aimed at nothing", () => {
    expect(at(full)).toBeNull();
  });

  it("agrees with Housekeeping's Add targets, so one gap opens one place from either door", () => {
    const HK: Record<AgentDataNeed, keyof typeof GAP_TARGET> = { responseTime: "reply", materials: "materials", mswl: "wishlist" };
    for (const need of Object.keys(HK) as AgentDataNeed[]) {
      expect(dataNeedTarget([need]), need).toEqual({ tab: GAP_TARGET[HK[need]].tab, focus: GAP_TARGET[HK[need]].focus });
    }
  });
});
