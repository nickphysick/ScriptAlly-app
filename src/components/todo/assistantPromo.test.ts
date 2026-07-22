/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Pro COLLEAGUE banner (polish P3, todo-pro-banner.html — superseding the v4 letterhead)
 * + the "Meet the assistant" preview modal (unchanged). Source/rule-text locks (jsdom mounts
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

describe("polish P3 — the Pro COLLEAGUE banner", () => {
  it("is the stack's third sibling — BELOW the sheet, non-Pro only, with live-derived numbers", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain("hkCount={tiles.housekeeping}");
    expect(page).toContain("totalCount={shownY}");
    const banner = page.indexOf("<ProBanner");
    expect(banner).toBeGreaterThan(page.indexOf('className="tdb-mainc"'));
    expect(banner).toBeGreaterThan(page.indexOf("renderLedger()")); // after the sheet's views
    expect(promo).toContain("<b>{hkCount} of your {totalCount} tasks</b>");
  });
  it("anatomy per the ref: 60px nameplate glyph + spark, kicker, Playfair title, copy, the quiet quote", () => {
    expect(promo).toContain('<span className="tdb-proav" aria-hidden>✎<span className="tdb-prospark">✦</span></span>');
    expect(promo).toContain(">YOUR SCRIPTALLY PRO ASSISTANT</div>");
    expect(promo).toContain("<h3>Hand over the housekeeping</h3>");
    expect(promo).toContain("researched from agency sites and filled for you");
    expect(promo).toContain("“Leave the admin to me — go and write.”");
    const av = rule(".tdb-proav");
    expect(av).toContain("width: 60px");
    expect(av).toContain("linear-gradient(150deg, #7d99b4, #557393)");
    expect(rule(".tdb-pro")).toContain("border: 1px solid #c8d4de");
    expect(rule(".tdb-protx h3")).toContain("font-size: 24px");
  });
  it("Pro keeps its slate identity: the CTA is press-law EXEMPT (no ink press shadow, no .tdb-cta)", () => {
    expect(promo).toContain('className="tdb-progoP" onClick={onPreview}>Meet the assistant →</button>');
    expect(promo).not.toMatch(/tdb-cta[^g]/); // no press class anywhere in the promo file
    const go = rule(".tdb-progoP");
    expect(go).toContain("background: #6A89A7");
    expect(go).not.toContain("2px 2px 0");
  });
  it("CTAs: primary opens the modal; ghost What's-in-Pro routes to the upgrade surface", () => {
    expect(promo).toContain(">What’s in Pro</button>");
    expect(page).toContain("onPreview={() => setAssistantOpen(true)}");
    expect(page).toContain('onWhatsInPro={() => onNavigate("plans")}');
  });
  it("the letterhead is EXTINCT (banner + demo mini-ledger + its pending row)", () => {
    for (const f of [promo, page, css]) {
      expect(f).not.toContain("tdb-letter");
    }
    expect(css).not.toContain(".tdb-drow.pending");
    expect(promo).not.toContain("See what it does");
    expect(promo).not.toContain("BY THE ASSISTANT");
  });
  it("the hours clause is OMITTED (no cheap derivation — never fabricated)", () => {
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
