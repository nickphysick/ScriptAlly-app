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
    const handler = flow.match(/const scrimClick = \(e: React\.MouseEvent\) => \{[\s\S]*?\};/)?.[0] ?? "";
    expect(handler).toContain("setNudged(true)");
    expect(handler).not.toContain("requestExit"); // the handler nudges, never closes
    expect(handler).not.toContain("onClose");
  });

  it("the dismiss guard branches on staged work: confirm when staged, immediate when clean", () => {
    expect(flow).toContain("if (staged.length && !(await confirmAsk("); // hero-pair P4: the styled ask
  });

  it("scroll locks for the journey's life via the app-wide mechanism; focus captures and returns to the invoker", () => {
    expect(flow).toContain("const release = lockStageScroll();");
    expect(flow).toContain("const invoker = document.activeElement as HTMLElement | null;");
    expect(flow).toContain("return () => { release(); invoker?.focus?.(); };");
  });

  it("the dialog is labelled by the current step heading; Tab is trapped within the sheet", () => {
    expect(flow).toContain('aria-labelledby="tdb-ff-heading"');
    expect(flow).toContain('e.key !== "Tab"');
  });
});
