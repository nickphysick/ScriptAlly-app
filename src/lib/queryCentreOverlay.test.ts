/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · §3 — WHAT AN OVERLAY OWES THE USER.
 *
 * The takeover owed none of this: it was a page region, and a page region does not trap focus or
 * seal what is behind it because there is nothing behind it. A sheet is a real overlay, and the
 * obligations arrive with the form.
 *
 * ⚠️ EVERY LINE OF THE MECHANISM IS AN EXTRACTION, and that is the first thing locked here. It
 * existed twice — `todo/FocusFlow.tsx` and `todo/TaskSettingsSheet.tsx`, the same twenty lines
 * copied — and the whole point of §3 is that there is now ONE of it and every call site uses it.
 * A primitive that ships beside a surviving copy is another copy.
 *
 * ⚠️ THE LAW IS DERIVED NOW, NOT SPECIMEN-BY-SPECIMEN. It used to name its two subjects, and one of
 * them — `TaskSettingsSheet` — was retired, which would have taken the assertion with it: a lock
 * that names its examples goes stale the day an example leaves, and the tempting fix is to delete
 * the half that no longer resolves. So it scans `src/` for callers of `useOverlay(` and asserts
 * over WHATEVER IT FINDS. A new sheet is covered the moment it composes the primitive, and no
 * retirement can quietly narrow the rule.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import { emptyDraft, draftDirty } from "./queryDraft";
import { emptyResponseDraft } from "./responseDraft";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const overlay = read("../components/shell/useOverlay.ts");
const sheet = read("../components/queries/QueryJourneySheet.tsx");
const queries = read("../components/Queries.tsx");
const flow = read("../components/todo/FocusFlow.tsx");

/** Every file under `src/` that composes the overlay primitive, found rather than listed. */
function overlayCallers(): { name: string; src: string }[] {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const out: { name: string; src: string }[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.tsx?$/.test(e.name) || /\.test\./.test(e.name)) continue;
      const src = readFileSync(full, "utf8");
      if (src.includes("useOverlay(") && !full.endsWith("useOverlay.ts")) out.push({ name: e.name, src });
    }
  };
  walk(root);
  return out;
}
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const overlayCode = overlay.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("§3 · the extraction actually replaced both copies", () => {
  it("every caller composes the primitive and keeps no copy of it", () => {
    const callers = overlayCallers();
    /* ⚠️ THE POPULATION IS ASSERTED FIRST. An empty list satisfies every claim below it and would
       pass having checked nothing — the vacuous-set shape this repo keeps meeting. */
    expect(callers.length, "no useOverlay callers found — the scan is measuring nothing").toBeGreaterThan(1);
    for (const { name, src } of callers) {
      expect(src, `${name} does not compose the primitive`).toContain("useOverlay(rootRef");
      /* the tell-tale lines of the inlined version — if any survive, the extraction added a third
         implementation instead of removing two */
      expect(src, `${name} kept its own scroll lock`).not.toContain("lockStageScroll()");
      expect(src, `${name} kept its own Tab trap`).not.toContain('e.key !== "Tab"');
      expect(src, `${name} kept its own focus capture`).not.toContain("document.activeElement as HTMLElement | null");
    }
  });

  /* ⚠️ THE TWO COPIES DIFFERED IN ONE REAL WAY, and preserving it is why the primitive takes a
     callback rather than assuming a meaning. FocusFlow holds a STAGED model a stray click must not
     discard, so its backdrop click nudges; the settings sheet has written everything already, so
     its backdrop click closes. Collapsing them would have been a silent behaviour change. */
  it("the one real difference between them survived the merge", () => {
    expect(flow, "FocusFlow's backdrop stopped nudging — a stray click would discard staged work")
      .toMatch(/onScrimClick:[^\n]*setNudged\(true\)/);
    /* ⚠️ THE SPECIMEN FOR "closes on a stray click" IS THE JOURNEY SHEET NOW. The settings sheet
       was the original, and it is retired; the law is about the DIFFERENCE surviving, not about
       which file demonstrates it, and the journey sheet carries the same meaning — nothing is
       staged, so a backdrop click closes. */
    expect(sheet, "the journey sheet's backdrop stopped closing").toMatch(/onScrimClick:\s*onRequestClose/);
  });

  /* ⚠️ AND ONE ACCIDENTAL DIFFERENCE DID NOT. One selector list had `select` and `textarea` and the
     other did not, so Tab walked straight out of the settings sheet the moment anything with a
     dropdown went into it — and it has a dropdown. The union is taken; that is a bug fixed by the
     merge, not a decision preserved by it. */
  it("the focusable set is the union, so no sheet leaks Tab through its own controls", () => {
    for (const sel of ["button", "[href]", "input", "select", "textarea", '[tabindex]:not([tabindex="-1"])']) {
      expect(overlay, `${sel} left the focusable set`).toContain(sel);
    }
  });
});

