/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LH6, source half — no exhibit module reaches data. Kept in a file that IMPORTS NONE OF THEM, so the
 * mutation this lock exists for (an exhibit wired to the store) fails HERE as an assertion rather
 * than as a collect-time crash of the render half, which would say nothing about why.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const FILES = [
  "src/components/queries/centre/QcExhibit.tsx",
  "src/components/agents/contact/ContactExhibit.tsx",
  "src/components/shell/LivingExhibition.tsx",
];
const DATA_PATHS = [/useScriptAllyDb/, /from "[^"]*lib\/db"/, /firebase/, /\bfetch\(/, /onSnapshot/, /getDocs?\(/, /useContext\(/];

describe("LH6 · the exhibition reads nothing but its constant (source)", () => {
  it("no exhibit module reaches data — the store, Firestore, fetch or a listener", () => {
    for (const f of FILES) {
      const s = src(f);
      expect(s.length, `${f} is empty`).toBeGreaterThan(200);
      for (const re of DATA_PATHS) expect(s, `${f} reaches data: ${re}`).not.toMatch(re);
    }
  });
  it("each exhibit is mounted only by its page's EMPTY state", () => {
    const qc = src("src/components/Queries.tsx");
    const cl = src("src/components/agents/AgentList.tsx");
    expect(qc.split("<QcExhibit").length - 1).toBe(1);
    expect(cl.split("<ContactExhibit").length - 1).toBe(1);
    expect(qc.slice(qc.indexOf("<QcEmpty"), qc.indexOf("<QcExhibit"))).not.toContain("</QcEmpty>");
    expect(cl.slice(cl.indexOf("<ContactEmpty"), cl.indexOf("<ContactExhibit"))).not.toContain("</ContactEmpty>");
    expect(qc.indexOf("<QcEmpty")).toBeGreaterThan(-1);
    expect(cl.indexOf("<ContactEmpty")).toBeGreaterThan(-1);
  });
});
