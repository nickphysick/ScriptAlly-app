/**
 * Dashboard mobile reflow locks (Mobile Pass 1, Phase 2; ref design-refs/mobile-concept-v1.html
 * frame 01). Source/CSS locks in the house idiom — layout is a phone check (run report).
 *
 * The reflow re-homes existing panels only; the two NEW surfaces (desk line, To-do doorway) are
 * <md-gated in CSS and read the To-do board's own tallies via the sidebar recipe.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "./dashboardV37.css"), "utf8");
const dash = readFileSync(resolve(__dirname, "../Dashboard.tsx"), "utf8");
const drawer = readFileSync(resolve(__dirname, "./TimelineDrawer.tsx"), "utf8");

// Anchor before slicing (the string-spec slice law).
const MEDIA = "@media (max-width: 767.98px)";

/* ⚠️ REWRITTEN BY DASHBOARD ON THE PHONE v1 (28 Oct). This suite pinned the v37 phone stack's rules — the desk line's
   hot and calm treatments, the action row and fortnight strip standing down, the pipeline's stacked pair. Below 768px the
   dashboard is `DashPhone` now, so those rules have no consumer and are deleted; the cases below pin THAT, in both
   directions: the old stack cannot come back beside the new page, and the page that renders on a phone is the new one.
   Retirements are listed in tests/e2e/RETIRED-dashboard-mobile-v1.md. */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const dash58Css = readFileSync(resolve(__dirname, "./v58/dash58.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("below 768px the dashboard is the phone page", () => {
  it("Dashboard renders DashPhone when useIsMobile says so, and Dash58 otherwise", () => {
    expect(dash).toContain('import { useIsMobile } from "./shell/mobileChrome"');
    expect(dash).toContain("const phone = useIsMobile();");
    const branch = dash.indexOf("{phone ? (");
    expect(branch, "the phone branch must exist").toBeGreaterThan(-1);
    expect(dash.indexOf("<DashPhone", branch)).toBeGreaterThan(branch);
    expect(dash.indexOf("<Dash58", branch)).toBeGreaterThan(dash.indexOf("<DashPhone", branch));
  });

  it("the v37 phone stack's rules are retired, not left inert", () => {
    /* the phone block itself — anchored before slicing, and the desktop rules above it are not this lock's business */
    expect(rules).toContain(MEDIA);
    const phone = rules.split(MEDIA)[1]?.split(/\n\}/)[0] ?? "";
    expect(phone, "the phone block must exist").toContain(".sa-tlmobile");
    for (const sel of [".sa-dashroot", ".sa-mdeskline", ".sa-mtodo", ".sa-hero-actions", ".sa-stats", ".sa-dash-panels", "section.dc", ".wl-cf", ".sa-herozone"]) {
      expect(phone, `${sel} has no consumer on a phone`).not.toContain(sel);
    }
    /* and the md+ hide for the two retired surfaces goes with them */
    expect(rules).not.toContain(".sa-mdeskline");
    expect(rules).not.toContain(".sa-mtodo");
  });

  it("Dash58's phone gutter and header-button wrap are retired; the feed drawer's width stays", () => {
    expect(dash58Css).not.toContain("--d58-gutter: 14px");
    expect(dash58Css).not.toMatch(/\.d58-btns \{ margin-left: 0; flex-wrap: wrap; \}/);
    expect(dash58Css).toContain(".d58-drawer { width: 100vw; }");
  });

  it("the desk line and the mobile to-do doorway are retired from the dashboard", () => {
    expect(dash).not.toContain("sa-mdeskline");
    expect(dash).not.toMatch(/["\s`]sa-mtodo["\s`]/);
  });
});

/* ⚠️ THESE READ THE FILE, AND THE FILE IS NO LONGER MOUNTED (settled desk, Phase 6). The drawer —
   both its desktop and its <md variant — is unmounted at every width; the story is the inline
   StoryCard now. They are kept, retargeted in intent: they pin the SHAPE of a component still on
   disk whose pin helpers focusSlot.test.ts imports, so a future re-mount finds it intact. They no
   longer say anything about what the dashboard renders, and this comment is here so nobody reads
   them as if they did. */
describe("the timeline drawer's shape, retained on disk but unmounted", () => {
  it("the mobile variant is in-flow with the drawer's own head/body classes", () => {
    expect(drawer).toContain("useIsMobile()");
    expect(drawer).toContain('className="sa-tlmobile"');
    expect(drawer).toContain('className="sa-tlbody"');
    // no pull tab and no pin in the mobile variant — the section carries neither
    const mobileReturn = drawer.split('className="sa-tlmobile"')[1]?.split("return (")[0] ?? "";
    expect(mobileReturn, "the mobile return must exist").not.toBe("");
    expect(mobileReturn).not.toContain("sa-tltab");
    expect(mobileReturn).not.toContain("sa-tlpin");
  });

  it("the desktop drawer path survives untouched (tab, pin, capsule-gap inset)", () => {
    expect(drawer).toContain('className="sa-tltab"');
    expect(drawer).toContain("sa-tlpin");
    // ⚠️ refinement §1: the tab is anchored INSIDE the card now, where right:0 IS the card edge.
    expect(css).toContain(".sa-tltab { right: 0; }"); // the locked inset
  });
});
