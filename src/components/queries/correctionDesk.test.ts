/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer cut 2 · §3 — the desk HOSTS the correction flow; it re-implements none of it.
 *
 * Geometry (the notch on the rung's centre, the clamp, Esc's focus return) is measured on the
 * rendered page — tests/e2e/queryDrawerDesk.measure.ts — because a notch's y-position is not a
 * fact a source file can state. What THIS file locks is structure: which components mount where,
 * and which chassis paints what.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) =>
  readFileSync(join(process.cwd(), p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("§3 · the desk hosts the existing components", () => {
  const page = read("src/components/Queries.tsx");
  const host = (() => {
    const at = page.indexOf("<CorrectionDesk");
    expect(at, "the desk host is missing from the page").toBeGreaterThan(-1);
    const end = page.indexOf("</CorrectionDesk>", at);
    expect(end, "the desk host is unterminated").toBeGreaterThan(at);
    return page.slice(at, end);
  })();

  it("the fork, the edit form and the consequence sheet all mount INSIDE the desk", () => {
    for (const c of ["<CorrectionFork", "<CorrectionEdit", "<ConsequenceSheet"]) {
      expect(host, `${c} is not hosted by the desk`).toContain(c);
    }
  });

  it("the centred scrim host is gone from the page — the desk replaced it, not joined it", () => {
    expect(page, "cor-scrim survives — two hosts for one flow").not.toContain("cor-scrim");
  });

  it("Move mounts from the desk (ruling 1 — reversing decision 5)", () => {
    const fork = host.slice(host.indexOf("<CorrectionFork"), host.indexOf("/>", host.indexOf("<CorrectionFork")));
    expect(fork, "onMove is unwired — Move unreachable again").toContain("onMove={moveTargetsFor().length");
    /* and its two steps render INSIDE the desk, not in some second host */
    expect(host).toContain("<MovePicker");
    expect(host).toContain("<MoveSheet");
  });

  it("ruling 2 — the send's materials save through the previewed commit, never directly", () => {
    /* the slot is passed only on the send entry, and the fields component is PURE — it owns no
       write: a live write from a field would be the withdrawn direct-edit shortcut back under the
       desk's roof. */
    expect(host).toContain("extraFields={editingSend && deskMats");
    const fields = read("src/components/queries/CorrectionDesk.tsx");
    const mf = fields.slice(fields.indexOf("export const MaterialsFields"));
    for (const w of ["updateQuery", "editActivity", "addDoc", "setDoc"]) {
      expect(mf, `MaterialsFields performs its own write (${w})`).not.toContain(w);
    }
    /* the write sits inside `commit` — the closure the preview sanctions — and the undo restores
       BOTH halves. ⚠️ SLICED PER CLOSURE, because a lazy [\s\S]*? from `commit` ran straight into
       the UNDO's own restore line and matched there — a mutation that moved the write OUT of the
       commit (a live write at Save-press) passed green. Proved, then bounded. */
    const before = host.slice(host.indexOf("const nextMats"), host.indexOf("const commit = async"));
    expect(before, "a materials write escapes the previewed commit — live at Save-press").not.toContain("updateQuery(");
    const commitBody = host.slice(host.indexOf("const commit = async"), host.indexOf("await finishCorrection("));
    expect(commitBody, "the commit closure does not carry the materials half").toContain("if (matsChanged) await updateQuery");
    const undoBody = host.slice(host.indexOf("await finishCorrection("), host.indexOf("if (diff.empty)"));
    expect(undoBody, "the undo does not restore the materials half").toContain("materialsWanted: wasMats");
  });

  it("the collapsed fork sits above the edit form, and 'change' reopens the fork", () => {
    const editAt = host.indexOf("<CorrectionEdit");
    const stepAt = host.indexOf("qcd-step");
    expect(stepAt, "the collapsed-fork row is missing").toBeGreaterThan(-1);
    expect(stepAt, "the collapsed fork renders below the edit form").toBeLessThan(editAt);
    expect(host).toMatch(/qcd-chg[\s\S]{0,200}step: "fork"/);
  });
});

describe("§3 · the desk's chassis", () => {
  const css = read("src/components/queries/correctionDesk.css");
  const desk = read("src/components/queries/CorrectionDesk.tsx");

  it("the top strip is the drawer's own accent — one variable, not a second colour", () => {
    expect(css).toMatch(/\.qcd-card[^{]*\{[^}]*border-top:\s*5px solid var\(--stage-accent/);
    /* and the desk root carries the stage class so the accent RESOLVES outside the drawer —
       the drawer's transform makes it a containing block the desk cannot live inside */
    expect(desk).toContain("qcc--s-${stage}");
  });

  it("the sheet chassis is neutralised INSIDE the desk — markup untouched, chrome un-doubled", () => {
    expect(css).toMatch(/\.qcd \.cor-sheet\s*\{[^}]*border:\s*none/);
    expect(css).toMatch(/\.qcd \.cor-top\s*\{\s*display:\s*none/);
  });

  it("Escape is captured — the drawer behind must not also close", () => {
    expect(desk).toContain('addEventListener("keydown", onKey, true)');
    expect(desk).toContain("stopImmediatePropagation");
  });

  it("focus returns to the trigger on unmount", () => {
    expect(desk).toContain("returnTo?.focus()");
  });

  it("the slide respects prefers-reduced-motion", () => {
    expect(css).toMatch(/prefers-reduced-motion[\s\S]{0,120}\.qcd-card\s*\{\s*animation:\s*none/);
  });
});
