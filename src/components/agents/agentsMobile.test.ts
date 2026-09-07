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
import { stripComments } from "../../lib/styleWiring";

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

/**
 * ⚠️ REWRITTEN, AND THE MECHANISM THESE GUARDED IS GONE (Phase 4). Below md the card used to
 * render the SAME editor element full-screen IN FLOW, replacing the list, with Done and Cancel
 * borrowed from the shell bar through `MobileDetailSpec` and the list's scrollTop saved and put
 * back by hand because hiding a scroller clamps it. All four of those are retired: the drawer is
 * the one editor host at every width, and it goes full-bleed below md through `SlideOver`'s own
 * opt-in prop.
 *
 * The LAW that survives is baked decision 6 itself — no 3D flip below md — and it is asserted
 * below over the peek, which is what the card's back face shows now. The rest is asserted as
 * ABSENCE, because a retired mechanism that is still reachable is the fault this repo records
 * most often: a replacement that is ADDED leaves the original alive, and only one that is SWAPPED
 * retires it.
 */
describe("baked decision 6 — no 3D flip below md, and now no second editor host either", () => {
  it("the card does not turn over on mobile, and mounts no back face there", () => {
    expect(list).toContain("peeked={!isMobile && peekId === agent.id}");
    expect(list).toContain("back={!isMobile && peekId === agent.id ? peekFace(agent) : null}");
  });

  /* ⚠️ ASSERTED AS ABSENCE IN BOTH ARTEFACTS. The component's mount going is not the same as the
     mechanism going: a stylesheet still carrying `.agl-mpush` would keep a dead layout alive for
     the next person who found the class and wondered what rendered it. */
  it("the in-flow push is GONE — no host, no class, no stylesheet rule", () => {
    const decl = stripComments(list);
    for (const dead of ["agl-mpush", "mobilePushOpen", "listScrollMemo", "pushAgent"]) {
      expect(decl, `${dead} survived the push's retirement`).not.toContain(dead);
    }
    expect(stripComments(css), "the push's stylesheet rules outlived the push").not.toContain("agl-mpush");
  });

  /* the seam itself is untouched — it still serves the query detail; only THIS page's editor
     registration is gone, and the page still clears its own slot on unmount */
  it("the shell's editor registration is withdrawn, and the seam survives for its other callers", () => {
    const decl = stripComments(list);
    expect(decl, "this page still registers an editor with the shell bar").not.toContain('kind: "editor"');
    expect(decl, "the page stopped clearing its shell slot, so a stale bar can outlive the page").toContain('setMobileDetail("agents", null)');
  });

  it("the drawer is the one editor host, and it takes the full width below md", () => {
    expect(list, "the drawer is not mounted").toContain("<AgentDrawer");
    const drawer = readFileSync(new URL("./AgentDrawer.tsx", import.meta.url), "utf8");
    expect(drawer, "the drawer stopped asking for full bleed, so mobile keeps a 6% sliver of scrim").toContain("fullBleedBelowMd");
    const slo = readFileSync(new URL("../shared/slideOver.css", import.meta.url), "utf8");
    expect(slo, "the full-bleed rule is gone from the shared drawer").toMatch(/\.slo--bleed \{[^}]*100vw/);
  });

  it("the rotor keeps its locked flip physics — untouched by the pass", () => {
    /* the flipped HEIGHT went with the editor (Phase 4) — the rotor has one height now; the
       physics being asserted is the rotation and the mobile block leaving the rotor alone */
    expect(css).toContain(".aglist .agl-rotor.flipped { transform: rotateY(180deg); }");
    // and the mobile block never styles the rotor (any overflow would flatten the 3D context)
    const push = css.match(/MOBILE \(Mobile Pass 1[\s\S]*$/)?.[0] ?? "";
    expect(push, "the mobile block must exist").not.toBe("");
    expect(push).not.toContain("agl-rotor");
  });
});

/* ⚠️ THE LAW SURVIVES A REBUILT TOOLBAR (Phase 6): below md the SAME children present in the
   sheet, one set of options in two chassis. What changed is who draws the desktop half — the
   Query Centre's shared popover rather than this page's private one — so the assertion moved
   from a private wrapper's markup to the chooser that picks between them. */
describe("toolbar popovers present in the sheet below md", () => {
  it("the same children render in MobileSheet, wrapped for the .aglist scope", () => {
    expect(toolbar).toContain("<MobileSheet");
    expect(toolbar).toContain('<div className="aglist agl-inpop">{children}{foot}</div>');
    expect(toolbar, "the sheet builds its own option list, so the two chassis can offer different filters")
      .not.toMatch(/isMobile \?[\s\S]{0,200}FACETS\.map/);
  });
});

describe("touch affordances", () => {
  it("the avatar's change-photo veil is always visible below md (hover-only on desktop)", () => {
    const mobile = css.match(/MOBILE \(Mobile Pass 1[\s\S]*$/)?.[0] ?? "";
    expect(mobile, "the mobile block must exist").not.toBe("");
    expect(mobile).toContain(".aglist .agl-ehead .agl-av .cam { opacity: 1");
  });
});