describe("§3 · focus is trapped, and returned to what opened it", () => {
  it("the invoker is captured before focus moves, and restored on teardown", () => {
    expect(overlay).toContain("const invoker = document.activeElement as HTMLElement | null;");
    expect(overlay, "focus is not returned to the trigger").toContain("invoker?.focus?.();");
    /* ⚠️ LAYOUT EFFECT, NOT EFFECT. The invoker must be read before the browser has moved focus,
       and the root must take focus in the frame it appears — otherwise the first Tab is measured
       against whatever was focused on the page behind. */
    expect(overlay, "the capture was deferred a frame").toContain("useLayoutEffect(");
  });

  /* ⚠️ ORDER IS LOAD-BEARING IN THE TEARDOWN: focusing a node inside a subtree that is still
     `inert` silently does nothing, so the page has to be un-sealed first. */
  it("the page is un-sealed before focus is restored into it", () => {
    /* ⚠️ ANCHORED THROUGH `useLayoutEffect`, NOT ON `return () => {` — which occurs three times in
       that file (the seal's two early exits and this effect), so a bare anchor reads whichever is
       written first. Caught by `testAnchors`, this repo's meta-lock for exactly this. */
    const eff = overlay.indexOf("useLayoutEffect(");
    expect(eff, "the mount effect is missing").toBeGreaterThan(-1);
    const teardown = overlay.slice(overlay.indexOf("return () => {", eff), overlay.indexOf("}, []);", eff));
    expect(teardown, "the teardown was not found — this slice is testing nothing").toContain("unseal()");
    expect(teardown.indexOf("unseal()")).toBeLessThan(teardown.indexOf("invoker?.focus?.()"));
  });

  it("the trap wraps at both ends, counting the root itself as the start", () => {
    expect(overlay, "forward wrap is missing").toContain("document.activeElement === last");
    /* the root holds focus on open, so the first Shift+Tab must wrap to the end rather than fall
       out of the overlay entirely */
    expect(overlay).toContain("document.activeElement === first || document.activeElement === root");
    expect(overlay, "the trap stopped preventing the default walk").toContain("e.preventDefault()");
  });

  it("the sheet wires the trap and is a labelled modal dialog", () => {
    expect(sheet).toContain("onKeyDown={trapTab}");
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain("aria-label={ariaLabel}");
    /* focusable itself, or `rootRef.current?.focus()` would do nothing */
    expect(sheet, "the root cannot take focus, so the trap has no start").toContain("tabIndex={-1}");
  });
});

