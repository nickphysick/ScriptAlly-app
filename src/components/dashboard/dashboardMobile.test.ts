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

describe("the <md dashboard stack", () => {
  it("the mobile block exists and the new surfaces hide at md+", () => {
    expect(css).toContain(MEDIA);
    const before = css.split(MEDIA)[0];
    expect(before).toContain(".sa-mdeskline,\n.sa-mtodo { display: none; }");
  });

  it("desktop furniture stands down below md: the action row, fortnight strip", () => {
    /* ⚠️ RETARGETED (settled desk, Phase 1). This asserted `.sa-chip` and `.sa-greet-ctas`; the
       attention chip is RETIRED with the focus slot it opened, and the CTA row is `.sa-hero-actions`
       now. The rule the case protects is unchanged — the desktop action surfaces stand down below
       md, where the floating tab capsule carries them. */
    expect(css).toContain(MEDIA);
    const mobile = css.split(MEDIA)[1] ?? "";
    expect(mobile).toContain(".sa-hero-actions { display: none; }");
    /* ⚠️ ABSENCE IS ASSERTED AGAINST RULES, NOT PROSE — comments stripped first. The first draft
       of this line failed on the CSS comment that RECORDS the retirement: the guard caught its own
       tombstone. Third time this trap has been hit in this repo; the pattern is the fix. */
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules, "the chip retired with the focus slot").not.toContain(".sa-chip");
    expect(mobile).toContain("section.dc { display: none; }"); // WhatsLive's root is a div.dc — untouched
    expect(mobile).toContain(".wl-cf { grid-template-columns: 1fr !important");
  });

  it("THE DESK LINE: hot is a tinted card with the burgundy roundel; calm is a hairline row", () => {
    const mobile = css.split(MEDIA)[1] ?? "";
    expect(mobile, "the mobile block must exist").not.toBe("");
    const hot = mobile.match(/\.sa-mdeskline\.hot \{([^}]*)\}/s)?.[1] ?? "";
    expect(hot, "the hot rule must exist").not.toBe("");
    expect(hot).toContain("#faf0ea");
    expect(hot).toContain("var(--pink-b)");
    const calm = mobile.match(/\.sa-mdeskline\.calm \{([^}]*)\}/s)?.[1] ?? "";
    expect(calm, "the calm rule must exist").not.toBe("");
    expect(calm).toContain("border-top");
    expect(calm).not.toContain("background"); // no fill — never the loud one greyed out
    expect(mobile).toContain("background: var(--burg)"); // the count roundel
  });

  it("the dashboard renders the desk line + doorway off the board's own tallies", () => {
    expect(dash).toContain("sidebarBoardTiles({");
    expect(dash).toContain("deskNotice(mobileTiles)");
    expect(dash).toContain("sa-mdeskline ${mobileNotice.tone}");
    // both surfaces are doorways to /todo (baked decision 2 — To-do has no tab)
    expect(dash).toContain('onClick={() => onNavigate("todo")}');
    for (const lane of ['"Urgent", mobileTiles.urgent', '"Housekeeping", mobileTiles.housekeeping', '"Notes to self", mobileTiles.notes']) {
      expect(dash).toContain(lane);
    }
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
