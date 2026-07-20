/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD CONTRACT (Command Deck v2 P4 — supersedes the Variant-A rim/frame/band structure):
 * flat cards on the sheet (1px #d8cfc4 + the sheet shadow, radius 12, content-sized, flex:0 0
 * 250); band = identity + status only; body = content only; click anywhere opens; hover grows
 * the verb row downward as an overlay. Rule-text locks over todo.css + ToDoPage.tsx.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("The card contract — structure law (todo-deck-v2.html THE LAWS)", () => {
  it("flat on the sheet: 1px #d8cfc4, radius 12, the sheet shadow, flex:0 0 250 — never stretch, no fixed height", () => {
    for (const sel of [".tdb-tile", ".tdb-gcard"]) {
      const r = rule(sel);
      expect(r).toContain("flex: 0 0 var(--tdb-cardw)");
      expect(r).toContain("border: 1px solid #d8cfc4");
      expect(r).toContain("border-radius: 12px");
      expect(r).toContain("box-shadow: 0 2px 6px rgba(58, 28, 20, 0.07)");
      expect(r).not.toContain("min-height");
      expect(r).not.toContain("--reelw");
    }
    expect(css).toContain("--tdb-cardw: 250px");
  });
  it("band = identity + status only: tag + the sage ✓ TODAY chip; the LATTE housekeeping band", () => {
    expect(rule(".tdb-band.hk")).toContain("linear-gradient(180deg, var(--lat-1), var(--lat-2))");
    expect(rule(".tdb-band.hk")).toContain("var(--lat-bd)");
    expect(rule(".tdb-chipon")).toContain("linear-gradient(180deg, var(--hk-sage), var(--hk-sage-2))");
    expect(page).toContain('{committed && <span className="tdb-chipon">✓ TODAY</span>}');
    expect(page).not.toContain("tdb-tacts"); // no body pill
    expect(page).not.toContain("tdb-tmeta"); // body = content only (title + manuscript)
  });
  it("hover: ~150ms intent, 180ms ease, lift + the verb row as an ABSOLUTE overlay (no reflow)", () => {
    expect(page).toContain("window.setTimeout(() => setVerbKey(key), 150);");
    expect(rule(".tdb-tile")).toContain("transition: box-shadow 0.18s ease, transform 0.18s ease");
    const hov = rule(".tdb-tile.hov, .tdb-gcard.hov");
    expect(hov).toContain("box-shadow: 0 10px 26px rgba(58, 28, 20, 0.18)");
    expect(hov).toContain("transform: translateY(-2px)");
    expect(rule(".tdb-verbs")).toContain("position: absolute; top: calc(100% - 1px)");
  });
  it("verbs: unit [✓ DONE]·[＋/− TODAY]·[☾ LATER ▾]; batch [⚡ FIX n →]·[☾ LATER ▾]; offers keep no ✓", () => {
    expect(page).toContain('{!isOffer && <button type="button" className="tdb-verb pri" onClick={() => quickDone(c)}>✓ DONE</button>}');
    expect(page).toContain('{committed ? "− TODAY" : "＋ TODAY"}');
    expect(page).toContain(">⚡ FIX {g.members.length} →</button>");
    expect(page).toContain(">☾ LATER ▾</button>");
  });
  it("the Later menu — identical everywhere: tomorrow · a week · the per-type hide (restorable)", () => {
    expect(page).toContain(">Remind me tomorrow</button>");
    expect(page).toContain(">Give it a week</button>");
    expect(page).toContain(">Don’t show these again</button>");
    expect(page).toContain("snoozeCard(c, 1,");
    expect(page).toContain("snoozeCard(c, 7,");
    expect(page).toContain("hideType(c, hideKey)");
    expect(page).toContain("const hideKey = laterHideKey(c.taskType);");
  });
  it("click anywhere opens: unit → the journey; batch → the Batch-fix sheet; no footer CTA, no NEVER, no roundel buttons", () => {
    expect(page).toContain('onClick={() => openFlowCards([c])}');
    expect(page).toContain('onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}');
    for (const stale of ["tdb-gfix", "tdb-gnever", "tdb-qrail", "tdb-qbtn", "Batch fix →", ">Never</button>"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale.startsWith("tdb") ? stale : "zz-never-match");
    }
    expect(page).toContain('<div className="tdb-avs">'); // roundels display-only
  });
  it("the batch progress: #ece5d8 track, ink fill, mono meta", () => {
    expect(rule(".tdb-pbar")).toContain("background: #ece5d8");
    expect(rule(".tdb-pbar i")).toContain("background: var(--ink)");
  });
});