describe("§3 · the desk behind is sealed, and un-sealed exactly once", () => {
  it("the background is made inert, not merely aria-hidden", () => {
    expect(overlay, "the app root is not sealed").toContain('document.getElementById("root")');
    expect(overlay, "`inert` is what removes it from BOTH the tab order and the accessibility tree")
      .toContain('setAttribute("inert", "")');
    expect(overlay).toContain('removeAttribute("inert")');
  });

  /**
   * ⚠️ REFERENCE-COUNTED, AND THIS IS THE CASE THAT MATTERS. `inert` is one attribute on one shared
   * node. The naive add-on-mount / remove-on-unmount un-seals the page the moment ANY overlay
   * closes — and the Query Centre sheet is routinely open underneath its own discard confirm, so
   * the confirm closing would hand the still-covered desk back to Tab and to assistive technology.
   */
  it("two overlays open at once do not un-seal the page when the first closes", () => {
    expect(overlay, "the seal is not counted").toContain("inertDepth");
    expect(overlay, "the seal is set on every open rather than the first").toContain("if (inertDepth === 1)");
    expect(overlay, "the seal is lifted on every close rather than the last").toContain("if (inertDepth === 0)");
    /* and it cannot go negative, or an extra teardown would leave the page sealed forever */
    expect(overlay, "an unbalanced release could drive the count negative and strand the seal")
      .toContain("Math.max(0, inertDepth - 1)");
  });

  it("the stage's scroll is locked for the overlay's life and released with it", () => {
    expect(overlay).toContain("const releaseScroll = lockStageScroll();");
    expect(overlay, "the lock is never released").toContain("releaseScroll();");
    expect(overlay, "the lock stopped using the app-wide mechanism")
      .toContain('from "../../lib/stageScroll"');
  });
});

describe("§3 · Escape and the backdrop, both through the guard", () => {
  /* ⚠️ WINDOW-BOUND AND ARMED AT MOUNT, so Escape works during the 420ms lay-down — before anything
     inside has been focused. A writer who opened this by accident should not have to watch it
     arrive before undoing it. */
  it("Escape is live from the first frame of the entrance", () => {
    expect(overlay).toContain('window.addEventListener("keydown", onKey, captureEscape)');
    expect(overlay, "Escape was gated on the entrance finishing").not.toMatch(/entering|Entering/);
  });

  /* ⚠️ NOT CAPTURED, and that is a decision. `captureEscape` exists for chrome sitting over a page
     that owns the key for something else; this sheet IS the page's current business, so swallowing
     the key on the capture phase would reach past it into handlers with a right to it. */
  it("the sheet does not capture Escape", () => {
    expect(sheet, "the sheet started swallowing Escape for the whole document")
      .not.toContain("captureEscape: true");
  });

  it("Escape, the backdrop and Cancel are ONE exit", () => {
    /* all three call the same handler, so there is one idea of what leaving means */
    expect(sheet).toContain("onEscape: onRequestClose");
    expect(sheet).toContain("onScrimClick: onRequestClose");
    expect(code, "the page's exit is not routed into the sheet")
      .toContain("onRequestClose={() => (recording ? closeRecord() : closeCreate())}");
    expect(code, "Cancel stopped calling the same handler").toContain("onClick={() => closeRecord()}");
    expect(code, "Cancel stopped calling the same handler").toContain("onClick={() => closeCreate()}");
  });

  /* ⚠️ EXACTLY ONE Escape LISTENER. Two, both calling `closeCreate()`, would run the dirty guard
     twice: two confirms on one keypress, the second asking about a draft the first has discarded.
     The page's own two effects were deleted when the sheet took the key. */
  it("the page keeps no Escape handler of its own", () => {
    expect(code, "a second Escape handler came back").not.toMatch(/e\.key !== "Escape"/);
    expect(code, "a second Escape handler came back").not.toMatch(/e\.key === "Escape"/);
  });

  /* ⚠️ THE TARGET MUST *BE* THE BACKDROP, never merely be inside it — a `closest()` test would make
     every click in the sheet a backdrop click, because the backdrop is the ancestor of everything. */
  it("the backdrop test matches the backdrop itself, not its descendants", () => {
    expect(overlay).toContain("t.classList.contains(c)");
    /* ⚠️ COMMENT-STRIPPED. The primitive WARNS about `closest()` in prose directly above the line
       being asserted, so a raw scan fails on the warning. Fifth time this shape has bitten in this
       repo — a rule about code is asserted against code, always. */
    expect(overlayCode, "the backdrop test started matching ancestors").not.toContain("closest(");
    expect(sheet, "the sheet's backdrop set is wrong")
      .toContain('scrimClasses: ["qc-sheet-layer", "qc-sheet-scrim"]');
  });
});

