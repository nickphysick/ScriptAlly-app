/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dim-scrim presentation contract (popup-notify-scrim P3; ref §3). The repo's testing policy
 * is logic-only (no component mounts), so the pack's behavioural tests are pinned at the
 * source/rule-text layer: the dismiss guard's staged-vs-clean branch, the focus capture/return,
 * scrim-click-nudges-never-closes, the scroll lock, and the CSS contract (scrim + blur fallback +
 * the 760px full-screen keep + the 860px sheet). Pixel/feel checks are Nick's in-browser list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "todo.css"), "utf8");
const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
/* ⚠️ THE OVERLAY OBLIGATIONS LEFT THIS FILE (§3). The focus capture and return, the stage-scroll
   lock and the Tab trap were the same twenty lines here and in TaskSettingsSheet.tsx; they are one
   primitive now. This file keeps asserting them — a guarantee does not stop mattering because it
   moved — but asserts them where they live, and asserts that FocusFlow composes it. */
const overlay = readFileSync(join(here, "..", "shell", "useOverlay.ts"), "utf8");

describe("dim-scrim presentation — source/rule-text locks", () => {
  it("the scrim: ~55% ink + blur, with a plain-dim fallback where backdrop-filter is unsupported", () => {
    expect(css).toContain("background: rgba(30, 26, 22, 0.55); backdrop-filter: blur(2px)");
    expect(css).toContain("@supports not (backdrop-filter: blur(2px))");
  });

  it("≤760px (width-only) keeps the full-screen opaque presentation", () => {
    expect(css).toMatch(/@media \(max-width: 760px\) \{\s*\n\s*\.tdb-ff \{ background: radial-gradient/);
  });

  it("the sheet is min(860px, 92vw), entering with the CSS fade+rise — no JS animation timers", () => {
    expect(css).toContain(".tdb-ffsheet { position: relative; width: min(860px, 92vw);");
    expect(css).toContain("animation: tdbArrive");
  });

  it("a scrim click NUDGES the sheet (1.015 pulse) and never reaches the dismiss path", () => {
    expect(css).toContain("@keyframes tdbNudge { 50% { transform: scale(1.015); } }");
    /* ⚠️ THE HANDLER IS THE PRIMITIVE'S ARGUMENT NOW, not a local const — and the MEANING is what
       this case is about, which is unchanged and is the one thing FocusFlow keeps for itself: a
       stray click on the scrim must never discard a staged model. TaskSettingsSheet passes the
       opposite, which is why the primitive takes a callback rather than assuming one. */
    const at = flow.indexOf("onScrimClick:");
    expect(at, "FocusFlow no longer states what a backdrop click means").toBeGreaterThan(-1);
    const handler = flow.slice(at, flow.indexOf("\n", at));
    expect(handler).toContain("setNudged(true)");
    expect(handler).not.toContain("requestExit"); // the handler nudges, never closes
    expect(handler).not.toContain("onClose");
  });

  it("the dismiss guard branches on staged work: confirm when staged, immediate when clean", () => {
    expect(flow).toContain("if (staged.length && !(await confirmAsk("); // hero-pair P4: the styled ask
  });

  it("scroll locks for the journey's life via the app-wide mechanism; focus captures and returns to the invoker", () => {
    expect(flow, "FocusFlow stopped composing the shared overlay").toContain("useOverlay(rootRef");
    expect(overlay, "the primitive stopped locking the stage").toContain("lockStageScroll()");
    expect(overlay, "the invoker is no longer captured before focus moves")
      .toContain("const invoker = document.activeElement as HTMLElement | null;");
    expect(overlay, "focus is no longer returned to the invoker").toContain("invoker?.focus?.();");
    /* ⚠️ AND RESTORED AFTER THE PAGE IS INTERACTIVE AGAIN — focusing into a still-`inert` subtree
       silently does nothing, so the order in the teardown is load-bearing. */
    /* ⚠️ ANCHORED THROUGH `useLayoutEffect` — `return () => {` occurs three times in that file. */
    const eff = overlay.indexOf("useLayoutEffect(");
    expect(eff, "the mount effect is missing").toBeGreaterThan(-1);
    const teardown = overlay.slice(overlay.indexOf("return () => {", eff), overlay.indexOf("}, []);", eff));
    expect(teardown, "the teardown was not found — this slice is testing nothing").toContain("unseal()");
    expect(teardown.indexOf("unseal()"), "focus is restored before the page is un-sealed")
      .toBeLessThan(teardown.indexOf("invoker?.focus?.()"));
  });

  it("the dialog is labelled by the current step heading; Tab is trapped within the sheet", () => {
    expect(flow).toContain('aria-labelledby="tdb-ff-heading"');
    expect(flow, "the trap is no longer wired to the root").toContain("onKeyDown={trapTab}");
    expect(overlay, "the trap stopped keying on Tab").toContain('e.key !== "Tab"');
  });
});
