/**
 * Queries hub mobile locks (Mobile Pass 1, Phase 4; ref design-refs/mobile-concept-v1.html
 * frames 02–04). Source/CSS locks in the house idiom — layout is a phone check (run report).
 *
 * The invariants: list → pushed detail below md with BOTH panes mounted (scroll survives),
 * the espresso command bar carries the hero's contextual primary (soft-pink, per the button
 * law), the top control bar's actions re-home, and the guided response flow presents in the
 * sheet chassis.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const hub = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "../components/shell/f12.css"), "utf8");
const rrs = readFileSync(resolve(__dirname, "../components/RecordResponseScreen.tsx"), "utf8");

const MEDIA = "@media (max-width: 767.98px)";

describe("the list → detail push", () => {
  it("a row click selects AND pushes; back is a presentation switch, not a deselection", () => {
    expect(hub).toContain("const pickRow = (id: string) => {");
    expect(hub).toContain('setMobileView("detail")');
    expect(hub).toContain("closeCreate(() => pickRow(q.id)) : pickRow(q.id)");
    expect(hub).toContain('setMobileDetail("queries", {');
    expect(hub).toContain('kind: "back"');
    expect(hub).toContain('else setMobileView("list")');
  });

  it("BOTH panes stay mounted and translate — never display:none — so scroll survives", () => {
    expect(css).toContain(MEDIA);
    const mobile = css.split(".qh-mcmd { display: none; }")[1] ?? "";
    expect(mobile, "the hub mobile section must exist").not.toBe("");
    expect(mobile).toContain(".qh-mv-list .f12-body .f12-detail { transform: translateX(102%); }");
    expect(mobile).toContain(".qh-mv-detail .f12-body .f12-list { transform: translateX(-24%); }");
    // the pusher hides by transform inside overflow:hidden, not by unmounting or display
    expect(mobile).not.toContain(".f12-list { display: none");
    expect(mobile).not.toContain(".f12-detail { display: none");
    // reduced motion stills the push
    expect(css).toContain(".f12-root .f12-body .f12-pane { transition: none; }");
  });

  it("the empty state opts out of the pusher and stacks", () => {
    expect(hub).toContain('className="f12-body f12-body-empty"');
    expect(css).toContain(".f12-root .f12-body.f12-body-empty { position: static;");
  });
});

describe("the espresso command bar (concept frame 03)", () => {
  it("espresso container, soft-pink primary inside — the container is not a CTA", () => {
    const bar = css.match(/\n {2}\.qh-mcmd \{([^}]*)\}/s)?.[1] ?? "";
    expect(bar, "the <md .qh-mcmd rule must exist").not.toBe("");
    expect(bar).toContain("background: var(--ink)");
    expect(bar).toContain("position: fixed");
    expect(bar).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain(".qh-mcmd .f12-btn-pri { flex: 1; justify-content: center; }");
  });

  it("the primary is the hero's OWN contextual CTA, and carries the Mark-sent anchor below md", () => {
    // one derivation — the bar reuses getPrimaryAction exactly as the hero does
    expect(hub).toContain('const label = closed ? "Reopen"');
    expect(hub).toContain("ref={isMark ? markSentTriggerRef : undefined}");
    /* ⚠️ REPOINTED (§1): the desktop primary left the hero band for the pane's control cell, and
       the derivation was renamed with it (`heroIsMark` → `verbIsMark`) — same `getPrimaryAction`
       call, computed where it is rendered. The anchor rule is unchanged: exactly ONE live
       markSentTriggerRef per breakpoint, because the cell is `display: none` below md. */
    expect(hub).toContain("ref={verbIsMark && !isMobile ? markSentTriggerRef : undefined}");
    /* and the popover opens UPWARD from the foot-pinned bar.
       ⚠️ THE CLAIM IS "UP BELOW MD", NOT THE WHOLE OPTIONS OBJECT. This asserted the literal
       `isMobile ? { placement: "up" } : undefined`, so §1 adding `constrain: true` — which changes
       nothing about the direction this test is named for — turned it red. A lock that pins more
       than its own claim goes red for edits that leave the claim true. */
    expect(hub).toMatch(/isMobile \? \{ placement: "up"/);
    /* ⚠️ THE RULE HIDING THE HERO'S PRIMARY IS GONE, and it was already hiding a button that had
       left two packs earlier. `.f12-hero` itself went with the pairing merge (§1) — the mobile
       command bar's own primary is what this case is really about, asserted below. */
    expect(css, "a rule survives for an element nothing renders").not.toContain(".f12-root .f12-hero");
  });

  it("the ⋯ sheet re-homes the bar's actions with the same handlers", () => {
    expect(hub).toContain('ariaLabel="More query actions"');
    expect(hub).toContain("updateQueryStatus(activeQuery.id, reason)");
    expect(hub).toContain("handleDownloadPDF()");
    expect(hub).toContain("askDeleteQuery()");
    expect(hub).toContain("setIsNudgeOpen(true)");
  });
});

describe("create mode below md", () => {
  /* ⚠️ AMENDED (create-mode v2 P3): the in-flow create BAR is retired for the illustrated
     header, which lives in the pane's own flow rather than the .f12-ctl seat — so it needs no
     counter-rule to survive the toolbar's mobile hide. What this test protects is unchanged and
     is the reason it existed: below md the actions and the error line must stay reachable. */
  it("is a detail screen with the header's actions and error line surviving", () => {
    expect(hub).toContain("if (creating) setMobileView(\"detail\");");
    expect(css).toContain(".f12-root .f12-ctl { display: none; }");
    expect(css, "the header must wrap rather than truncate on a phone").toContain(".f12-root .qch { flex-wrap: wrap;");
    expect(css, "the error slot must come back below md").toContain(".f12-root .qch-sub { display: block; }");
    expect(css, "the actions must get their own line rather than squeeze").toContain(".f12-root .qch-acts { margin-left: 0; flex-basis: 100%; }");
    // back from a draft runs the dirty-guarded closeCreate, never a silent drop
    expect(hub).toContain("closeCreateRef.current(() => setMobileView(\"list\"))");
  });
});

describe("touch + chassis rules", () => {
  it("the note actions are always visible below md (hover-only was tap-unreachable)", () => {
    expect(css).toContain(".f12-root .qn-acts { opacity: 1; }");
  });

  it("the guided response flow presents in the sheet chassis below md — flow untouched", () => {
    expect(rrs).toContain("useIsMobile()");
    expect(rrs).toContain("<MobileSheet open onClose={onClose}");
    expect(rrs).toContain("<EmailOverlay onClose={onClose} maxWidth={560}>");
    // one body, two chassis — the flow renders identical content in both
    expect(rrs).toContain("const body = (");
  });
});