describe("§3 · the dirty guard is inherited, never rebuilt", () => {
  /* ⚠️ IT ALREADY EXISTED, for both journeys, and §3 adds routes into it rather than a second copy
     of it. `closeCreate` / `closeRecord` diff the draft against the baseline captured at open and
     confirm only when it differs. */
  it("both closers diff against the baseline and confirm only when dirty", () => {
    expect(code, "create's dirty check went").toContain("draftDirty(createDraft, createBase)");
    expect(code, "record's dirty check went")
      .toContain("JSON.stringify(respDraft) !== JSON.stringify(respBase)");
    expect(code, "the guard stopped going through the shared confirm").toContain("showConfirm({");
  });

  it("a clean sheet closes with no confirm — the guard is inside the dirty branch", () => {
    const at = code.indexOf("const closeRecord = () => {");
    expect(at, "closeRecord is missing").toBeGreaterThan(-1);
    const body = code.slice(at, code.indexOf("\n  };", at));
    expect(body, "the confirm escaped the dirty branch — an untouched sheet would ask")
      .toMatch(/if \(dirty\) \{[\s\S]*showConfirm/);
  });

  /**
   * ⚠️ SEEDED DEFAULTS ARE NOT DIRTY, AND THE MECHANISM IS THAT THE BASELINE *IS* THE SEED. Both
   * openers build one object and store it as the draft AND as the baseline, so anything seeded is
   * equal to itself and the diff is empty. Nothing enumerates "which fields are seeds" — an
   * enumeration would need updating every time a seed was added, and would be wrong quietly.
   *
   * The seeds this covers, for the record: create — today's date, the EMAIL send method, the house
   * nudge preset, the agent's materials, and any agent/manuscript the caller preselected; record —
   * today's arrival date.
   */
  it("the seeds cannot be dirty, because the baseline is the same object", () => {
    const seeded = emptyDraft({ agentId: "a1", manuscriptId: "m1" });
    expect(draftDirty(seeded, seeded), "a freshly seeded draft read as dirty").toBe(false);
    /* and the seeds really are populated — a baseline of an empty object would pass vacuously */
    expect(seeded.dateSent, "today's date is not seeded").toBeTruthy();
    expect(seeded.sendMethod, "the send method is not seeded").toBeTruthy();
    expect(seeded.reminder, "the house nudge is not seeded").toBeTruthy();

    const resp = emptyResponseDraft("2026-08-13");
    expect(JSON.stringify(resp) === JSON.stringify(emptyResponseDraft("2026-08-13")),
      "a freshly seeded response draft read as dirty").toBe(true);
    expect(resp.dateArrived, "the arrival date is not seeded").toBe("2026-08-13");
  });

  it("at source, the draft and the baseline are set from one value", () => {
    for (const opener of ["setCreateBase(base);", "setRespBase(base);"]) {
      expect(code, `${opener} is missing — a seeded field could read as an edit`).toContain(opener);
    }
    expect(code).toContain("setCreateDraft(base);");
    expect(code).toContain("setRespDraft(base);");
  });

  /* ⚠️ NO DRAFT STORE, and no hook left for one. The minimal save IS the draft mechanism; a guard
     covers accidental exit. A persisted draft would need its own lifecycle, its own staleness rule
     and its own answer to "which one is the real query". */
  it("nothing persists a draft", () => {
    for (const smell of ["localStorage.setItem(\"sa.queryDraft", "draftStore", "persistDraft"]) {
      expect(code, `${smell} — a draft store arrived`).not.toContain(smell);
    }
  });
});
