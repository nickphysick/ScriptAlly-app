/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE COLOPHON (detail P4, todo-detail-a/b — superseding the colleague banner) + the
 * "Meet the assistant" preview modal (unchanged). Source/rule-text locks (jsdom mounts
 * nothing): gating, derived numbers, CTA wiring, the press-law exemption, the canned theatre's
 * honesty guarantees (no writes, no price), the docked TODO for the real free-run mechanic.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const promo = readFileSync(join(here, "AssistantPromo.tsx"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("detail P4 — THE COLOPHON (the colleague banner is retired)", () => {
  it("sits at the stack's foot on the BARE ground — no card chrome; the spark breaks the rule", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain("hkCount={tiles.housekeeping}");
    expect(page).toContain("totalCount={shownY}");
    const banner = page.indexOf("<ProBanner");
    expect(banner).toBeGreaterThan(page.indexOf('className="tdb-mainc"'));
    const colo = css.match(/\.tdb-colo \{([^}]*)\}/)?.[1] ?? "";
    expect(colo).toContain("text-align: center");
    expect(colo).toContain("border-top: 1px solid var(--line)");
    expect(colo).not.toContain("background"); // bare ground — no card
    expect(colo).not.toContain("box-shadow");
    const spark = css.match(/\.tdb-colospark \{([^}]*)\}/)?.[1] ?? "";
    expect(spark).toContain("top: -11px");
    expect(spark).toContain("background: var(--oat)"); // the ground shows through the break
    expect(promo).toContain('<span className="tdb-colospark" aria-hidden>✦</span>');
  });
  it("anatomy + the VERBATIM wording with live-derived counts (bold pair slate, lining figures)", () => {
    expect(promo).toContain(">SCRIPTALLY PRO</div>");
    expect(promo).toContain("<h4>Hand over the housekeeping</h4>");
    expect(promo).toContain("The assistant carries out your agent research for you.");
    expect(promo).toContain("<b>{hkCount} of your current {totalCount} tasks</b> could be handled in the background");
    expect(promo).toContain("whilst you write.");
    expect(css).toContain(".tdb-colo p b { color: #3d5872; }");
    expect(css.match(/\.tdb-colo p \{([^}]*)\}/)?.[1] ?? "").toContain("font-variant-numeric: lining-nums");
  });
  it("the links: Meet the assistant → opens the preview modal; What's in Pro routes; gating unchanged", () => {
    expect(promo).toContain('className="tdb-cololink" onClick={onPreview}>Meet the assistant →</button>');
    expect(promo).toContain('className="tdb-cololink g" onClick={onWhatsInPro}>What’s in Pro</button>');
    expect(page).toContain("onPreview={() => setAssistantOpen(true)}");
    expect(page).toContain('onWhatsInPro={() => onNavigate("plans")}');
    const link = css.match(/\.tdb-cololink \{([^}]*)\}/)?.[1] ?? "";
    expect(link).toContain("color: #557393");
    expect(link).toContain("border-bottom: 1px solid #b9cad9");
  });
  it("the colleague banner is EXTINCT; the marker stands at the modal's data source", () => {
    // bounded: FocusFlow's .tdb-propill (the slate Pro pill) is a live namesake — the ban
    // covers the colleague's own family only
    for (const f of [promo, page, css]) {
      expect(f).not.toMatch(/tdb-pro(?!pill)/);
    }
    expect(promo).not.toContain("Leave the admin to me");
    expect(page).toContain('// TODO(pro-assistant): replace canned theatre with real single-task free run ("Try one free")');
  });
  it("the hours clause stays OMITTED (never fabricated)", () => {
    expect(promo).not.toMatch(/hours?/i);
  });
});

describe("v4 P5 — the Meet-the-assistant preview modal (stands unchanged)", () => {
  it("letterhead-framed dialog over the scrim; kicker + honesty sub-line; Esc + Not now + ✕ close", () => {
    expect(promo).toContain('role="dialog" aria-modal="true" aria-label="Meet the assistant"');
    expect(promo).toContain(">SCRIPTALLY PRO · A PREVIEW USING YOUR ACTUAL TASKS</div>");
    expect(promo).toContain("Nothing is saved");
    expect(promo).toContain('if (e.key === "Escape") { e.stopPropagation(); onClose(); }');
    expect(promo).toContain(">Not now</button>");
    expect(css).toContain('.tdb-amodal::before { content: ""; position: absolute; inset: 8px; border: 1px solid rgba(106, 137, 167, 0.35);');
  });
  it("the theatre: scripted sequence over real names, a spinning slate ring, timing chips, the found card (animation = in-browser check)", () => {
    expect(promo).toContain("const [doneN, setDoneN] = useState(1);");
    expect(promo).toContain("window.setTimeout(() => setDoneN((n) => n + 1), 1700);");
    expect(promo).toContain('const CANNED_TIMES = ["41S", "28S", "36S", "52S"];');
    expect(promo).toContain(">WATCHING THE ASSISTANT WORK — ");
    expect(promo).toContain("READING AGENCY SITE…");
    expect(promo).toContain(">WHAT IT JUST FOUND</b>");
    expect(css).toContain(".tdb-dtick.spin");
    expect(css).toContain("@keyframes tdbSpin");
    expect(page).toContain("const assistantRows: AssistantTaskRow[] = hkGroups.flatMap((g) =>");
  });
  it("reduced motion jumps to the held frame; the run holds one short so a working row stays on stage", () => {
    expect(promo).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;');
    expect(promo).toContain("const cap = Math.max(1, theatre.length - 1);");
  });
  it("the upgrade routes to /plans; NO price string anywhere; the footer reads Part of ScriptAlly Pro", () => {
    expect(page).toContain('onUpgrade={() => { setAssistantOpen(false); onNavigate("plans"); }}');
    expect(promo).toContain(">Part of ScriptAlly Pro</span>");
    expect(promo).toContain(">Upgrade &amp; set it working →</button>");
    expect(promo).not.toMatch(/£|\$\d|per month|\/mo|a month|annually/i); // no price FIGURE (the word 'price' appears only in the honesty comment)
  });
  it("a PREVIEW only: no write primitives reachable from this path; the free-run TODO is docked at the data source", () => {
    for (const w of ["upsertTaskFlag", "updateAgent", "updateUserTask", "updateUserProfile", "dismissTask", "resolveTaskFlag"]) {
      expect(promo).not.toContain(w);
    }
    expect(page).toContain('// TODO(pro-assistant): replace canned theatre with real single-task free run ("Try one free")');
  });
});
