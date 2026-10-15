/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.1 §E — the desk is a third host of the query-action journeys through ONE hook, and this asserts the
 * hook's two halves are still there. (The behaviour — the journey in the card, parity with the panel, parking — is
 * measured on the page: tests/e2e/todoV5.measure.ts E1, tests/e2e/todoV51.measure.ts E2 and E3.)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DESK_SLOT } from "./deskSlot";

const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const drawer = decls(readFileSync(join(__dirname, "..", "..", "queryActions", "QueryDrawer.tsx"), "utf8"));
const store = decls(readFileSync(join(__dirname, "..", "..", "..", "lib", "queryActions", "drawerStore.ts"), "utf8"));
const tray = decls(readFileSync(join(__dirname, "TodoTray.tsx"), "utf8"));

describe("TD5 E (unit) — the host hook", () => {
  it("a request may name its slot; the side panel's is the default", () => {
    expect(store).toMatch(/panel\?: \{[\s\S]*?slot\?: string;[\s\S]*?\};/);
    expect(drawer).toContain("document.querySelector(hostReq.panel.slot ?? SIDE_SLOT)");
  });
  it("a LIVE PARKED journey keeps its host — its portal is not moved, so Resume hands back its answers", () => {
    expect(drawer).toContain("const hostReq = req ?? (parked?.live ? parked.req : null);");
    expect(drawer).toContain("const inPanel = !!active?.panel && !!slot && slot.isConnected;");
  });
  it("the desk passes its own slot, and nothing else differs from the door", () => {
    expect(DESK_SLOT).toBe("[data-td5-slot]");
    expect(tray).toMatch(/panel: \{ name, agency: a\?\.agency \?\? "", first: [^}]*, back: false, slot: DESK_SLOT \}/);
    expect(tray).toContain("...door, receipt: true,");
  });
});
