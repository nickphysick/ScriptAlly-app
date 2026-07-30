/**
 * Agent list mobile locks (Mobile Pass 1, Phase 3; ref design-refs/mobile-concept-v1.html
 * frame 05). Source/CSS locks in the house idiom — layout is a phone check (run report).
 *
 * The invariants: below md the grid is single-column, the 3D flip is SUPPRESSED (baked
 * decision 6 — the editor pushes full-screen instead, same draft buffer, same one-commit
 * Done), the shell bar carries Done/Cancel, and the toolbar popovers present in the sheet.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "./agentList.css"), "utf8");
const list = readFileSync(resolve(__dirname, "./AgentList.tsx"), "utf8");
const toolbar = readFileSync(resolve(__dirname, "./AgentToolbar.tsx"), "utf8");

describe("breakpoint law — md is the one mobile/desktop divider", () => {
  it("the 700/640 hand-rolled breakpoints are migrated; desktop-side 900/1100 stay", () => {
    expect(css).not.toContain("max-width: 700px");
    expect(css).not.toContain("max-width: 640px");
    expect(css).toContain("@media (max-width: 767.98px) { .aglist .agl-grid { grid-template-columns: 1fr; } }");
    expect(css).toContain("@media (max-width: 1100px) { .aglist .agl-grid { grid-template-columns: repeat(2, 1fr); } }");
    expect(css).toContain("max-width: 900px");
  });
});

describe("the editor push (baked decision 6) — no 3D flip below md", () => {
  it("the card never flips on mobile and carries no editor face there", () => {
    expect(list).toContain("flipped={!isMobile && flippedId === agent.id && saveState?.id !== agent.id}");
    expect(list).toContain("editor={!isMobile ? editorFor(agent) : null}");
  });

  it("the push renders the SAME editor element in flow, replacing the list", () => {
    expect(list).toContain('<div className="agl-mpush">{editorFor(pushAgent)}</div>');
    expect(list).toContain("agl-page${mobilePushOpen ? \" agl-mpushed\" : \"\"}");
    const mobileBlock = css.split("@media (max-width: 767.98px)")[2] ?? ""; // grid → page-pad → push
    expect(css.split("@media (max-width: 767.98px)").length, "three <md blocks").toBeGreaterThan(3);
    expect(css).toContain(".aglist .agl-mpushed { display: none; }");
    expect(css).toContain(".aglist .agl-mpush { display: none; }"); // md+ never sees it
  });

  it("back preserves scroll: the list's scrollTop is saved on push and restored on return", () => {
    expect(list).toContain("listScrollMemo.current = el.scrollTop");
    expect(list).toContain("el.scrollTop = listScrollMemo.current");
  });

  it("Done/Cancel live in the shell bar via the MobileDetailSpec seam", () => {
    expect(list).toContain('setMobileDetail("agents", {');
    expect(list).toContain('kind: "editor"');
    expect(list).toContain("onCancel: discard");
    expect(list).toContain("onDone: () => void onDone()");
    expect(list).toContain('setMobileDetail("agents", null)');
  });

  it("the rotor keeps its locked flip physics — untouched by the pass", () => {
    expect(css).toContain(".aglist .agl-rotor.flipped { transform: rotateY(180deg); height: 580px; }");
    // and the mobile block never styles the rotor (any overflow would flatten the 3D context)
    const push = css.match(/MOBILE \(Mobile Pass 1[\s\S]*$/)?.[0] ?? "";
    expect(push, "the mobile block must exist").not.toBe("");
    expect(push).not.toContain("agl-rotor");
  });
});

describe("toolbar popovers present in the sheet below md", () => {
  it("the same panel children render in MobileSheet, wrapped for the .aglist scope", () => {
    expect(toolbar).toContain('from "../shell/MobileSheet"');
    expect(toolbar).toContain('<div className="aglist agl-inpop">{children}</div>');
    expect(toolbar).toContain("open && !isMobile");
    // the anchored popover's outside-click/Escape machinery stands down on mobile
    expect(toolbar).toContain("if (!open || isMobile) return;");
    // the wrapper must not bring the page root's scroll geometry into the sheet
    expect(css).toContain(".aglist.agl-inpop { height: auto; overflow: visible; }");
  });
});

describe("touch affordances", () => {
  it("the avatar's change-photo veil is always visible below md (hover-only on desktop)", () => {
    const mobile = css.match(/MOBILE \(Mobile Pass 1[\s\S]*$/)?.[0] ?? "";
    expect(mobile, "the mobile block must exist").not.toBe("");
    expect(mobile).toContain(".aglist .agl-ehead .agl-av .cam { opacity: 1");
  });
});
